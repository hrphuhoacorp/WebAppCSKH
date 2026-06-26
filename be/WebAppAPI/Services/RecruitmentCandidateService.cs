using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebAppInfractor.Models.Recruitment;

public interface IRecruitmentCandidateService
{
    Task<IEnumerable<RecruitmentCandidateDto>> GetAllAsync(
        int? campaignId,
        string? status,
        string? search
    );
    Task<RecruitmentCandidateDetailDto?> GetByIdAsync(int id);
    Task<RecruitmentCandidateDto> CreateAsync(CandidateCreateDto dto);
    Task<RecruitmentCandidateDto> UpdateAsync(int id, CandidateUpdateDto dto);
    Task<CvUploadResultDto> UploadCvAsync(int id, IFormFile file, string? actedBy);
    Task<(byte[] bytes, string mimeType, string fileName)> DownloadCvAsync(int id);
    Task SendMailAsync(int id, SendMailDto dto);
    Task DeleteAsync(int id);
}

public class RecruitmentCandidateService : IRecruitmentCandidateService
{
    private readonly IRecruitmentCandidateRepository _repo;
    private readonly IRecruitmentCandidateHistoryRepository _historyRepo;
    private readonly IEmailService _emailService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly MediaSettings _mediaSettings;

    private static readonly string[] AllowedCvExtensions =
    [
        ".pdf",
        ".doc",
        ".docx",
        ".jpg",
        ".jpeg",
        ".png",
    ];

    public RecruitmentCandidateService(
        IRecruitmentCandidateRepository repo,
        IRecruitmentCandidateHistoryRepository historyRepo,
        IEmailService emailService,
        IUnitOfWork unitOfWork,
        IOptions<MediaSettings> mediaOptions
    )
    {
        _repo = repo;
        _historyRepo = historyRepo;
        _emailService = emailService;
        _unitOfWork = unitOfWork;
        _mediaSettings = mediaOptions.Value;
    }

    public async Task<IEnumerable<RecruitmentCandidateDto>> GetAllAsync(
        int? campaignId,
        string? status,
        string? search
    )
    {
        var query = _repo.GetAll().AsNoTracking().Where(c => c.DeletedAt == null);
        if (campaignId.HasValue)
            query = query.Where(c => c.CampaignId == campaignId);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(c => c.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(c =>
                c.CandidateName.ToLower().Contains(s)
                || (c.Phone != null && c.Phone.Contains(s))
                || (c.Email != null && c.Email.ToLower().Contains(s))
            );
        }
        var list = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return list.Select(ToDto);
    }

