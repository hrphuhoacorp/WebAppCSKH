using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models.Vpp;

public interface IVppItemService
{
    Task<IEnumerable<VppItemDto>> GetAllAsync(string? group = null, string? search = null);
    Task<VppItemDto?> GetByIdAsync(int id);
    Task<VppItemDto> CreateAsync(VppItemUpsertDto dto);
    Task<VppItemDto> UpdateAsync(int id, VppItemUpsertDto dto);
    Task DeleteAsync(int id);
}

public class VppItemService : IVppItemService
{
    private readonly IVppItemRepository _repo;
    private readonly IUnitOfWork _uow;

    public VppItemService(IVppItemRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<IEnumerable<VppItemDto>> GetAllAsync(string? group = null, string? search = null)
    {
        var query = _repo.GetAll().AsNoTracking().Where(x => x.DeletedAt == null);
        if (!string.IsNullOrWhiteSpace(group))
            query = query.Where(x => x.Group == group);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(x => x.Name.Contains(search) || x.Code.Contains(search));
        var list = await query.OrderBy(x => x.Code).ToListAsync();
        return list.Select(ToDto);
    }

    public async Task<VppItemDto?> GetByIdAsync(int id)
    {
        var e = await _repo.GetAll().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);
        return e == null ? null : ToDto(e);
    }

    public async Task<VppItemDto> CreateAsync(VppItemUpsertDto dto)
    {
        var code = await GenerateCodeAsync(dto.Group);
        var entity = new VppItem
        {
            Code = code,
            Group = dto.Group,
            Name = dto.Name,
            Unit = dto.Unit,
            UnitPrice = dto.UnitPrice,
            VatRate = dto.VatRate,
            MinStock = dto.MinStock,
            MaxStock = dto.MaxStock,
            Note = dto.Note,
        };
        await _repo.AddAsync(entity);
        await _uow.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<VppItemDto> UpdateAsync(int id, VppItemUpsertDto dto)
    {
        var entity = await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy vật tư");
        if (entity.DeletedAt != null) throw new NotFoundException("Không tìm thấy vật tư");

        entity.Name = dto.Name;
        entity.Unit = dto.Unit;
        entity.UnitPrice = dto.UnitPrice;
        entity.VatRate = dto.VatRate;
        entity.MinStock = dto.MinStock;
        entity.MaxStock = dto.MaxStock;
        entity.Note = dto.Note;
        entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy vật tư");
        if (entity.DeletedAt != null) throw new NotFoundException("Không tìm thấy vật tư");
        entity.DeletedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();
    }

    private async Task<string> GenerateCodeAsync(string group)
    {
        var prefix = group.ToUpper();
        var last = await _repo.GetAll()
            .AsNoTracking()
            .Where(x => x.Code.StartsWith(prefix + "."))
            .OrderByDescending(x => x.Code)
            .Select(x => x.Code)
            .FirstOrDefaultAsync();

        int next = 1;
        if (last != null)
        {
            var parts = last.Split('.');
            if (parts.Length == 2 && int.TryParse(parts[1], out var num))
                next = num + 1;
        }
        return $"{prefix}.{next:D4}";
    }

    private static VppItemDto ToDto(VppItem e) => new()
    {
        Id = e.Id,
        Code = e.Code,
        Group = e.Group,
        Name = e.Name,
        Unit = e.Unit,
        UnitPrice = e.UnitPrice,
        VatRate = e.VatRate,
        MinStock = e.MinStock,
        MaxStock = e.MaxStock,
        Note = e.Note ?? "",
        CreatedAt = e.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
    };
}

public class VppItemDto
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public string Group { get; set; } = "";
    public string Name { get; set; } = "";
    public string Unit { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public decimal VatRate { get; set; }
    public int MinStock { get; set; }
    public int MaxStock { get; set; }
    public string Note { get; set; } = "";
    public string? CreatedAt { get; set; }
}

public class VppItemUpsertDto
{
    public string Group { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Unit { get; set; } = null!;
    public decimal UnitPrice { get; set; }
    public decimal VatRate { get; set; }
    public int MinStock { get; set; }
    public int MaxStock { get; set; }
    public string? Note { get; set; }
}
