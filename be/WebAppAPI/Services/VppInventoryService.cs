using Microsoft.EntityFrameworkCore;

public interface IVppInventoryService
{
    Task<VppInventorySummaryDto> GetByPeriodAsync(int? month, int year);
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
    private readonly IVppItemLotRepository _lotRepo;

    public VppInventoryService(
        IVppItemRepository itemRepo,
        IVppImportLineRepository importLineRepo,
        IVppImportRepository importRepo,
        IVppDispatchLineRepository dispatchLineRepo,
        IVppDispatchRepository dispatchRepo,
        IVppStockCountLineRepository countLineRepo,
        IVppStockCountRepository countRepo,
        IVppItemLotRepository lotRepo)
    {
        _itemRepo = itemRepo;
        _importLineRepo = importLineRepo;
        _importRepo = importRepo;
        _dispatchLineRepo = dispatchLineRepo;
        _dispatchRepo = dispatchRepo;
        _countLineRepo = countLineRepo;
        _countRepo = countRepo;
        _lotRepo = lotRepo;
    }

    public async Task<VppInventorySummaryDto> GetByPeriodAsync(int? month, int year)
    {
        var items = await _itemRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .OrderBy(x => x.Code)
            .ToListAsync();

        // Tồn đầu kỳ (chỉ cần qty)
        Dictionary<int, decimal> openingQty;
        if (month == null)
            openingQty = await ComputeClosingQtyAsync(12, year - 1);
        else
        {
            var prevMonth = month == 1 ? 12 : month.Value - 1;
            var prevYear = month == 1 ? year - 1 : year;
            openingQty = await ComputeClosingQtyAsync(prevMonth, prevYear);
        }

        // Nhập trong kỳ
        var importIds = await _importRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null && x.PeriodYear == year
                && (month == null || x.PeriodMonth == month))
            .Select(x => x.Id).ToListAsync();
        var importLines = await _importLineRepo.GetAll().AsNoTracking()
            .Where(x => importIds.Contains(x.ImportId))
            .ToListAsync();