    public async Task<RecruitmentCandidateDetailDto?> GetByIdAsync(int id)
    {
        var entity = await _repo
            .GetAll()
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null);
        if (entity == null)
            return null;
        var history = await _historyRepo
            .GetAll()
            .AsNoTracking()
            .Where(h => h.CandidateId == id)
            .OrderByDescending(h => h.ActedAt)
            .Select(h => new CandidateHistoryDto
            {
                Id = h.Id,
                Action = h.Action,
                Note = h.Note ?? "",
                ActedBy = h.ActedBy ?? "",
                ActedAt = h.ActedAt.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
            })
            .ToListAsync();
        return new RecruitmentCandidateDetailDto { Candidate = ToDto(entity), History = history };
    }

    public async Task<RecruitmentCandidateDto> CreateAsync(CandidateCreateDto dto)
    {
        var entity = MapFromCreateDto(dto);
        await _repo.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        await AddHistoryAsync(
            entity.Id,
            dto.ActedBy,
            "Thêm ứng viên",
            $"Trạng thái: {entity.Status}"
        );
        return ToDto(entity);
    }

    public async Task<RecruitmentCandidateDto> UpdateAsync(int id, CandidateUpdateDto dto)
    {
        var entity =
            await _repo.GetByIdAsync(id) ?? throw new NotFoundException("Không tìm thấy ứng viên");
        if (entity.DeletedAt != null)
            throw new NotFoundException("Không tìm thấy ứng viên");

        var oldStatus = entity.Status;
        // Only overwrite fields that are explicitly provided (non-null).
        // This allows quickUpdate to send only {status} without wiping all other fields.
        if (dto.CandidateName != null) entity.CandidateName = dto.CandidateName;
        if (dto.Phone != null)        entity.Phone = dto.Phone;
        if (dto.Email != null)        entity.Email = dto.Email;
        if (dto.Position != null)     entity.Position = dto.Position;
        if (dto.Source != null)       entity.Source = dto.Source;
        if (dto.SourceOtherNote != null) entity.SourceOtherNote = dto.SourceOtherNote;
        if (dto.CvLink != null)       entity.CvLink = dto.CvLink;
        if (dto.CvNote != null)       entity.CvNote = dto.CvNote;
        entity.Status = string.IsNullOrWhiteSpace(dto.Status) ? entity.Status : dto.Status;
        if (dto.WaitingFor != null)   entity.WaitingFor = dto.WaitingFor;
        if (dto.InterviewTime != null) entity.InterviewTime = dto.InterviewTime;
        if (dto.InterviewNote != null) entity.InterviewNote = dto.InterviewNote;
        if (dto.Result != null)       entity.Result = dto.Result;
        if (dto.OfferNote != null)    entity.OfferNote = dto.OfferNote;
        if (dto.OnboardDate != null)  entity.OnboardDate = dto.OnboardDate;
        if (dto.CampaignId != null)   entity.CampaignId = dto.CampaignId;
        entity.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        var note =
            oldStatus != entity.Status
                ? $"Trạng thái: {oldStatus} → {entity.Status}"
                : "Cập nhật thông tin";
        await AddHistoryAsync(id, dto.ActedBy, "Cập nhật", note);
        return ToDto(entity);
    }

    public async Task<CvUploadResultDto> UploadCvAsync(int id, IFormFile file, string? actedBy)
    {
        var entity =
            await _repo.GetByIdAsync(id) ?? throw new NotFoundException("Không tìm thấy ứng viên");
        if (entity.DeletedAt != null)
            throw new NotFoundException("Không tìm thấy ứng viên");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedCvExtensions.Contains(ext))
            throw new BadRequestException(
                $"Định dạng {ext} không được hỗ trợ. Dùng: PDF, DOC, DOCX, JPG, PNG"
            );

        if (!string.IsNullOrEmpty(entity.CvFilePath))
        {
            var oldPath = Path.Combine(_mediaSettings.RootPath, entity.CvFilePath);
            if (File.Exists(oldPath))
                File.Delete(oldPath);
        }

        var saveFolder = Path.Combine(_mediaSettings.RootPath, "recruitment-cv");
        Directory.CreateDirectory(saveFolder);
        var safeFileName =
            $"{id}_{DateTime.UtcNow:yyyyMMddHHmmss}_{Path.GetFileName(file.FileName)}";
        var savePath = Path.Combine(saveFolder, safeFileName);
        await using var fs = new FileStream(savePath, FileMode.Create);
        await file.CopyToAsync(fs);

        entity.CvFileName = file.FileName;
        entity.CvFilePath = $"recruitment-cv/{safeFileName}";
        entity.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        await AddHistoryAsync(id, actedBy, "Tải CV", $"File: {file.FileName}");

        return new CvUploadResultDto
        {
            CvFileName = entity.CvFileName,
            CvFilePath = entity.CvFilePath,
        };
    }

    public async Task<(byte[] bytes, string mimeType, string fileName)> DownloadCvAsync(int id)
    {
        var entity =
            await _repo
                .GetAll()
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null)
            ?? throw new NotFoundException("Không tìm thấy ứng viên");
        if (string.IsNullOrEmpty(entity.CvFilePath))
            throw new NotFoundException("CV chưa được tải lên.");

        var fullPath = Path.Combine(_mediaSettings.RootPath, entity.CvFilePath);
        if (!File.Exists(fullPath))
            throw new NotFoundException("File đã bị xóa khỏi server.");

        var bytes = await File.ReadAllBytesAsync(fullPath);
        var mime = GetMimeType(entity.CvFileName ?? entity.CvFilePath);
        var name = entity.CvFileName ?? Path.GetFileName(entity.CvFilePath);
        return (bytes, mime, name);
    }

    public async Task SendMailAsync(int id, SendMailDto dto)
    {
        var entity =
            await _repo.GetByIdAsync(id) ?? throw new NotFoundException("Không tìm thấy ứng viên");
        if (entity.DeletedAt != null)
            throw new NotFoundException("Không tìm thấy ứng viên");
        if (string.IsNullOrWhiteSpace(entity.Email))
            throw new BadRequestException("Ứng viên chưa có email");

        await _emailService.SendEmaiLAsync(entity.Email, dto.Subject, dto.HtmlBody, dto.Attachments);

        if (dto.MailType == "invite")
            entity.MailInviteSent = true;
        else if (dto.MailType == "result")
            entity.MailResultSent = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        await AddHistoryAsync(
            id,
            dto.ActedBy,
            "Gửi email",
            $"Loại: {dto.MailType} | Chủ đề: {dto.Subject}"
        );
    }

    public async Task DeleteAsync(int id)
    {
        var entity =
            await _repo.GetByIdAsync(id) ?? throw new NotFoundException("Không tìm thấy ứng viên");
        if (entity.DeletedAt != null)
            throw new NotFoundException("Không tìm thấy ứng viên");
        entity.DeletedAt = DateTime.UtcNow.AddHours(7);
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task AddHistoryAsync(
        int candidateId,
        string? actedBy,
        string action,
        string? note = null
    )
    {
        await _historyRepo.AddAsync(
            new RecruitmentCandidateHistory
            {
                CandidateId = candidateId,
                ActedBy = actedBy,
                Action = action,
                Note = note,
                ActedAt = DateTime.UtcNow,
            }
        );
        await _unitOfWork.SaveChangesAsync();
    }

    private static RecruitmentCandidate MapFromCreateDto(CandidateCreateDto dto) =>
        new()
        {
            CampaignId = dto.CampaignId,
            CandidateName = dto.CandidateName,
            Phone = dto.Phone,
            Email = dto.Email,
            Position = dto.Position,
            Source = dto.Source,
            SourceOtherNote = dto.SourceOtherNote,
            CvLink = dto.CvLink,
            CvNote = dto.CvNote,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "new" : dto.Status,
            WaitingFor = dto.WaitingFor,
            InterviewTime = dto.InterviewTime,
            InterviewNote = dto.InterviewNote,
            Result = dto.Result,
            OfferNote = dto.OfferNote,
            OnboardDate = dto.OnboardDate,
            CreatedBy = dto.ActedBy,
        };

    private static string GetMimeType(string? fileName) =>
        Path.GetExtension(fileName ?? "").ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            _ => "application/octet-stream",
        };

    private static RecruitmentCandidateDto ToDto(RecruitmentCandidate c) =>
        new()
        {
            Id = c.Id,
            CampaignId = c.CampaignId,
            CandidateName = c.CandidateName,
            Phone = c.Phone ?? "",
            Email = c.Email ?? "",
            Position = c.Position ?? "",
            Source = c.Source ?? "",
            SourceOtherNote = c.SourceOtherNote ?? "",
            CvLink = c.CvLink ?? "",
            CvFileName = c.CvFileName ?? "",
            CvFilePath = c.CvFilePath ?? "",
            CvNote = c.CvNote ?? "",
            Status = c.Status,
            WaitingFor = c.WaitingFor ?? "",
            InterviewTime = c.InterviewTime ?? "",
            InterviewNote = c.InterviewNote ?? "",
            Result = c.Result ?? "",
            OfferNote = c.OfferNote ?? "",
            OnboardDate = c.OnboardDate ?? "",
            MailInviteSent = c.MailInviteSent,
            MailResultSent = c.MailResultSent,
            CreatedBy = c.CreatedBy ?? "",
            CreatedAt = c.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
            UpdatedAt = c.UpdatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
        };
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

