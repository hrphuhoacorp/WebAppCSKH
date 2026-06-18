using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using WebAppInfractor.Models;

public interface IInternalNewsService
{
    Task<PagedResult<InternalNewsDTO>> GetPagedAsync(InternalNewsFilter filter);
    Task<InternalNewsDTO> GetByIdAsync(int id);
    Task<InternalNewsDTO> CreateAsync(InternalNewsCreateDTO dto, int userId);
    Task<InternalNewsDTO> UpdateAsync(int id, InternalNewsCreateDTO dto);
    Task DeleteAsync(int id);
    Task<InternalNewsDTO> TogglePinAsync(int id);
    Task<InternalNewsDTO> PublishAsync(int id);
    Task<InternalNewsDTO> UnpublishAsync(int id);
    Task<string> UploadImageAsync(IFormFile file);
    Task<string> UploadVideoAsync(IFormFile file);
}

public class InternalNewsService : IInternalNewsService
{
    private readonly IInternalNewsRepository _internalNewsRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly MediaSettings _mediaSettings;

    public InternalNewsService(
        IInternalNewsRepository internalNewsRepository,
        IUnitOfWork unitOfWork,
        IOptions<MediaSettings> mediaSettings
    )
    {
        _internalNewsRepository = internalNewsRepository;
        _unitOfWork = unitOfWork;
        _mediaSettings = mediaSettings.Value;
    }

