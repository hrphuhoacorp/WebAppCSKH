using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models.Vpp;

public interface IVppStockCountService
{
    Task<PagedResult<VppStockCountDto>> GetAllAsync(int? month, int? year, int page = 1, int pageSize = 20);
    Task<VppStockCountDetailDto?> GetByIdAsync(int id);
    Task<VppStockCountDetailDto> CreateAsync(VppStockCountCreateDto dto, string createdBy);
    Task UpdateLineAsync(int id, int lineId, decimal actualQty, string? note);
    Task<VppStockCountDetailDto> ConfirmAsync(int id, string confirmedBy);
}

public class VppStockCountService : IVppStockCountService
{
    private readonly IVppStockCountRepository _repo;
    private readonly IVppStockCountLineRepository _lineRepo;
    private readonly IVppItemRepository _itemRepo;
    private readonly IVppInventoryService _inventoryService;
    private readonly IUnitOfWork _uow;

    public VppStockCountService(
        IVppStockCountRepository repo,
        IVppStockCountLineRepository lineRepo,
        IVppItemRepository itemRepo,
        IVppInventoryService inventoryService,
        IUnitOfWork uow
    )
    {
        _repo = repo;
        _lineRepo = lineRepo;
        _itemRepo = itemRepo;
        _inventoryService = inventoryService;
        _uow = uow;
    }

    public async Task<PagedResult<VppStockCountDto>> GetAllAsync(int? month, int? year, int page = 1, int pageSize = 20)
    {
        var query = _repo.GetAll().AsNoTracking();
        if (month.HasValue)
            query = query.Where(x => x.PeriodMonth == month.Value);
        if (year.HasValue)
            query = query.Where(x => x.PeriodYear == year.Value);
        var total = await query.CountAsync();
        var list = await query.OrderByDescending(x => x.CountDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return new PagedResult<VppStockCountDto>
        {
            TotalItems = total, Page = page, PageSize = pageSize,
            Items = list.Select(ToDto).ToList()
        };
    }

    public async Task<VppStockCountDetailDto?> GetByIdAsync(int id)
    {
        var e = await _repo.GetAll().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (e == null)
            return null;

        var lines = await _lineRepo
            .GetAll()
            .AsNoTracking()
            .Where(l => l.StockCountId == id)
            .ToListAsync();
        var itemIds = lines.Select(l => l.ItemId).ToList();
        var items = await _itemRepo
            .GetAll()
            .AsNoTracking()
            .Where(x => itemIds.Contains(x.Id))
            .ToListAsync();

        return new VppStockCountDetailDto
        {
            Id = e.Id,
            CountDate = e.CountDate.AddHours(7).ToString("yyyy-MM-dd"),
            PeriodMonth = e.PeriodMonth,
            PeriodYear = e.PeriodYear,
            Status = e.Status,
            Note = e.Note ?? "",
            CreatedBy = e.CreatedBy ?? "",
            ConfirmedAt = e.ConfirmedAt?.AddHours(7).ToString("yyyy-MM-dd"),
            CreatedAt = e.CreatedAt?.AddHours(7).ToString("yyyy-MM-dd"),
            Lines = lines
                .Select(l =>
                {
                    var item = items.FirstOrDefault(i => i.Id == l.ItemId);
                    return new VppStockCountLineDto
                    {
                        Id = l.Id,
                        ItemId = l.ItemId,
                        ItemCode = item?.Code ?? "",
                        ItemName = item?.Name ?? "",
                        Unit = item?.Unit ?? "",
                        SystemQty = l.SystemQty,
                        ActualQty = l.ActualQty,
                        Difference = l.Difference,
                        Note = l.Note ?? "",
                    };
                })
                .ToList(),
        };
    }

    public async Task<VppStockCountDetailDto> CreateAsync(
        VppStockCountCreateDto dto,
        string createdBy
    )
    {
        var inventory = await _inventoryService.GetByPeriodAsync(dto.PeriodMonth, dto.PeriodYear);

        var entity = new VppStockCount
        {
            CountDate = dto.CountDate,
            PeriodMonth = dto.PeriodMonth,
            PeriodYear = dto.PeriodYear,
            Status = "draft",
            Note = dto.Note,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
        };
        await _repo.AddAsync(entity);
        await _uow.SaveChangesAsync();

        foreach (var row in inventory.Rows)
        {
            await _lineRepo.AddAsync(
                new VppStockCountLine
                {
                    StockCountId = entity.Id,
                    ItemId = row.ItemId,
                    SystemQty = row.ClosingQty,
                    ActualQty = row.ClosingQty,
                    Difference = 0,
                }
            );
        }
        await _uow.SaveChangesAsync();
        return (await GetByIdAsync(entity.Id))!;
    }

    public async Task UpdateLineAsync(int id, int lineId, decimal actualQty, string? note)
    {
        var count =
            await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy phiếu kiểm kho");
        if (count.Status == "confirmed")
            throw new BadRequestException("Phiếu đã xác nhận, không thể chỉnh sửa");

        var line =
            await _lineRepo.GetByIdAsync(lineId)
            ?? throw new NotFoundException("Không tìm thấy dòng kiểm kho");
        if (line.StockCountId != id)
            throw new BadRequestException("Dòng không thuộc phiếu kiểm kho này");

        line.ActualQty = actualQty;
        line.Difference = actualQty - line.SystemQty;
        line.Note = note;
        await _uow.SaveChangesAsync();
    }

    public async Task<VppStockCountDetailDto> ConfirmAsync(int id, string confirmedBy)
    {
        var entity =
            await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy phiếu kiểm kho");
        if (entity.Status == "confirmed")
            throw new BadRequestException("Phiếu đã được xác nhận trước đó");

        entity.Status = "confirmed";
        entity.ConfirmedAt = DateTime.UtcNow.AddHours(7);
        entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();
        return (await GetByIdAsync(id))!;
    }

    private static VppStockCountDto ToDto(VppStockCount e) =>
        new()
        {
            Id = e.Id,
            CountDate = e.CountDate.AddHours(7).ToString("yyyy-MM-dd"),
            PeriodMonth = e.PeriodMonth,
            PeriodYear = e.PeriodYear,
            Status = e.Status,
            Note = e.Note ?? "",
            CreatedBy = e.CreatedBy ?? "",
            ConfirmedAt = e.ConfirmedAt?.AddHours(7).ToString("yyyy-MM-dd"),
            CreatedAt = e.CreatedAt?.AddHours(7).ToString("yyyy-MM-dd"),
        };
}

public class VppStockCountDto
{
    public int Id { get; set; }
    public string CountDate { get; set; } = "";
    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }
    public string Status { get; set; } = "";
    public string Note { get; set; } = "";
    public string CreatedBy { get; set; } = "";
    public string? ConfirmedAt { get; set; }
    public string? CreatedAt { get; set; }
}

public class VppStockCountDetailDto : VppStockCountDto
{
    public List<VppStockCountLineDto> Lines { get; set; } = new();
}

public class VppStockCountLineDto
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public string ItemCode { get; set; } = "";
    public string ItemName { get; set; } = "";
    public string Unit { get; set; } = "";
    public decimal SystemQty { get; set; }
    public decimal ActualQty { get; set; }
    public decimal Difference { get; set; }
    public string Note { get; set; } = "";
}

public class VppStockCountCreateDto
{
    public DateTime CountDate { get; set; }
    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }
    public string? Note { get; set; }
}
