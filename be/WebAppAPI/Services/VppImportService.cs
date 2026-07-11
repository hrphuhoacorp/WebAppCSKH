using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models.Vpp;

public interface IVppImportService
{
    Task<PagedResult<VppImportDto>> GetAllAsync(
        int? month,
        int? year,
        int page = 1,
        int pageSize = 20
    );
    Task<VppImportDetailDto?> GetByIdAsync(int id);
    Task<VppImportDetailDto> CreateAsync(VppImportCreateDto dto, string createdBy);
    Task DeleteAsync(int id);
}

public class VppImportService : IVppImportService
{
    private readonly IVppImportRepository _repo;
    private readonly IVppImportLineRepository _lineRepo;
    private readonly IVppItemRepository _itemRepo;
    private readonly IVppItemLotRepository _lotRepo;
    private readonly IUnitOfWork _uow;

    public VppImportService(
        IVppImportRepository repo,
        IVppImportLineRepository lineRepo,
        IVppItemRepository itemRepo,
        IVppItemLotRepository lotRepo,
        IUnitOfWork uow
    )
    {
        _repo = repo;
        _lineRepo = lineRepo;
        _itemRepo = itemRepo;
        _lotRepo = lotRepo;
        _uow = uow;
    }

    public async Task<PagedResult<VppImportDto>> GetAllAsync(
        int? month,
        int? year,
        int page = 1,
        int pageSize = 20
    )
    {
        var query = _repo.GetAll().AsNoTracking().Where(x => x.DeletedAt == null);
        if (month.HasValue)
            query = query.Where(x => x.PeriodMonth == month.Value);
        if (year.HasValue)
            query = query.Where(x => x.PeriodYear == year.Value);

        var total = await query.CountAsync();
        var list = await query
            .OrderByDescending(x => x.ImportDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var ids = list.Select(x => x.Id).ToList();
        var lineCounts = await _lineRepo
            .GetAll()
            .AsNoTracking()
            .Where(l => ids.Contains(l.ImportId))
            .GroupBy(l => l.ImportId)
            .Select(g => new
            {
                ImportId = g.Key,
                Total = g.Sum(l => l.TotalAmount),
                Count = g.Count(),
            })
            .ToListAsync();

        return new PagedResult<VppImportDto>
        {
            TotalItems = total,
            Page = page,
            PageSize = pageSize,
            Items = list.Select(e =>
                {
                    var lc = lineCounts.FirstOrDefault(x => x.ImportId == e.Id);
                    return new VppImportDto
                    {
                        Id = e.Id,
                        ImportDate = e.ImportDate.AddHours(7).ToString("yyyy-MM-dd"),
                        PeriodMonth = e.PeriodMonth,
                        PeriodYear = e.PeriodYear,
                        Note = e.Note ?? "",
                        CreatedBy = e.CreatedBy ?? "",
                        TotalAmount = lc?.Total ?? 0,
                        ItemCount = lc?.Count ?? 0,
                        CreatedAt = e.CreatedAt?.AddHours(7).ToString("yyyy-MM-dd"),
                    };
                })
                .ToList(),
        };
    }

    public async Task<VppImportDetailDto?> GetByIdAsync(int id)
    {
        var e = await _repo
            .GetAll()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);
        if (e == null)
            return null;

        var lines = await _lineRepo
            .GetAll()
            .AsNoTracking()
            .Where(l => l.ImportId == id)
            .ToListAsync();
        var itemIds = lines.Select(l => l.ItemId).ToList();
        var items = await _itemRepo
            .GetAll()
            .AsNoTracking()
            .Where(x => itemIds.Contains(x.Id))
            .ToListAsync();

        return new VppImportDetailDto
        {
            Id = e.Id,
            ImportDate = e.ImportDate.AddHours(7).ToString("yyyy-MM-dd"),
            PeriodMonth = e.PeriodMonth,
            PeriodYear = e.PeriodYear,
            Note = e.Note ?? "",
            CreatedBy = e.CreatedBy ?? "",
            TotalAmount = lines.Sum(l => l.TotalAmount),
            CreatedAt = e.CreatedAt?.AddHours(7).ToString("yyyy-MM-dd"),
            Lines = lines
                .Select(l =>
                {
                    var item = items.FirstOrDefault(i => i.Id == l.ItemId);
                    return new VppImportLineDto
                    {
                        Id = l.Id,
                        ItemId = l.ItemId,
                        ItemCode = item?.Code ?? "",
                        ItemName = item?.Name ?? "",
                        Unit = item?.Unit ?? "",
                        Quantity = l.Quantity,
                        UnitPrice = l.UnitPrice,
                        VatAmount = l.VatAmount,
                        TotalAmount = l.TotalAmount,
                        Attachments = ParseAttachments(l.Attachments),
                    };
                })
                .ToList(),
        };
    }

