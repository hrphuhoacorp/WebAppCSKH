using Microsoft.EntityFrameworkCore;

public interface IVppInventoryService
{
    Task<VppInventorySummaryDto> GetByPeriodAsync(int month, int year);
}

public class VppInventoryService : IVppInventoryService
{
    private readonly IVppItemRepository _itemRepo;
    private readonly IVppImportLineRepository _importLineRepo;
    private readonly IVppImportRepository _importRepo;
    private readonly IVppDispatchLineRepository _dispatchLineRepo;
    private readonly IVppDispatchRepository _dispatchRepo;
    private readonly IVppStockCountLineRepository _countLineRepo;
    private readonly IVppStockCountRepository _countRepo;

    public VppInventoryService(
        IVppItemRepository itemRepo,
        IVppImportLineRepository importLineRepo,
        IVppImportRepository importRepo,
        IVppDispatchLineRepository dispatchLineRepo,
        IVppDispatchRepository dispatchRepo,
        IVppStockCountLineRepository countLineRepo,
        IVppStockCountRepository countRepo)
    {
        _itemRepo = itemRepo;
        _importLineRepo = importLineRepo;
        _importRepo = importRepo;
        _dispatchLineRepo = dispatchLineRepo;
        _dispatchRepo = dispatchRepo;
        _countLineRepo = countLineRepo;
        _countRepo = countRepo;
    }

    public async Task<VppInventorySummaryDto> GetByPeriodAsync(int month, int year)
    {
        var items = await _itemRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .OrderBy(x => x.Code)
            .ToListAsync();

        // Imports trong kỳ
        var importIds = await _importRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null && x.PeriodMonth == month && x.PeriodYear == year)
            .Select(x => x.Id).ToListAsync();
        var importLines = await _importLineRepo.GetAll().AsNoTracking()
            .Where(x => importIds.Contains(x.ImportId))
            .ToListAsync();

        // Dispatches trong kỳ
        var dispatchIds = await _dispatchRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null
                && x.DispatchDate.Month == month && x.DispatchDate.Year == year)
            .Select(x => x.Id).ToListAsync();
        var dispatchLines = await _dispatchLineRepo.GetAll().AsNoTracking()
            .Where(x => dispatchIds.Contains(x.DispatchId))
            .ToListAsync();

        // Điều chỉnh từ phiếu kiểm kho đã confirm trong kỳ
        var countIds = await _countRepo.GetAll().AsNoTracking()
            .Where(x => x.Status == "confirmed"
                && x.PeriodMonth == month && x.PeriodYear == year)
            .Select(x => x.Id).ToListAsync();
        var countLines = await _countLineRepo.GetAll().AsNoTracking()
            .Where(x => countIds.Contains(x.StockCountId))
            .ToListAsync();

        // Tính tồn đầu kỳ = cuối kỳ tháng trước
        var prevMonth = month == 1 ? 12 : month - 1;
        var prevYear = month == 1 ? year - 1 : year;
        var openingMap = await ComputeClosingAsync(prevMonth, prevYear);

        var rows = items.Select(item =>
        {
            var opening = openingMap.TryGetValue(item.Id, out var o) ? o : 0m;
            var imported = importLines.Where(l => l.ItemId == item.Id).Sum(l => l.Quantity);
            var dispatched = dispatchLines.Where(l => l.ItemId == item.Id).Sum(l => l.Quantity);
            var adjusted = countLines.Where(l => l.ItemId == item.Id).Sum(l => l.Difference);
            var closing = opening + imported - dispatched + adjusted;
            var status = closing <= 0 ? "out_of_stock" : closing < item.MinStock ? "low" : "normal";

            return new VppInventoryRowDto
            {
                ItemId = item.Id,
                Code = item.Code,
                Group = item.Group,
                Name = item.Name,
                Unit = item.Unit,
                UnitPrice = item.UnitPrice,
                MinStock = item.MinStock,
                MaxStock = item.MaxStock,
                OpeningQty = opening,
                ImportedQty = imported,
                DispatchedQty = dispatched,
                AdjustedQty = adjusted,
                ClosingQty = closing,
                TotalValue = closing * item.UnitPrice,
                StockStatus = status,
            };
        }).ToList();

        return new VppInventorySummaryDto
        {
            Month = month,
            Year = year,
            Rows = rows,
            TotalValue = rows.Sum(r => r.TotalValue),
            OutOfStockCount = rows.Count(r => r.StockStatus == "out_of_stock"),
            LowStockCount = rows.Count(r => r.StockStatus == "low"),
        };
    }

    private async Task<Dictionary<int, decimal>> ComputeClosingAsync(int month, int year)
    {
        // Tính đệ quy: nếu không có data gì thì trả về 0 cho tất cả
        // Tồn = Σ điều chỉnh kiểm kho confirm từ đầu đến hết kỳ này + Σ nhập - Σ xuất
        var importIds = await _importRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null
                && (x.PeriodYear < year || (x.PeriodYear == year && x.PeriodMonth <= month)))
            .Select(x => x.Id).ToListAsync();
        var importLines = await _importLineRepo.GetAll().AsNoTracking()
            .Where(x => importIds.Contains(x.ImportId))
            .ToListAsync();

        var dispatchIds = await _dispatchRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null
                && (x.DispatchDate.Year < year || (x.DispatchDate.Year == year && x.DispatchDate.Month <= month)))
            .Select(x => x.Id).ToListAsync();
        var dispatchLines = await _dispatchLineRepo.GetAll().AsNoTracking()
            .Where(x => dispatchIds.Contains(x.DispatchId))
            .ToListAsync();

        var countIds = await _countRepo.GetAll().AsNoTracking()
            .Where(x => x.Status == "confirmed"
                && (x.PeriodYear < year || (x.PeriodYear == year && x.PeriodMonth <= month)))
            .Select(x => x.Id).ToListAsync();
        var countLines = await _countLineRepo.GetAll().AsNoTracking()
            .Where(x => countIds.Contains(x.StockCountId))
            .ToListAsync();

        var result = new Dictionary<int, decimal>();
        var allItemIds = importLines.Select(l => l.ItemId)
            .Concat(dispatchLines.Select(l => l.ItemId))
            .Concat(countLines.Select(l => l.ItemId))
            .Distinct();

        foreach (var id in allItemIds)
        {
            var imp = importLines.Where(l => l.ItemId == id).Sum(l => l.Quantity);
            var dis = dispatchLines.Where(l => l.ItemId == id).Sum(l => l.Quantity);
            var adj = countLines.Where(l => l.ItemId == id).Sum(l => l.Difference);
            result[id] = imp - dis + adj;
        }
        return result;
    }
}

public class VppInventorySummaryDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public List<VppInventoryRowDto> Rows { get; set; } = new();
    public decimal TotalValue { get; set; }
    public int OutOfStockCount { get; set; }
    public int LowStockCount { get; set; }
}

public class VppInventoryRowDto
{
    public int ItemId { get; set; }
    public string Code { get; set; } = "";
    public string Group { get; set; } = "";
    public string Name { get; set; } = "";
    public string Unit { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public int MinStock { get; set; }
    public int MaxStock { get; set; }
    public decimal OpeningQty { get; set; }
    public decimal ImportedQty { get; set; }
    public decimal DispatchedQty { get; set; }
    public decimal AdjustedQty { get; set; }
    public decimal ClosingQty { get; set; }
    public decimal TotalValue { get; set; }
    public string StockStatus { get; set; } = "normal";
}