        // Xuất trong kỳ
        var dispatchIds = await _dispatchRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null && x.DispatchDate.Year == year
                && (month == null || x.DispatchDate.Month == month))
            .Select(x => x.Id).ToListAsync();
        var dispatchLines = await _dispatchLineRepo.GetAll().AsNoTracking()
            .Where(x => dispatchIds.Contains(x.DispatchId))
            .ToListAsync();

        // Điều chỉnh kiểm kho confirm trong kỳ
        var countIds = await _countRepo.GetAll().AsNoTracking()
            .Where(x => x.Status == "confirmed" && x.PeriodYear == year
                && (month == null || x.PeriodMonth == month))
            .Select(x => x.Id).ToListAsync();
        var countLines = await _countLineRepo.GetAll().AsNoTracking()
            .Where(x => countIds.Contains(x.StockCountId))
            .ToListAsync();

        // Loads tất cả lots cho các items
        var itemIds = items.Select(x => x.Id).ToList();
        var allLots = await _lotRepo.GetAll().AsNoTracking()
            .Where(l => itemIds.Contains(l.ItemId))
            .OrderBy(l => l.LotNumber)
            .ToListAsync();

        var rows = items.Select(item =>
        {
            var openQty = openingQty.TryGetValue(item.Id, out var oq) ? oq : 0m;

            var periodImpQty = importLines.Where(l => l.ItemId == item.Id).Sum(l => l.Quantity);
            var dispatched = dispatchLines.Where(l => l.ItemId == item.Id).Sum(l => l.Quantity);
            var adjusted = countLines.Where(l => l.ItemId == item.Id).Sum(l => l.Difference);
            var closing = openQty + periodImpQty - dispatched + adjusted;

            // Giá hiển thị: lô active mới nhất (lot_number lớn nhất), fallback item.UnitPrice
            var itemLots = allLots.Where(l => l.ItemId == item.Id).ToList();
            var latestActiveLot = itemLots.Where(l => l.Status == "active").OrderByDescending(l => l.LotNumber).FirstOrDefault();
            var displayPrice = latestActiveLot?.UnitPrice ?? item.UnitPrice;

            var status = !item.IsActive ? "inactive"
                : closing <= 0 ? "out_of_stock"
                : closing < item.MinStock ? "low"
                : "normal";

            return new VppInventoryRowDto
            {
                ItemId = item.Id,
                Code = item.Code,
                Group = item.Group,
                Name = item.Name,
                Unit = item.Unit,
                UnitPrice = displayPrice,
                MinStock = item.MinStock,
                MaxStock = item.MaxStock,
                IsActive = item.IsActive,
                OpeningQty = openQty,
                ImportedQty = periodImpQty,
                DispatchedQty = dispatched,
                AdjustedQty = adjusted,
                ClosingQty = closing,
                TotalValue = closing > 0 ? closing * displayPrice : 0m,
                StockStatus = status,
                Lots = itemLots.Select(l => new VppLotBreakdownDto
                {
                    LotNumber = l.LotNumber,
                    UnitPrice = l.UnitPrice,
                    RemainingQty = l.RemainingQty,
                    Status = l.Status,
                }).ToList(),
            };
        }).ToList();

        return new VppInventorySummaryDto
        {
            Month = month ?? 0,
            Year = year,
            Rows = rows,
            TotalValue = rows.Sum(r => r.TotalValue),
            OutOfStockCount = rows.Count(r => r.StockStatus == "out_of_stock" && r.IsActive),
            LowStockCount = rows.Count(r => r.StockStatus == "low" && r.IsActive),
        };
    }

    // Tính closing qty từng kỳ lũy kế đến hết targetMonth/targetYear
    private async Task<Dictionary<int, decimal>> ComputeClosingQtyAsync(int targetMonth, int targetYear)
    {
        var targetKey = targetYear * 100 + targetMonth;

        var allImports = await _importRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null
                && (x.PeriodYear * 100 + x.PeriodMonth) <= targetKey)
            .Select(x => new { x.Id, PeriodKey = x.PeriodYear * 100 + x.PeriodMonth })
            .ToListAsync();

        var allImportIds = allImports.Select(x => x.Id).ToList();
        var allImportLines = await _importLineRepo.GetAll().AsNoTracking()
            .Where(x => allImportIds.Contains(x.ImportId))
            .ToListAsync();

        var allDispatches = await _dispatchRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null
                && (x.DispatchDate.Year * 100 + x.DispatchDate.Month) <= targetKey)
            .Select(x => new { x.Id, PeriodKey = x.DispatchDate.Year * 100 + x.DispatchDate.Month })
            .ToListAsync();

        var allDispatchIds = allDispatches.Select(x => x.Id).ToList();
        var allDispatchLines = await _dispatchLineRepo.GetAll().AsNoTracking()
            .Where(x => allDispatchIds.Contains(x.DispatchId))
            .ToListAsync();

        var allCounts = await _countRepo.GetAll().AsNoTracking()
            .Where(x => x.Status == "confirmed"
                && (x.PeriodYear * 100 + x.PeriodMonth) <= targetKey)
            .Select(x => new { x.Id, PeriodKey = x.PeriodYear * 100 + x.PeriodMonth })
            .ToListAsync();

        var allCountIds = allCounts.Select(x => x.Id).ToList();
        var allCountLines = await _countLineRepo.GetAll().AsNoTracking()
            .Where(x => allCountIds.Contains(x.StockCountId))
            .ToListAsync();

        // Group by itemId và sum toàn bộ
        var impByItem = allImportLines.GroupBy(l => l.ItemId)
            .ToDictionary(g => g.Key, g => g.Sum(l => l.Quantity));
        var dissByItem = allDispatchLines.GroupBy(l => l.ItemId)
            .ToDictionary(g => g.Key, g => g.Sum(l => l.Quantity));
        var adjByItem = allCountLines.GroupBy(l => l.ItemId)
            .ToDictionary(g => g.Key, g => g.Sum(l => l.Difference));

        var allItemIds = impByItem.Keys.Concat(dissByItem.Keys).Concat(adjByItem.Keys).Distinct();
        var result = new Dictionary<int, decimal>();
        foreach (var itemId in allItemIds)
        {
            var imp = impByItem.TryGetValue(itemId, out var i) ? i : 0m;
            var dis = dissByItem.TryGetValue(itemId, out var d) ? d : 0m;
            var adj = adjByItem.TryGetValue(itemId, out var a) ? a : 0m;
            result[itemId] = imp - dis + adj;
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
    public bool IsActive { get; set; } = true;
    public string StockStatus { get; set; } = "normal";
    public List<VppLotBreakdownDto> Lots { get; set; } = new();
}

public class VppLotBreakdownDto
{
    public int LotNumber { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal RemainingQty { get; set; }
    public string Status { get; set; } = "active";
}
