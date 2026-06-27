using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models.Vpp;

public interface IVppDispatchService
{
    Task<PagedResult<VppDispatchDto>> GetAllAsync(int? month, int? year, string? department, int page = 1, int pageSize = 20);
    Task<VppDispatchDetailDto?> GetByIdAsync(int id);
    Task<VppDispatchDetailDto> CreateAsync(VppDispatchCreateDto dto, string createdBy);
    Task DeleteAsync(int id);
}

public class VppDispatchService : IVppDispatchService
{
    private readonly IVppDispatchRepository _repo;
    private readonly IVppDispatchLineRepository _lineRepo;
    private readonly IVppItemRepository _itemRepo;
    private readonly IUnitOfWork _uow;

    public VppDispatchService(
        IVppDispatchRepository repo,
        IVppDispatchLineRepository lineRepo,
        IVppItemRepository itemRepo,
        IUnitOfWork uow)
    {
        _repo = repo;
        _lineRepo = lineRepo;
        _itemRepo = itemRepo;
        _uow = uow;
    }

    public async Task<PagedResult<VppDispatchDto>> GetAllAsync(int? month, int? year, string? department, int page = 1, int pageSize = 20)
    {
        var query = _repo.GetAll().AsNoTracking().Where(x => x.DeletedAt == null);
        if (month.HasValue) query = query.Where(x => x.DispatchDate.Month == month.Value);
        if (year.HasValue) query = query.Where(x => x.DispatchDate.Year == year.Value);
        if (!string.IsNullOrWhiteSpace(department)) query = query.Where(x => x.Department == department);

        var total = await query.CountAsync();
        var list = await query.OrderByDescending(x => x.DispatchDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var ids = list.Select(x => x.Id).ToList();
        var totals = await _lineRepo.GetAll().AsNoTracking()
            .Where(l => ids.Contains(l.DispatchId))
            .GroupBy(l => l.DispatchId)
            .Select(g => new { DispatchId = g.Key, Total = g.Sum(l => l.TotalAmount), Count = g.Count() })
            .ToListAsync();

        return new PagedResult<VppDispatchDto>
        {
            TotalItems = total,
            Page = page,
            PageSize = pageSize,
            Items = list.Select(e =>
            {
                var t = totals.FirstOrDefault(x => x.DispatchId == e.Id);
                return new VppDispatchDto
                {
                    Id = e.Id,
                    Code = e.Code,
                    DispatchDate = e.DispatchDate.AddHours(7).ToString("dd/MM/yyyy"),
                    Department = e.Department ?? "",
                    Branch = e.Branch ?? "",
                    RequestId = e.RequestId,
                    Note = e.Note ?? "",
                    CreatedBy = e.CreatedBy ?? "",
                    TotalAmount = t?.Total ?? 0,
                    ItemCount = t?.Count ?? 0,
                    CreatedAt = e.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
                };
            }).ToList()
        };
    }

    public async Task<VppDispatchDetailDto?> GetByIdAsync(int id)
    {
        var e = await _repo.GetAll().AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);
        if (e == null) return null;

        var lines = await _lineRepo.GetAll().AsNoTracking()
            .Where(l => l.DispatchId == id).ToListAsync();
        var itemIds = lines.Select(l => l.ItemId).ToList();
        var items = await _itemRepo.GetAll().AsNoTracking()
            .Where(x => itemIds.Contains(x.Id)).ToListAsync();

        return new VppDispatchDetailDto
        {
            Id = e.Id,
            Code = e.Code,
            DispatchDate = e.DispatchDate.AddHours(7).ToString("dd/MM/yyyy"),
            Department = e.Department ?? "",
            Branch = e.Branch ?? "",
            RequestId = e.RequestId,
            AttachmentInvoice = e.AttachmentInvoice ?? "",
            AttachmentApproval = e.AttachmentApproval ?? "",
            Note = e.Note ?? "",
            CreatedBy = e.CreatedBy ?? "",
            TotalAmount = lines.Sum(l => l.TotalAmount),
            CreatedAt = e.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
            Lines = lines.Select(l =>
            {
                var item = items.FirstOrDefault(i => i.Id == l.ItemId);
                return new VppDispatchLineDto
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

    public async Task<VppDispatchDetailDto> CreateAsync(VppDispatchCreateDto dto, string createdBy)
    {
        var itemIds = dto.Lines.Select(l => l.ItemId).ToList();
        var items = await _itemRepo.GetAll().AsNoTracking()
            .Where(x => itemIds.Contains(x.Id)).ToListAsync();

        var code = await GenerateCodeAsync(dto.DispatchDate);
        var entity = new VppDispatch
        {
            Code = code,
            DispatchDate = dto.DispatchDate,
            Department = dto.Department,
            Branch = dto.Branch,
            RequestId = dto.RequestId,
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
            await _lineRepo.AddAsync(new VppDispatchLine
            {
                DispatchId = entity.Id,
                ItemId = line.ItemId,
                Quantity = line.Quantity,
                UnitPrice = price,
                VatAmount = vatAmount,
                TotalAmount = price * line.Quantity + vatAmount,
            });
        }
        await _uow.SaveChangesAsync();
        return (await GetByIdAsync(entity.Id))!;
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy phiếu xuất");
        if (entity.DeletedAt != null) throw new NotFoundException("Không tìm thấy phiếu xuất");
        entity.DeletedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();
    }

    private async Task<string> GenerateCodeAsync(DateTime date)
    {
        var prefix = $"BK{date.Month:D2}{date.Year}";
        var count = await _repo.GetAll().AsNoTracking()
            .CountAsync(x => x.Code.StartsWith(prefix));
        return $"{prefix}.{count + 1:D2}";
    }
}

public class VppDispatchDto
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public string DispatchDate { get; set; } = "";
    public string Department { get; set; } = "";
    public string Branch { get; set; } = "";
    public int? RequestId { get; set; }
    public string Note { get; set; } = "";
    public string CreatedBy { get; set; } = "";
    public decimal TotalAmount { get; set; }
    public int ItemCount { get; set; }
    public string? CreatedAt { get; set; }
}

public class VppDispatchDetailDto : VppDispatchDto
{
    public string AttachmentInvoice { get; set; } = "";
    public string AttachmentApproval { get; set; } = "";
    public List<VppDispatchLineDto> Lines { get; set; } = new();
}

public class VppDispatchLineDto
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

public class VppDispatchCreateDto
{
    public DateTime DispatchDate { get; set; }
    public string? Department { get; set; }
    public string? Branch { get; set; }
    public int? RequestId { get; set; }
    public string? AttachmentInvoice { get; set; }
    public string? AttachmentApproval { get; set; }
    public string? Note { get; set; }
    public List<VppDispatchLineCreateDto> Lines { get; set; } = new();
}

public class VppDispatchLineCreateDto
{
    public int ItemId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
