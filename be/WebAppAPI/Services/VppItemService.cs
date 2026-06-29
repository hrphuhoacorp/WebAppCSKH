using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models.Vpp;

public interface IVppItemService
{
    Task<PagedResult<VppItemDto>> GetAllAsync(
        string? group = null,
        string? search = null,
        int page = 1,
        int pageSize = 20
    );
    Task<VppItemDto?> GetByIdAsync(int id);
    Task<VppItemDto> CreateAsync(VppItemUpsertDto dto);
    Task<VppItemDto> UpdateAsync(int id, VppItemUpsertDto dto);
    Task DeleteAsync(int id);
    Task<VppItemDto> AppendUniformReturnAsync(int id, UniformReturnRecordDto dto);
    Task<VppItemDto> DeleteUniformReturnAsync(int id, int index);
    Task<VppItemDto> ToggleActiveAsync(int id);
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

    public async Task<PagedResult<VppItemDto>> GetAllAsync(
        string? group = null,
        string? search = null,
        int page = 1,
        int pageSize = 20
    )
    {
        var query = _repo.GetAll().AsNoTracking().Where(x => x.DeletedAt == null);
        if (!string.IsNullOrWhiteSpace(group))
            query = query.Where(x => x.Group == group);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var lower = search.ToLower();
            query = query.Where(x =>
                x.Name.ToLower().Contains(lower) || x.Code.ToLower().Contains(lower)
            );
        }
        var total = await query.CountAsync();
        var list = await query
            .OrderBy(x => x.Code)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return new PagedResult<VppItemDto>
        {
            TotalItems = total,
            Page = page,
            PageSize = pageSize,
            Items = list.Select(ToDto).ToList(),
        };
    }

    public async Task<VppItemDto?> GetByIdAsync(int id)
    {
        var e = await _repo
            .GetAll()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);
        return e == null ? null : ToDto(e);
    }

    public async Task<VppItemDto> CreateAsync(VppItemUpsertDto dto)
    {
        // Retry up to 5 times to handle concurrent code-generation race conditions
        for (int attempt = 0; attempt < 5; attempt++)
        {
            try
            {
                var code = await GenerateCodeAsync(dto.Group);
                var entity = new VppItem
                {
                    Code = code,
                    Group = dto.Group,
                    Name = dto.Name,
                    Unit = dto.Unit,
                    UnitPrice = dto.UnitPrice,
                    VatRate = 0.08m,
                    MinStock = dto.MinStock,
                    MaxStock = dto.MaxStock,
                    Note = dto.Note,
                };
                await _repo.AddAsync(entity);
                await _uow.SaveChangesAsync();
                return ToDto(entity);
            }
            catch (DbUpdateException) when (attempt < 4)
            {
                // Code collision — clear EF tracker so the failed entity doesn't block retry
                _uow.GetDbContext().ChangeTracker.Clear();
            }
        }
        throw new ConflictException("Không thể tạo mã vật tư sau nhiều lần thử");
    }

    public async Task<VppItemDto> UpdateAsync(int id, VppItemUpsertDto dto)
    {
        var entity =
            await _repo.GetByIdAsync(id) ?? throw new NotFoundException("Không tìm thấy vật tư");
        if (entity.DeletedAt != null)
            throw new NotFoundException("Không tìm thấy vật tư");

        entity.Name = dto.Name;
        entity.Unit = dto.Unit;
        entity.UnitPrice = dto.UnitPrice;
        entity.VatRate = 0.08m;
        entity.MinStock = dto.MinStock;
        entity.MaxStock = dto.MaxStock;
        entity.Note = dto.Note;
        entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task DeleteAsync(int id)
    {
        var entity =
            await _repo.GetByIdAsync(id) ?? throw new NotFoundException("Không tìm thấy vật tư");
        if (entity.DeletedAt != null)
            throw new NotFoundException("Không tìm thấy vật tư");
        entity.DeletedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();
    }

    public async Task<VppItemDto> AppendUniformReturnAsync(int id, UniformReturnRecordDto dto)
    {
        var entity = await _repo.GetByIdAsync(id) ?? throw new NotFoundException("Không tìm thấy vật tư");
        if (entity.DeletedAt != null) throw new NotFoundException("Không tìm thấy vật tư");

        var records = string.IsNullOrEmpty(entity.UniformReturnHistory)
            ? new List<UniformReturnRecord>()
            : System.Text.Json.JsonSerializer.Deserialize<List<UniformReturnRecord>>(entity.UniformReturnHistory)
              ?? new List<UniformReturnRecord>();

        records.Add(new UniformReturnRecord
        {
            Date = dto.Date,
            Quantity = dto.Quantity,
            ReturnedBy = dto.ReturnedBy,
            Note = dto.Note ?? "",
        });

        entity.UniformReturnHistory = System.Text.Json.JsonSerializer.Serialize(records);
        entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<VppItemDto> DeleteUniformReturnAsync(int id, int index)
    {
        var entity = await _repo.GetByIdAsync(id) ?? throw new NotFoundException("Không tìm thấy vật tư");
        if (entity.DeletedAt != null) throw new NotFoundException("Không tìm thấy vật tư");

        var records = string.IsNullOrEmpty(entity.UniformReturnHistory)
            ? new List<UniformReturnRecord>()
            : System.Text.Json.JsonSerializer.Deserialize<List<UniformReturnRecord>>(entity.UniformReturnHistory)
              ?? new List<UniformReturnRecord>();

        if (index < 0 || index >= records.Count)
            throw new NotFoundException("Không tìm thấy bản ghi hoàn trả");

        records.RemoveAt(index);
        entity.UniformReturnHistory = records.Count > 0
            ? System.Text.Json.JsonSerializer.Serialize(records)
            : null;
        entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<VppItemDto> ToggleActiveAsync(int id)
    {
        var entity = await _repo.GetByIdAsync(id) ?? throw new NotFoundException("Không tìm thấy vật tư");
        if (entity.DeletedAt != null) throw new NotFoundException("Không tìm thấy vật tư");
        entity.IsActive = !entity.IsActive;
        entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();
        return ToDto(entity);
    }

    private async Task<string> GenerateCodeAsync(string group)
    {
        var prefix = group.ToUpper();

        // Lấy số lớn nhất trong TẤT CẢ codes (kể cả đã xóa) để tránh trùng unique index
        var allCodes = await _repo
            .GetAll()
            .AsNoTracking()
            .Where(x => x.Code.StartsWith(prefix + "."))
            .Select(x => x.Code)
            .ToListAsync();

        int next = 1;
        if (allCodes.Count > 0)
        {
            var maxNum = allCodes
                .Select(code =>
                {
                    var parts = code.Split('.');
                    return parts.Length == 2 && int.TryParse(parts[1], out var n) ? n : 0;
                })
                .Max();
            next = maxNum + 1;
        }

        return $"{prefix}.{next:D4}";
    }

    private static VppItemDto ToDto(VppItem e) =>
        new()
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
            IsActive = e.IsActive,
            UniformReturnHistory = e.UniformReturnHistory,
            CreatedAt = e.CreatedAt?.AddHours(7).ToString("yyyy-MM-dd"),
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
    public bool IsActive { get; set; }
    public string? UniformReturnHistory { get; set; }
    public string? CreatedAt { get; set; }
}

public class VppItemUpsertDto
{
    public string Group { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Unit { get; set; } = null!;
    public decimal UnitPrice { get; set; }
    public int MinStock { get; set; }
    public int MaxStock { get; set; }
    public string? Note { get; set; }
}

public class UniformReturnRecord
{
    [System.Text.Json.Serialization.JsonPropertyName("date")]
    public string Date { get; set; } = "";
    [System.Text.Json.Serialization.JsonPropertyName("quantity")]
    public int Quantity { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("returnedBy")]
    public string ReturnedBy { get; set; } = "";
    [System.Text.Json.Serialization.JsonPropertyName("note")]
    public string Note { get; set; } = "";
}

public class UniformReturnRecordDto
{
    public string Date { get; set; } = null!;
    public int Quantity { get; set; }
    public string ReturnedBy { get; set; } = null!;
    public string? Note { get; set; }
}