public class RecruitmentCandidateDto
{
    public int Id { get; set; }
    public int? CampaignId { get; set; }
    public string CandidateName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public string Position { get; set; } = "";
    public string Source { get; set; } = "";
    public string SourceOtherNote { get; set; } = "";
    public string CvLink { get; set; } = "";
    public string CvFileName { get; set; } = "";
    public string CvFilePath { get; set; } = "";
    public string CvNote { get; set; } = "";
    public string Status { get; set; } = "";
    public string WaitingFor { get; set; } = "";
    public string InterviewTime { get; set; } = "";
    public string InterviewNote { get; set; } = "";
    public string Result { get; set; } = "";
    public string OfferNote { get; set; } = "";
    public string OnboardDate { get; set; } = "";
    public bool MailInviteSent { get; set; }
    public bool MailResultSent { get; set; }
    public string CreatedBy { get; set; } = "";
    public string? CreatedAt { get; set; }
    public string? UpdatedAt { get; set; }
}

public class RecruitmentCandidateDetailDto
{
    public RecruitmentCandidateDto Candidate { get; set; } = null!;
    public List<CandidateHistoryDto> History { get; set; } = [];
}

public class CandidateHistoryDto
{
    public int Id { get; set; }
    public string Action { get; set; } = "";
    public string Note { get; set; } = "";
    public string ActedBy { get; set; } = "";
    public string ActedAt { get; set; } = "";
}

public class CvUploadResultDto
{
    public string? CvFileName { get; set; }
    public string? CvFilePath { get; set; }
}

public class CandidateCreateDto
{
    public int? CampaignId { get; set; }
    public string CandidateName { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Position { get; set; }
    public string? Source { get; set; }
    public string? SourceOtherNote { get; set; }
    public string? CvLink { get; set; }
    public string? CvNote { get; set; }
    public string? Status { get; set; }
    public string? WaitingFor { get; set; }
    public string? InterviewTime { get; set; }
    public string? InterviewNote { get; set; }
    public string? Result { get; set; }
    public string? OfferNote { get; set; }
    public string? OnboardDate { get; set; }
    public string? ActedBy { get; set; }
}

public class CandidateUpdateDto : CandidateCreateDto { }

public class SendMailDto
{
    public string Subject { get; set; } = null!;
    public string HtmlBody { get; set; } = null!;
    public string MailType { get; set; } = "custom";
    public string? ActedBy { get; set; }
    public IList<IFormFile>? Attachments { get; set; }
}

public class UploadCvForm
{
    public IFormFile File { get; set; } = null!;
    public string? ActedBy { get; set; }
}
