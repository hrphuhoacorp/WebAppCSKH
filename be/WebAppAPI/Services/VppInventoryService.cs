using Microsoft.EntityFrameworkCore;

public interface IVppInventoryService
{
    Task<VppInventorySummaryDto> GetByPeriodAsync(int month, int year);
    Task<Dictionary<int, decimal>> GetAvgPricesAsync(int month, int year, List<int> itemIds);
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

        var periodKey = year * 100 + month;

        // Tồn đầu kỳ = cuối kỳ tháng trước (dùng giá bình quân gia quyền di động)
        var prevMonth = month == 1 ? 12 : month - 1;
        var prevYear = month == 1 ? year - 1 : year;
        var openingState = await ComputeClosingValueAsync(prevMonth, prevYear);

        // Nhập trong kỳ
        var importIds = await _importRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null && x.PeriodMonth == month && x.PeriodYear == year)
            .Select(x => x.Id).ToListAsync();
        var importLines = await _importLineRepo.GetAll().AsNoTracking()
            .Where(x => importIds.Contains(x.ImportId))
            .ToListAsync();

        // Xuất trong kỳ
        var dispatchIds = await _dispatchRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null
                && x.DispatchDate.Month == month && x.DispatchDate.Year == year)
            .Select(x => x.Id).ToListAsync();
        var dispatchLines = await _dispatchLineRepo.GetAll().AsNoTracking()
            .Where(x => dispatchIds.Contains(x.DispatchId))
            .ToListAsync();

        // Điều chỉnh kiểm kho confirm trong kỳ
        var countIds = await _countRepo.GetAll().AsNoTracking()
            .Where(x => x.Status == "confirmed"
                && x.PeriodMonth == month && x.PeriodYear == year)
            .Select(x => x.Id).ToListAsync();
        var countLines = await _countLineRepo.GetAll().AsNoTracking()
            .Where(x => countIds.Contains(x.StockCountId))
            .ToListAsync();

        var rows = items.Select(item =>
        {
            var (openQty, openValue) = openingState.TryGetValue(item.Id, out var s) ? s : (0m, 0m);

            var periodImpQty = importLines.Where(l => l.ItemId == item.Id).Sum(l => l.Quantity);
            var periodImpValue = importLines.Where(l => l.ItemId == item.Id).Sum(l => l.Quantity * l.UnitPrice);
            var dispatched = dispatchLines.Where(l => l.ItemId == item.Id).Sum(l => l.Quantity);
            var adjusted = countLines.Where(l => l.ItemId == item.Id).Sum(l => l.Difference);

            var availQty = openQty + periodImpQty;
            var availValue = openValue + periodImpValue;
            decimal avgPrice;
            if (availQty > 0)
                avgPrice = availValue / availQty;
            else
                avgPrice = item.UnitPrice;

            var closing = availQty - dispatched + adjusted;
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
                UnitPrice = avgPrice,
                MinStock = item.MinStock,
                MaxStock = item.MaxStock,
                IsActive = item.IsActive,
                OpeningQty = openQty,
                ImportedQty = periodImpQty,
                DispatchedQty = dispatched,
                AdjustedQty = adjusted,
                ClosingQty = closing,
                TotalValue = closing > 0 ? closing * avgPrice : 0m,
                StockStatus = status,
            };
        }).ToList();

        return new VppInventorySummaryDto
        {
            Month = month,
            Year = year,
            Rows = rows,
            TotalValue = rows.Sum(r => r.TotalValue),
            OutOfStockCount = rows.Count(r => r.StockStatus == "out_of_stock" && r.IsActive),
            LowStockCount = rows.Count(r => r.StockStatus == "low" && r.IsActive),
        };
    }

    public async Task<Dictionary<int, decimal>> GetAvgPricesAsync(int month, int year, List<int> itemIds)
    {
        var prevMonth = month == 1 ? 12 : month - 1;
        var prevYear = month == 1 ? year - 1 : year;
        var openingState = await ComputeClosingValueAsync(prevMonth, prevYear);

        var importIds = await _importRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null && x.PeriodMonth == month && x.PeriodYear == year)
            .Select(x => x.Id).ToListAsync();
        var importLines = await _importLineRepo.GetAll().AsNoTracking()
            .Where(x => importIds.Contains(x.ImportId) && itemIds.Contains(x.ItemId))
            .ToListAsync();

        var result = new Dictionary<int, decimal>();
        foreach (var itemId in itemIds)
        {
            var (openQty, openValue) = openingState.TryGetValue(itemId, out var s) ? s : (0m, 0m);
            var impQty = importLines.Where(l => l.ItemId == itemId).Sum(l => l.Quantity);
            var impValue = importLines.Where(l => l.ItemId == itemId).Sum(l => l.Quantity * l.UnitPrice);
            var availQty = openQty + impQty;
            result[itemId] = availQty > 0 ? (openValue + impValue) / availQty : 0m;
        }
        return result;
    }

    // Giá bình quân gia quyền di động: tính từng kỳ từ đầu đến hết targetMonth/targetYear
    // Trả về Dictionary<itemId, (closingQty, closingValue)>
    private async Task<Dictionary<int, (decimal Qty, decimal Value)>> ComputeClosingValueAsync(int targetMonth, int targetYear)
    {
        var targetKey = targetYear * 100 + targetMonth;

        // Load tất cả nhập đến hết kỳ target
        var allImports = await _importRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null
                && (x.PeriodYear * 100 + x.PeriodMonth) <= targetKey)
            .Select(x => new { x.Id, PeriodKey = x.PeriodYear * 100 + x.PeriodMonth })
            .ToListAsync();

        var allImportIds = allImports.Select(x => x.Id).ToList();
        var allImportLines = await _importLineRepo.GetAll().AsNoTracking()
            .Where(x => allImportIds.Contains(x.ImportId))
            .ToListAsync();
        var importsByPeriod = allImports
            .Join(allImportLines, h => h.Id, l => l.ImportId, (h, l) => new { h.PeriodKey, l.ItemId, l.Quantity, l.UnitPrice })
            .GroupBy(x => x.PeriodKey)
            .ToDictionary(g => g.Key, g => g.ToList());

        // Load tất cả xuất đến hết kỳ target
        var allDispatches = await _dispatchRepo.GetAll().AsNoTracking()
            .Where(x => x.DeletedAt == null
                && (x.DispatchDate.Year * 100 + x.DispatchDate.Month) <= targetKey)
            .Select(x => new { x.Id, PeriodKey = x.DispatchDate.Year * 100 + x.DispatchDate.Month })
            .ToListAsync();

        var allDispatchIds = allDispatches.Select(x => x.Id).ToList();
        var allDispatchLines = await _dispatchLineRepo.GetAll().AsNoTracking()
            .Where(x => allDispatchIds.Contains(x.DispatchId))
            .ToListAsync();
        var dispatchesByPeriod = allDispatches
            .Join(allDispatchLines, h => h.Id, l => l.DispatchId, (h, l) => new { h.PeriodKey, l.ItemId, l.Quantity })
            .GroupBy(x => x.PeriodKey)
            .ToDictionary(g => g.Key, g => g.ToList());

        // Load tất cả kiểm kho confirm đến hết kỳ target
        var allCounts = await _countRepo.GetAll().AsNoTracking()
            .Where(x => x.Status == "confirmed"
                && (x.PeriodYear * 100 + x.PeriodMonth) <= targetKey)
            .Select(x => new { x.Id, PeriodKey = x.PeriodYear * 100 + x.PeriodMonth })
            .ToListAsync();

        var allCountIds = allCounts.Select(x => x.Id).ToList();
        var allCountLines = await _countLineRepo.GetAll().AsNoTracking()
            .Where(x => allCountIds.Contains(x.StockCountId))
            .ToListAsync();
        var countsByPeriod = allCounts
            .Join(allCountLines, h => h.Id, l => l.StockCountId, (h, l) => new { h.PeriodKey, l.ItemId, l.Difference })
            .GroupBy(x => x.PeriodKey)
            .ToDictionary(g => g.Key, g => g.ToList());

        // Thu thập tất cả kỳ có dữ liệu, sort tăng dần
        var allPeriodKeys = importsByPeriod.Keys
            .Concat(dispatchesByPeriod.Keys)
            .Concat(countsByPeriod.Keys)
            .Distinct()
            .OrderBy(k => k)
            .ToList();

        // Giá bình quân gia quyền di động: lặp từng kỳ
        var state = new Dictionary<int, (decimal Qty, decimal Value)>();

        foreach (var pk in allPeriodKeys)
        {
            // Gom tất cả itemId có giao dịch trong kỳ này
            var itemIds = new HashSet<int>();
            if (importsByPeriod.TryGetValue(pk, out var impRows))
                foreach (var r in impRows) itemIds.Add(r.ItemId);
            if (dispatchesByPeriod.TryGetValue(pk, out var disRows))
                foreach (var r in disRows) itemIds.Add(r.ItemId);
            if (countsByPeriod.TryGetValue(pk, out var cntRows))
                foreach (var r in cntRows) itemIds.Add(r.ItemId);

            foreach (var itemId in itemIds)
            {
                var (openQty, openValue) = state.TryGetValue(itemId, out var prev) ? prev : (0m, 0m);

                var impQty = impRows?.Where(r => r.ItemId == itemId).Sum(r => r.Quantity) ?? 0m;
                var impValue = impRows?.Where(r => r.ItemId == itemId).Sum(r => r.Quantity * r.UnitPrice) ?? 0m;
                var disQty = disRows?.Where(r => r.ItemId == itemId).Sum(r => r.Quantity) ?? 0m;
                var adjQty = cntRows?.Where(r => r.ItemId == itemId).Sum(r => r.Difference) ?? 0m;

                var availQty = openQty + impQty;
                var availValue = openValue + impValue;
                var avgPrice = availQty > 0 ? availValue / availQty : 0m;

                var closingQty = availQty - disQty + adjQty;
                var closingValue = closingQty > 0 ? closingQty * avgPrice : 0m;

                state[itemId] = (closingQty, closingValue);
            }
        }

        return state;
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
}