    public async Task<PagedResult<InternalNewsDTO>> GetPagedAsync(InternalNewsFilter filter)
    {
        var query = _internalNewsRepository
            .GetAll()
            .Where(i => i.DeletedAt == null)
            .Include(i => i.CreatedByNavigation)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Search))
            query = query.Where(x => x.Title.Contains(filter.Search));

        if (!string.IsNullOrWhiteSpace(filter.Type))
            query = query.Where(x => x.Type == filter.Type);

        if (!string.IsNullOrWhiteSpace(filter.Status))
            query = query.Where(x => x.Status == filter.Status);

        if (filter.IsPinned.HasValue)
            query = query.Where(x => x.IsPinned == filter.IsPinned.Value);

        var totalItems = await query.CountAsync();

        var items = await query
            .OrderByDescending(x => x.IsPinned)
            .ThenByDescending(x => x.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(i => new InternalNewsDTO
            {
                Id = i.Id,
                Title = i.Title,
                Content = i.Content,
                ThumbnailUrl = i.ThumbnailUrl,
                Type = i.Type,
                Status = i.Status,
                ViewCount = i.ViewCount ?? 0,
                IsPinned = i.IsPinned ?? false,
                CreatedByName = i.CreatedByNavigation != null ? i.CreatedByNavigation.Name : null,
                CreatedAt = i.CreatedAt,
                UpdatedAt = i.UpdatedAt,
            })
            .ToListAsync();

        return new PagedResult<InternalNewsDTO>
        {
            Items = items,
            TotalItems = totalItems,
            Page = filter.Page,
            PageSize = filter.PageSize,
        };
    }

    public async Task<InternalNewsDTO> GetByIdAsync(int id)
    {
        var news = await _internalNewsRepository
            .GetAll()
            .Include(x => x.CreatedByNavigation)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);
        if (news == null)
            throw new NotFoundException("Không tìm thấy tin tức");

        var createdAtBackup = news.CreatedAt;
        news.ViewCount = (news.ViewCount ?? 0) + 1;
        await _internalNewsRepository.Update(news);

        await _unitOfWork.SaveChangesAsync();

        news.CreatedAt = createdAtBackup;

        return new InternalNewsDTO
        {
            Id = news.Id,
            Title = news.Title,
            Content = news.Content,
            ThumbnailUrl = news.ThumbnailUrl,
            Type = news.Type,
            Status = news.Status,
            ViewCount = news.ViewCount ?? 0,
            IsPinned = news.IsPinned ?? false,
            CreatedByName = news.CreatedByNavigation != null ? news.CreatedByNavigation.Name : null,
            CreatedAt = news.CreatedAt,
            UpdatedAt = news.UpdatedAt,
        };
    }

    public async Task<InternalNewsDTO> CreateAsync(InternalNewsCreateDTO dto, int userId)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var news = new InternalNews
            {
                Title = dto.Title.Trim(),
                Content = dto.Content,
                ThumbnailUrl = dto.ThumbnailUrl,
                Type = dto.Type ?? "announcement",
                Status = dto.Status ?? "draft",
                IsPinned = dto.IsPinned,
                ViewCount = 0,
                CreatedBy = userId,
            };
            await _internalNewsRepository.AddAsync(news);
            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return MapToDTO(news);
        }
        catch
        {
            if (transaction.GetDbTransaction().Connection != null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<InternalNewsDTO> UpdateAsync(int id, InternalNewsCreateDTO dto)
    {
        var news = await _internalNewsRepository
            .GetAll()
            .Include(x => x.CreatedByNavigation)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);

        if (news == null)
            throw new NotFoundException("Không tìm thấy tin tức");

        var createdAtBackup = news.CreatedAt;

        news.Title = dto.Title.Trim();
        news.Content = dto.Content;
        news.ThumbnailUrl = dto.ThumbnailUrl;
        news.Type = dto.Type;
        news.Status = dto.Status;
        news.IsPinned = dto.IsPinned;

        await _internalNewsRepository.Update(news);
        await _unitOfWork.SaveChangesAsync();

        news.CreatedAt = createdAtBackup;

        return MapToDTO(news);
    }

    public async Task DeleteAsync(int id)
    {
        var news = await _internalNewsRepository
            .GetAll()
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);

        if (news == null)
            throw new NotFoundException("Không tìm thấy tin tức");

        news.DeletedAt = DateTime.UtcNow;
        await _internalNewsRepository.Update(news);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<InternalNewsDTO> TogglePinAsync(int id)
    {
        var news = await _internalNewsRepository
            .GetAll()
            .Include(x => x.CreatedByNavigation)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);

        if (news == null)
            throw new NotFoundException("Không tìm thấy tin tức");

        var createdAtBackup = news.CreatedAt;
        news.IsPinned = !(news.IsPinned ?? false);

        await _internalNewsRepository.Update(news);
        await _unitOfWork.SaveChangesAsync();

        news.CreatedAt = createdAtBackup;

        return MapToDTO(news);
    }

    public async Task<InternalNewsDTO> PublishAsync(int id)
    {
        var news = await _internalNewsRepository
            .GetAll()
            .Include(x => x.CreatedByNavigation)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);

        if (news == null)
            throw new NotFoundException("Không tìm thấy bài viết");

        var createdAtBackup = news.CreatedAt;
        news.Status = "published";

        await _internalNewsRepository.Update(news);
        await _unitOfWork.SaveChangesAsync();

        news.CreatedAt = createdAtBackup;

        return MapToDTO(news);
    }

    public async Task<InternalNewsDTO> UnpublishAsync(int id)
    {
        var news = await _internalNewsRepository
            .GetAll()
            .Include(x => x.CreatedByNavigation)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);

        if (news == null)
            throw new NotFoundException("Không tìm thấy bài viết");

        var createdAtBackup = news.CreatedAt;
        
        news.Status = "draft";

        await _internalNewsRepository.Update(news);
        await _unitOfWork.SaveChangesAsync();

        news.CreatedAt = createdAtBackup;

        return MapToDTO(news);
    }

    private static InternalNewsDTO MapToDTO(InternalNews news) =>
        new InternalNewsDTO
        {
            Id = news.Id,
            Title = news.Title,
            Content = news.Content,
            ThumbnailUrl = news.ThumbnailUrl,
            Type = news.Type,
            Status = news.Status,
            ViewCount = news.ViewCount ?? 0,
            IsPinned = news.IsPinned ?? false,
            CreatedByName = news.CreatedByNavigation?.Name,
            CreatedAt = news.CreatedAt,
            UpdatedAt = news.UpdatedAt,
        };

    public async Task<string> UploadImageAsync(IFormFile file)
    {
        var allowedExts = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLower();

        if (!allowedExts.Contains(ext))
            throw new BadRequestException($"File {file.FileName} không đúng định dạng ảnh");

        var saveFolder = Path.Combine(_mediaSettings.RootPath, "news-images");
        Directory.CreateDirectory(saveFolder);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var savePath = Path.Combine(saveFolder, fileName);

        await using (var stream = new FileStream(savePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return $"{_mediaSettings.BaseUrl}/media/news-images/{fileName}";
    }

    public async Task<string> UploadVideoAsync(IFormFile file)
    {
        var allowedExts = new[] { ".mp4", ".webm", ".ogg", ".mov" };
        var ext = Path.GetExtension(file.FileName).ToLower();

        if (!allowedExts.Contains(ext))
            throw new BadRequestException($"File {file.FileName} không đúng định dạng video");

        var saveFolder = Path.Combine(_mediaSettings.RootPath, "news-videos");
        Directory.CreateDirectory(saveFolder);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var savePath = Path.Combine(saveFolder, fileName);

        await using (var stream = new FileStream(savePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return $"{_mediaSettings.BaseUrl}/media/news-videos/{fileName}";
    }
}
