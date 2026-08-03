using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models;

public interface IPromoTemplateLayoutService
{
    Task<List<PromoTemplateLayoutDTO>> GetAllAsync();
    Task<PromoTemplateLayoutDTO> UpsertAsync(string templateKind, PromoTemplateLayoutUpsertDTO dto);
    Task DeleteAsync(string templateKind);
}

public class PromoTemplateLayoutService : IPromoTemplateLayoutService
{
    private readonly IPromoTemplateLayoutRepository _repo;
    private readonly IUnitOfWork _unitOfWork;

    public PromoTemplateLayoutService(IPromoTemplateLayoutRepository repo, IUnitOfWork unitOfWork)
    {
        _repo = repo;
        _unitOfWork = unitOfWork;
    }

    public async Task<List<PromoTemplateLayoutDTO>> GetAllAsync()
    {
        var items = await _repo.GetAll().AsNoTracking().ToListAsync();
        return items.Select(ToDto).ToList();
    }

    public async Task<PromoTemplateLayoutDTO> UpsertAsync(string templateKind, PromoTemplateLayoutUpsertDTO dto)
    {
        var entity = await _repo.GetAll().FirstOrDefaultAsync(x => x.TemplateKind == templateKind);
        if (entity == null)
        {
            entity = new PromoTemplateLayout
            {
                TemplateKind = templateKind,
                DisplayName = dto.DisplayName,
                Badge = dto.Badge,
                FieldConfigJson = dto.FieldConfigJson,
                LayoutJson = dto.LayoutJson,
            };
            await _repo.AddAsync(entity);
        }
        else
        {
            entity.DisplayName = dto.DisplayName;
            entity.Badge = dto.Badge;
            entity.FieldConfigJson = dto.FieldConfigJson;
            entity.LayoutJson = dto.LayoutJson;
            entity.UpdatedAt = DateTime.UtcNow;
        }

        await _unitOfWork.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task DeleteAsync(string templateKind)
    {
        var entity = await _repo.GetAll().FirstOrDefaultAsync(x => x.TemplateKind == templateKind)
            ?? throw new KeyNotFoundException($"Loại bảng giá '{templateKind}' không tồn tại.");
        await _repo.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
    }

    private static PromoTemplateLayoutDTO ToDto(PromoTemplateLayout e) =>
        new()
        {
            TemplateKind = e.TemplateKind,
            DisplayName = e.DisplayName,
            Badge = e.Badge,
            FieldConfigJson = e.FieldConfigJson,
            LayoutJson = e.LayoutJson,
            UpdatedAt = e.UpdatedAt,
        };
}

public class PromoTemplateLayoutDTO
{
    public string TemplateKind { get; set; } = "";
    public string? DisplayName { get; set; }
    public string? Badge { get; set; }
    public string? FieldConfigJson { get; set; }
    public string LayoutJson { get; set; } = "";
    public DateTime? UpdatedAt { get; set; }
}

public class PromoTemplateLayoutUpsertDTO
{
    public string? DisplayName { get; set; }
    public string? Badge { get; set; }
    public string? FieldConfigJson { get; set; }
    public string LayoutJson { get; set; } = null!;
}
