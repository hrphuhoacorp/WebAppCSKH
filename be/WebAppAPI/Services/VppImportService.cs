using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models.Vpp;

public interface IVppImportService
{
    Task<IEnumerable<VppImportDto>> GetAllAsync(int? month, int? year);
    Task<VppImportDetailDto?> GetByIdAsync(int id);
    Task<VppImportDetailDto> CreateAsync(VppImportCreateDto dto, string createdBy);
    Task DeleteAsync(int id);
}

public class VppImportService : IVppImportService
{
    private readonly IVppImportRepository _repo;
    private readonly IVppImportLineRepository _lineRepo;
    private readonly IVppItemRepository _itemRepo;
    private readonly IUnitOfWork _uow;

    public VppImportService(
        IVppImportRepository repo,
        IVppImportLineRepository lineRepo,
        IVppItemRepository itemRepo,
        IUnitOfWork uow)
    {
        _repo = repo;
        _lineRepo = lineRepo;
        _itemRepo = itemRepo;
        _uow = uow;
    }

    public async Task<IEnumerable<VppImportDto>> GetAllAsync(int? month, int? year)
    {
        var query = _repo.GetAll().AsNoTracking().Where(x => x.DeletedAt == null);
        if (month.HasValue) query = query.Where(x => x.PeriodMonth == month.Value);
        if (year.HasValue) query = query.Where(x => x.PeriodYear == year.Value);
        var list = await query.OrderByDescending(x => x.ImportDate).ToListAsync();

        var ids = list.Select(x => x.Id).ToList();
        var lineCounts = await _lineRepo.GetAll().AsNoTracking()
            .Where(l => ids.Contains(l.ImportId))
            .GroupBy(l => l.ImportId)
            .Select(g => new { ImportId = g.Key, Total = g.Sum(l => l.TotalAmount), Count = g.Count() })
            .ToListAsync();

        return list.Select(e =>
        {
            var lc = lineCounts.FirstOrDefault(x => x.ImportId == e.Id);
            return new VppImportDto
            {
                Id = e.Id,
                ImportDate = e.ImportDate.AddHours(7).ToString("dd/MM/yyyy"),
                PeriodMonth = e.PeriodMonth,
                PeriodYear = e.PeriodYear,
                Note = e.Note ?? "",
                CreatedBy = e.CreatedBy ?? "",
                TotalAmount = lc?.Total ?? 0,
                ItemCount = lc?.Count ?? 0,
                CreatedAt = e.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
            };
        });
    }

    public async Task<VppImportDetailDto?> GetByIdAsync(int id)
    {
        var e = await _repo.GetAll().AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);
        if (e == null) return null;

        var lines = await _lineRepo.GetAll().AsNoTracking()
            .Where(l => l.ImportId == id).ToListAsync();
        var itemIds = lines.Select(l => l.ItemId).ToList();
        var items = await _itemRepo.GetAll().AsNoTracking()
            .Where(x => itemIds.Contains(x.Id)).ToListAsync();

        return new VppImportDetailDto
        {
            Id = e.Id,
            ImportDate = e.ImportDate.AddHours(7).ToString("dd/MM/yyyy"),
            PeriodMonth = e.PeriodMonth,
            PeriodYear = e.PeriodYear,
            AttachmentInvoice = e.AttachmentInvoice ?? "",
            AttachmentApproval = e.AttachmentApproval ?? "",
            Note = e.Note ?? "",
            CreatedBy = e.CreatedBy ?? "",
            TotalAmount = lines.Sum(l => l.TotalAmount),
            CreatedAt = e.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
            Lines = lines.Select(l =>
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
                };
            }).ToList(),
        };
    }

    public async Task<VppImportDetailDto> CreateAsync(VppImportCreateDto dto, string createdBy)
    {
        var itemIds = dto.Lines.Select(l => l.ItemId).ToList();
        var items = await _itemRepo.GetAll().AsNoTracking()
            .Where(x => itemIds.Contains(x.Id)).ToListAsync();

        var entity = new VppImport
        {
            ImportDate = dto.ImportDate,
            PeriodMonth = dto.ImportDate.Month,
            PeriodYear = dto.ImportDate.Year,
            AttachmentInvoice = dto.AttachmentInvoice,
            AttachmentApproval = dto.AttachmentApproval,
            Note = dto.Note,
            CreatedBy = createdBy,
        };
        await _repo.AddAsync(entity);
        await _uow.SaveChangesAsync();

        foreach (var line in dto.Lines)
        {
            var item = items.FirstOrDefault(i => i.Id == line.ItemId)
                ?? throw new BadRequestException($"Không tìm thấy vật tư ID {line.ItemId}");
            var price = line.UnitPrice > 0 ? line.UnitPrice : item.UnitPrice;
            var vatAmount = price * item.VatRate * line.Quantity;
            await _lineRepo.AddAsync(new VppImportLine
            {
                ImportId = entity.Id,
                ItemId = line.ItemId,
                Quantity = line.Quantity,
                UnitPrice = price,
                VatAmount = vatAmount,
                TotalAmount = price * line.Quantity + vatAmount,
            });

            // Cập nhật giá nhập mới nhất lên vật tư
            if (line.UnitPrice > 0)
            {
                var itemEntity = await _itemRepo.GetByIdAsync(line.ItemId);
                if (itemEntity != null)
                {
                    itemEntity.UnitPrice = line.UnitPrice;
                    itemEntity.UpdatedAt = DateTime.UtcNow.AddHours(7);
                }
            }
        }
        await _uow.SaveChangesAsync();
        return (await GetByIdAsync(entity.Id))!;
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy phiếu nhập");
        if (entity.DeletedAt != null) throw new NotFoundException("Không tìm thấy phiếu nhập");
        entity.DeletedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();
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
    public string AttachmentInvoice { get; set; } = "";
    public string AttachmentApproval { get; set; } = "";
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
}

public class VppImportCreateDto
{
    public DateTime ImportDate { get; set; }
    public string? AttachmentInvoice { get; set; }
    public string? AttachmentApproval { get; set; }
    public string? Note { get; set; }
    public List<VppImportLineCreateDto> Lines { get; set; } = new();
}

public class VppImportLineCreateDto
{
    public int ItemId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
