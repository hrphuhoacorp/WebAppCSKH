using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models.Recruitment;

public interface IRecruitmentSettingsService
{
    Task<RecruitmentSettingsDto?> GetSettingsAsync();
    Task<RecruitmentSettingsDto> UpsertSettingsAsync(RecruitmentSettingsUpsertDto dto);
    Task<Dictionary<string, List<CategoryItemDto>>> GetCategoriesAsync();
    Task<IEnumerable<MailTemplateDto>> GetMailTemplatesAsync();
    Task<MailTemplateDto> UpdateMailTemplateAsync(int id, MailTemplateUpsertDto dto);
    Task<CategoryItemDto> CreateCategoryAsync(CategoryUpsertDto dto);
    Task<CategoryItemDto> UpdateCategoryAsync(int id, CategoryUpsertDto dto);
    Task DeleteCategoryAsync(int id);
    Task<MailTemplateDto> CreateMailTemplateAsync(MailTemplateCreateDto dto);
}

public class RecruitmentSettingsService : IRecruitmentSettingsService
{
    private readonly IRecruitmentSettingsRepository _settingsRepo;
    private readonly IRecruitmentCategoryRepository _categoryRepo;
    private readonly IRecruitmentMailTemplateRepository _templateRepo;
    private readonly IUnitOfWork _unitOfWork;

    public RecruitmentSettingsService(
        IRecruitmentSettingsRepository settingsRepo,
        IRecruitmentCategoryRepository categoryRepo,
        IRecruitmentMailTemplateRepository templateRepo,
        IUnitOfWork unitOfWork
    )
    {
        _settingsRepo = settingsRepo;
        _categoryRepo = categoryRepo;
        _templateRepo = templateRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<RecruitmentSettingsDto?> GetSettingsAsync()
    {
        var entity = await _settingsRepo.GetAll().AsNoTracking().FirstOrDefaultAsync();
        return entity == null ? null : ToSettingsDto(entity);
    }

    public async Task<RecruitmentSettingsDto> UpsertSettingsAsync(RecruitmentSettingsUpsertDto dto)
    {
        var entity = await _settingsRepo.GetAll().FirstOrDefaultAsync();
        if (entity == null)
        {
            entity = new RecruitmentSettings
            {
                DefaultContact = dto.DefaultContact,
                DefaultPhone = dto.DefaultPhone,
                DefaultLocation = dto.DefaultLocation,
                Signature = dto.Signature,
            };
            await _settingsRepo.AddAsync(entity);
        }
        else
        {
            entity.DefaultContact = dto.DefaultContact;
            entity.DefaultPhone = dto.DefaultPhone;
            entity.DefaultLocation = dto.DefaultLocation;
            entity.Signature = dto.Signature;
            entity.UpdatedAt = DateTime.UtcNow;
        }
        await _unitOfWork.SaveChangesAsync();
        return ToSettingsDto(entity);
    }

    public async Task<Dictionary<string, List<CategoryItemDto>>> GetCategoriesAsync()
    {
        var cats = await _categoryRepo
            .GetAll()
            .AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .ToListAsync();
        return cats.GroupBy(c => c.Type)
            .ToDictionary(
                g => g.Key,
                g =>
                    g.Select(c => new CategoryItemDto
                        {
                            Id = c.Id,
                            Value = c.Value,
                            SortOrder = c.SortOrder,
                        })
                        .ToList()
            );
    }

    public async Task<IEnumerable<MailTemplateDto>> GetMailTemplatesAsync()
    {
        var templates = await _templateRepo.GetAll().AsNoTracking().ToListAsync();
        return templates.Select(ToTemplateDto);
    }

    public async Task<MailTemplateDto> UpdateMailTemplateAsync(int id, MailTemplateUpsertDto dto)
    {
        var entity =
            await _templateRepo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy template");
        entity.Subject = dto.Subject;
        entity.Content = dto.Content;
        entity.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        return ToTemplateDto(entity);
    }

    public async Task<CategoryItemDto> CreateCategoryAsync(CategoryUpsertDto dto)
    {
        var entity = new RecruitmentCategory
        {
            Type = dto.Type,
            Value = dto.Value,
            SortOrder = dto.SortOrder,
        };
        await _categoryRepo.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return new CategoryItemDto { Id = entity.Id, Value = entity.Value, SortOrder = entity.SortOrder };
    }

    public async Task<CategoryItemDto> UpdateCategoryAsync(int id, CategoryUpsertDto dto)
    {
        var entity = await _categoryRepo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy danh mục");
        entity.Value = dto.Value;
        entity.SortOrder = dto.SortOrder;
        await _unitOfWork.SaveChangesAsync();
        return new CategoryItemDto { Id = entity.Id, Value = entity.Value, SortOrder = entity.SortOrder };
    }

    public async Task DeleteCategoryAsync(int id)
    {
        var entity = await _categoryRepo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy danh mục");
        await _categoryRepo.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<MailTemplateDto> CreateMailTemplateAsync(MailTemplateCreateDto dto)
    {
        var entity = new RecruitmentMailTemplate
        {
            TemplateType = dto.TemplateType,
            Subject = dto.Subject,
            Content = dto.Content,
        };
        await _templateRepo.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return ToTemplateDto(entity);
    }

    private static RecruitmentSettingsDto ToSettingsDto(RecruitmentSettings s) =>
        new()
        {
            Id = s.Id,
            DefaultContact = s.DefaultContact ?? "",
            DefaultPhone = s.DefaultPhone ?? "",
            DefaultLocation = s.DefaultLocation ?? "",
            Signature = s.Signature ?? "",
            UpdatedAt = s.UpdatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
        };

    private static MailTemplateDto ToTemplateDto(RecruitmentMailTemplate t) =>
        new()
        {
            Id = t.Id,
            TemplateType = t.TemplateType,
            Subject = t.Subject,
            Content = t.Content,
            UpdatedAt = t.UpdatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
        };
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

public class RecruitmentSettingsDto
{
    public int Id { get; set; }
    public string DefaultContact { get; set; } = "";
    public string DefaultPhone { get; set; } = "";
    public string DefaultLocation { get; set; } = "";
    public string Signature { get; set; } = "";
    public string? UpdatedAt { get; set; }
}

public class RecruitmentSettingsUpsertDto
{
    public string? DefaultContact { get; set; }
    public string? DefaultPhone { get; set; }
    public string? DefaultLocation { get; set; }
    public string? Signature { get; set; }
}

public class CategoryItemDto
{
    public int Id { get; set; }
    public string Value { get; set; } = "";
    public int SortOrder { get; set; }
}

public class MailTemplateDto
{
    public int Id { get; set; }
    public string TemplateType { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Content { get; set; } = "";
    public string? UpdatedAt { get; set; }
}

public class MailTemplateUpsertDto
{
    public string Subject { get; set; } = null!;
    public string Content { get; set; } = null!;
}

public class CategoryUpsertDto
{
    public string Type { get; set; } = null!;
    public string Value { get; set; } = null!;
    public int SortOrder { get; set; }
}

public class MailTemplateCreateDto
{
    public string TemplateType { get; set; } = null!;
    public string Subject { get; set; } = null!;
    public string Content { get; set; } = null!;
}
