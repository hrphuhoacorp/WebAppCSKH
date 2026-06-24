using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models.Recruitment;

public interface IRecruitmentCampaignService
{
    Task<IEnumerable<RecruitmentCampaignDto>> GetAllAsync(bool includeDeleted = false);
    Task<RecruitmentCampaignDto?> GetByIdAsync(int id);
    Task<RecruitmentCampaignDto> CreateAsync(CampaignUpsertDto dto);
    Task<RecruitmentCampaignDto> UpdateAsync(int id, CampaignUpsertDto dto);
    Task DeleteAsync(int id);
}

public class RecruitmentCampaignService : IRecruitmentCampaignService
{
    private readonly IRecruitmentCampaignRepository _repo;
    private readonly IUnitOfWork _unitOfWork;

    public RecruitmentCampaignService(IRecruitmentCampaignRepository repo, IUnitOfWork unitOfWork)
    {
        _repo = repo;
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<RecruitmentCampaignDto>> GetAllAsync(bool includeDeleted = false)
    {
        var query = _repo.GetAll().AsNoTracking();
        if (!includeDeleted)
            query = query.Where(c => c.DeletedAt == null);
        var list = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return list.Select(ToDto);
    }

    public async Task<RecruitmentCampaignDto?> GetByIdAsync(int id)
    {
        var entity = await _repo
            .GetAll()
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null);
        return entity == null ? null : ToDto(entity);
    }

    public async Task<RecruitmentCampaignDto> CreateAsync(CampaignUpsertDto dto)
    {
        var entity = new RecruitmentCampaign
        {
            Name = dto.Name,
            Position = dto.Position,
            QuantityNeeded = dto.QuantityNeeded,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            PostContent = dto.PostContent,
            Requirements = dto.Requirements,
            Note = dto.Note,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "open" : dto.Status,
            CreatedBy = dto.CreatedBy,
        };
        await _repo.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<RecruitmentCampaignDto> UpdateAsync(int id, CampaignUpsertDto dto)
    {
        var entity =
            await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy chiến dịch");
        if (entity.DeletedAt != null)
            throw new NotFoundException("Không tìm thấy chiến dịch");

        entity.Name = dto.Name;
        entity.Position = dto.Position;
        entity.QuantityNeeded = dto.QuantityNeeded;
        entity.StartDate = dto.StartDate;
        entity.EndDate = dto.EndDate;
        entity.PostContent = dto.PostContent;
        entity.Requirements = dto.Requirements;
        entity.Note = dto.Note;
        entity.Status = string.IsNullOrWhiteSpace(dto.Status) ? entity.Status : dto.Status;
        entity.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task DeleteAsync(int id)
    {
        var entity =
            await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy chiến dịch");
        if (entity.DeletedAt != null)
            throw new NotFoundException("Không tìm thấy chiến dịch");
        entity.DeletedAt = DateTime.UtcNow.AddHours(7);
        await _unitOfWork.SaveChangesAsync();
    }

    private static RecruitmentCampaignDto ToDto(RecruitmentCampaign c) =>
        new()
        {
            Id = c.Id,
            Name = c.Name,
            Position = c.Position,
            QuantityNeeded = c.QuantityNeeded,
            StartDate = c.StartDate ?? "",
            EndDate = c.EndDate ?? "",
            PostContent = c.PostContent ?? "",
            Requirements = c.Requirements ?? "",
            Note = c.Note ?? "",
            Status = c.Status,
            CreatedBy = c.CreatedBy ?? "",
            CreatedAt = c.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
            UpdatedAt = c.UpdatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
        };
}

public class RecruitmentCampaignDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Position { get; set; } = "";
    public int? QuantityNeeded { get; set; }
    public string StartDate { get; set; } = "";
    public string EndDate { get; set; } = "";
    public string PostContent { get; set; } = "";
    public string Requirements { get; set; } = "";
    public string Note { get; set; } = "";
    public string Status { get; set; } = "";
    public string CreatedBy { get; set; } = "";
    public string? CreatedAt { get; set; }
    public string? UpdatedAt { get; set; }
}

public class CampaignUpsertDto
{
    public string Name { get; set; } = null!;
    public string Position { get; set; } = null!;
    public int? QuantityNeeded { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? PostContent { get; set; }
    public string? Requirements { get; set; }
    public string? Note { get; set; }
    public string? Status { get; set; }
    public string? CreatedBy { get; set; }
}