    public async Task<VppImportDetailDto> CreateAsync(VppImportCreateDto dto, string createdBy)
    {
        var itemIds = dto.Lines.Select(l => l.ItemId).ToList();
        var items = await _itemRepo
            .GetAll()
            .AsNoTracking()
            .Where(x => itemIds.Contains(x.Id))
            .ToListAsync();

        var entity = new VppImport
        {
            ImportDate = dto.ImportDate,
            PeriodMonth = dto.ImportDate.Month,
            PeriodYear = dto.ImportDate.Year,
            Note = dto.Note,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
        };
        await _repo.AddAsync(entity);
        await _uow.SaveChangesAsync();

        foreach (var line in dto.Lines)
        {
            var item =
                items.FirstOrDefault(i => i.Id == line.ItemId)
                ?? throw new BadRequestException($"Không tìm thấy vật tư ID {line.ItemId}");
            var price = line.UnitPrice > 0 ? line.UnitPrice : item.UnitPrice;
            var vatAmount = price * item.VatRate * line.Quantity;

            var lot = await FindOrCreateLotAsync(line.ItemId, price, entity.PeriodMonth, entity.PeriodYear, line.Quantity);

            await _lineRepo.AddAsync(
                new VppImportLine
                {
                    ImportId = entity.Id,
                    ItemId = line.ItemId,
                    Quantity = line.Quantity,
                    UnitPrice = price,
                    VatAmount = vatAmount,
                    TotalAmount = price * line.Quantity + vatAmount,
                    Attachments = line.Attachments is { Count: > 0 }
                        ? JsonSerializer.Serialize(line.Attachments)
                        : null,
                    LotId = lot.Id,
                }
            );
        }
        await _uow.SaveChangesAsync();
        return (await GetByIdAsync(entity.Id))!;
    }

    public async Task DeleteAsync(int id)
    {
        var entity =
            await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy phiếu nhập");
        if (entity.DeletedAt != null)
            throw new NotFoundException("Không tìm thấy phiếu nhập");

        // Hoàn lại số lượng về lô hàng
        var lines = await _lineRepo.GetAll()
            .Where(l => l.ImportId == id && l.LotId != null)
            .ToListAsync();

        foreach (var line in lines)
        {
            var lot = await _lotRepo.GetByIdAsync(line.LotId!.Value);
            if (lot == null) continue;

            lot.InitialQty -= line.Quantity;
            lot.RemainingQty -= line.Quantity;

            if (lot.InitialQty <= 0)
            {
                // Lô này chỉ do phiếu nhập này tạo ra — xóa hẳn
                await _lotRepo.DeleteAsync(lot);
            }
            else
            {
                if (lot.RemainingQty < 0) lot.RemainingQty = 0;
                if (lot.Status == "depleted" && lot.RemainingQty > 0)
                    lot.Status = "active";
                lot.UpdatedAt = DateTime.UtcNow.AddHours(7);
            }
        }

        entity.DeletedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();
    }

    private async Task<VppItemLot> FindOrCreateLotAsync(int itemId, decimal unitPrice, int periodMonth, int periodYear, decimal qty)
    {
        // Same item + same price → cộng vào lô hiện có (bất kể kỳ, lấy lô active đầu tiên khớp giá)
        var existing = await _lotRepo.GetAll()
            .FirstOrDefaultAsync(l => l.ItemId == itemId && l.UnitPrice == unitPrice && l.Status == "active");

        if (existing != null)
        {
            existing.InitialQty += qty;
            existing.RemainingQty += qty;
            existing.UpdatedAt = DateTime.UtcNow.AddHours(7);
            return existing;
        }

        // Khác giá → tạo lô mới, lot_number = MAX hiện tại + 1
        var maxLotNumber = await _lotRepo.GetAll()
            .Where(l => l.ItemId == itemId)
            .Select(l => (int?)l.LotNumber)
            .MaxAsync() ?? 0;

        var newLot = new VppItemLot
        {
            ItemId = itemId,
            LotNumber = maxLotNumber + 1,
            PeriodMonth = periodMonth,
            PeriodYear = periodYear,
            UnitPrice = unitPrice,
            InitialQty = qty,
            RemainingQty = qty,
            Status = "active",
            CreatedAt = DateTime.UtcNow,
        };
        await _lotRepo.AddAsync(newLot);
        await _uow.SaveChangesAsync();
        return newLot;
    }

    private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNameCaseInsensitive = true };

    private static List<VppAttachmentSaveDto> ParseAttachments(string? json)
    {
        if (string.IsNullOrEmpty(json) || !json.TrimStart().StartsWith('['))
            return [];
        try { return JsonSerializer.Deserialize<List<VppAttachmentSaveDto>>(json, _jsonOpts) ?? []; }
        catch { return []; }
    }
}

public class VppImportDto
{
    public int Id { get; set; }
    public string ImportDate { get; set; } = "";
    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }
    public string Note { get; set; } = "";
    public string CreatedBy { get; set; } = "";
    public decimal TotalAmount { get; set; }
    public int ItemCount { get; set; }
    public string? CreatedAt { get; set; }
}

public class VppImportDetailDto : VppImportDto
{
    public List<VppImportLineDto> Lines { get; set; } = new();
}

public class VppImportLineDto
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public string ItemCode { get; set; } = "";
    public string ItemName { get; set; } = "";
    public string Unit { get; set; } = "";
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public List<VppAttachmentSaveDto> Attachments { get; set; } = new();
}

public class VppImportCreateDto
{
    public DateTime ImportDate { get; set; }
    public string? Note { get; set; }
    public List<VppImportLineCreateDto> Lines { get; set; } = new();
}

public class VppImportLineCreateDto
{
    public int ItemId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public List<VppAttachmentSaveDto>? Attachments { get; set; }
}

public class VppAttachmentSaveDto
{
    public string Url { get; set; } = "";
    public string Name { get; set; } = "";
}
