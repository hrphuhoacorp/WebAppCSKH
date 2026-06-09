using DocumentFormat.OpenXml.Office2010.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using WebAppInfractor.Models;

public interface IMediaService
{
    Task<List<MediaUploadResultDto>> UploadAsync(int folderId, List<IFormFile> files, int userId);
    Task<List<MediaFolderDto>> GetFolderAsync();
    Task<List<MediaFileDto>> GetFilesAsync(int? folderId, string? search);
    Task<List<RecycleItemDto>> GetRecycleBinAsync(int userId);
    Task<MediaFolderDto> CreateFolderAsync(string name, int? parentId, int userId);
    Task<bool> DeleteFolderAsync(int id, int userId);
    Task<bool> RestoreFolderAsync(int id, int userId);
    Task<bool> DeleteFilesAsync(List<int> ids, int userId);
    Task<bool> RestoreFileAsync(int id, int userId);
    Task<bool> MoveFileAsync(int id, int folderId, int userId);
}

public class MediaService : IMediaService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMediaFolderRepository _mediaFolderRepository;
    private readonly IMediaFileRepository _mediaFileRepository;
    private readonly MediaSettings _mediaSettings;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IActivityService _auditLogService;

    public MediaService(
        IUnitOfWork unitOfWork,
        IMediaFolderRepository mediaFolderRepository,
        IMediaFileRepository mediaFileRepository,
        IOptions<MediaSettings> mediaOptions,
        IHttpContextAccessor httpContextAccessor,
        IActivityService auditLogService
    )
    {
        _unitOfWork = unitOfWork;
        _mediaFolderRepository = mediaFolderRepository;
        _mediaFileRepository = mediaFileRepository;
        _mediaSettings = mediaOptions.Value;
        _httpContextAccessor = httpContextAccessor;
        _auditLogService = auditLogService;
    }

    private bool IsAdmin()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        if (user == null)
            return false;
        return user.IsInRole("Admin_Media");
    }

    private bool HasPermission(int? createdByUserId, int? currentUserId)
    {
        if (IsAdmin())
            return true; // Admin có toàn quyền
        Console.WriteLine($@"");
        Console.WriteLine($"createdByUserId = {createdByUserId}");
        Console.WriteLine($"currentUserId = {currentUserId}");
        Console.WriteLine($@"");
        return createdByUserId == currentUserId; // User thường chỉ thao tác với file của mình
    }

    public async Task<List<MediaUploadResultDto>> UploadAsync(
        int folderId,
        List<IFormFile> files,
        int userId
    )
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            if (files == null || files.Count == 0)
            {
                throw new BadRequestException("Chưa có File Upload");
            }
            var folder = await _mediaFolderRepository
                .GetAll()
                .FirstOrDefaultAsync(f => f.Id == folderId && f.DeletedAt == null);

            if (folder == null)
            {
                throw new NotFoundException("Không tìm thấy thư mục");
            }
            var allowExts = new[] { ".jpg", ".jpeg", ".png", ".webp" };

            var folderSlug = $"folder-{folderId}";
            var saveFolder = Path.Combine(_mediaSettings.RootPath, folderSlug);
            Directory.CreateDirectory(saveFolder);

            var result = new List<MediaUploadResultDto>();

            foreach (var file in files)
            {
                var ext = Path.GetExtension(file.FileName).ToLower();

                if (!allowExts.Contains(ext))
                {
                    throw new BadRequestException($"File {file.FileName} không đúng định dạng ảnh");
                }

                var fileName = $"{Guid.NewGuid():N}{ext}";
                var savePath = Path.Combine(saveFolder, fileName);

                await using (var stream = new FileStream(savePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }
                var fileUrl = $"{_mediaSettings.RequestPath}/{folderSlug}/{fileName}";

                var mediaFile = new MediaFile
                {
                    FolderId = folderId,
                    FileName = fileName,
                    OriginalName = file.FileName,
                    FileUrl = fileUrl,
                    MimeType = file.ContentType,
                    FileSize = file.Length,
                    CreatedBy = userId,
                };

                await _mediaFileRepository.AddAsync(mediaFile);
                await _unitOfWork.SaveChangesAsync();

                result.Add(
                    new MediaUploadResultDto
                    {
                        Id = mediaFile.Id,
                        FolderId = mediaFile.FolderId,
                        FileName = mediaFile.FileName,
                        OriginalName = mediaFile.OriginalName,
                        FileUrl = mediaFile.FileUrl,
                        MimeType = mediaFile.MimeType ?? "",
                        FileSize = mediaFile.FileSize ?? 0,
                    }
                );
            }
            await transaction.CommitAsync();

            return result;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<MediaFolderDto>> GetFolderAsync()
    {
        var folders = await _mediaFolderRepository
            .GetAll()
            .Where(f => f.DeletedAt == null)
            .OrderBy(x => x.ParentId)
            .ThenBy(x => x.Name)
            .Select(f => new MediaFolderDto
            {
                Id = f.Id,
                Name = f.Name,
                ParentId = f.ParentId,
                IsPublic = f.IsPublic,
                CreatedAt = f.CreatedAt,
                CreatedBy = f.CreatedByNavigation.Name,
                Count = f.MediaFiles.Count(x => x.DeletedAt == null),
            })
            .ToListAsync();

        var lookup = folders.ToDictionary(x => x.Id);

        // SỬA Ở ĐÂY: Kiểm tra key tồn tại trước khi truy cập
        foreach (var folder in folders)
        {
            if (folder.ParentId.HasValue && lookup.ContainsKey(folder.ParentId.Value))
            {
                var parent = lookup[folder.ParentId.Value];
                parent.Children.Add(folder);
                parent.Count += folder.Count;
            }
        }

        // Chỉ lấy root folders
        folders = folders
            .Where(x => x.ParentId == null || !lookup.ContainsKey(x.ParentId.Value))
            .ToList();
        return folders;
    }

    public async Task<List<MediaFileDto>> GetFilesAsync(int? folderId, string? search)
    {
        var query = _mediaFileRepository.GetAll().Where(x => x.DeletedAt == null).AsQueryable();

        if (folderId.HasValue)
            query = query.Where(x => x.FolderId == folderId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.ToLower();
            query = query.Where(x =>
                x.FileName.ToLower().Contains(kw)
                || (x.OriginalName != null && x.OriginalName.ToLower().Contains(kw))
            );
        }

        var files = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new MediaFileDto
            {
                Id = x.Id,
                FolderId = x.FolderId,
                FileName = x.FileName,
                OriginalName = x.OriginalName,
                FileUrl = x.FileUrl,
                MimeType = x.MimeType,
                FileSize = x.FileSize,
                CreatedAt = x.CreatedAt,
                CreatedBy = x.CreatedByNavigation.Name,
            })
            .ToListAsync();

        return files;
    }

    public async Task<List<RecycleItemDto>> GetRecycleBinAsync(int userId)
    {
        var folderQuery = _mediaFolderRepository.GetAll().Where(x => x.DeletedAt != null);

        var fileQuery = _mediaFileRepository.GetAll().Where(x => x.DeletedAt != null);

        // Nếu không phải Admin, chỉ thấy file/thư mục của mình
        if (!IsAdmin())
        {
            folderQuery = folderQuery.Where(x => x.CreatedBy == userId);
            fileQuery = fileQuery.Where(x => x.CreatedBy == userId);
        }
        // Admin thấy tất cả

        var folders = await folderQuery
            .Select(x => new RecycleItemDto
            {
                Id = x.Id,
                Name = x.Name,
                IsFolder = true,
                DeletedAt = x.DeletedAt,
                CreatedBy = x.CreatedByNavigation.Name,
            })
            .ToListAsync();

        var files = await fileQuery
            .Select(x => new RecycleItemDto
            {
                Id = x.Id,
                Name = x.OriginalName ?? x.FileName,
                IsFolder = false,
                DeletedAt = x.DeletedAt,
                CreatedBy = x.CreatedByNavigation.Name,
            })
            .ToListAsync();

        return folders.Concat(files).OrderByDescending(x => x.DeletedAt).ToList();
    }

    public async Task<bool> RestoreFileAsync(int id, int userId)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var file = await _mediaFileRepository
                .GetAll()
                .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt != null);

            if (file == null)
                throw new NotFoundException("Không tìm thấy file trong thùng rác");

            // Kiểm tra quyền
            if (!HasPermission(file.CreatedBy, userId))
                throw new UnauthorizedAccessException("Bạn không có quyền khôi phục file này");

            // Kiểm tra và khôi phục folder cha nếu cần (CHỈ khôi phục folder, không đụng file)
            if (file.FolderId.HasValue)
            {
                await RestoreFolderChainOnly(file.FolderId.Value);
            }

            // Khôi phục file
            file.DeletedAt = null;
            await _mediaFileRepository.Update(file);

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            if (transaction.GetDbTransaction().Connection != null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    // Hàm mới: Chỉ khôi phục chuỗi folder cha, không khôi phục file
    private async Task RestoreFolderChainOnly(int folderId)
    {
        var folder = await _mediaFolderRepository
            .GetAll()
            .FirstOrDefaultAsync(x => x.Id == folderId);

        if (folder == null)
            return;

        // Nếu folder đã bị xóa thì mới khôi phục
        if (folder.DeletedAt != null)
        {
            folder.DeletedAt = null;
            await _mediaFolderRepository.Update(folder);

            // Tiếp tục kiểm tra folder cha của folder này
            if (folder.ParentId.HasValue)
            {
                await RestoreFolderChainOnly(folder.ParentId.Value);
            }
        }
    }

    public async Task<bool> RestoreFolderAsync(int id, int userId)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var folder = await _mediaFolderRepository.GetAll().FirstOrDefaultAsync(x => x.Id == id);

            if (folder == null)
                throw new NotFoundException("Không tìm thấy thư mục");

            // Kiểm tra quyền
            if (!HasPermission(folder.CreatedBy, userId))
                throw new UnauthorizedAccessException("Bạn không có quyền khôi phục thư mục này");

            await RestoreFolderRecursive(id);
            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            if (transaction.GetDbTransaction().Connection != null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task RestoreFolderRecursive(int folderId)
    {
        var folder = await _mediaFolderRepository
            .GetAll()
            .FirstOrDefaultAsync(x => x.Id == folderId);

        if (folder == null)
            throw new NotFoundException("Không tìm thấy thư mục");

        // Khôi phục folder
        folder.DeletedAt = null;
        await _mediaFolderRepository.Update(folder);

        // Khôi phục tất cả file trong folder (kể cả file đã bị xóa riêng)
        var files = await _mediaFileRepository
            .GetAll()
            .Where(x => x.FolderId == folderId && x.DeletedAt != null)
            .ToListAsync();

        foreach (var file in files)
        {
            file.DeletedAt = null;
            await _mediaFileRepository.Update(file);
        }

        // Khôi phục tất cả folder con
        var children = await _mediaFolderRepository
            .GetAll()
            .Where(x => x.ParentId == folderId && x.DeletedAt != null)
            .Select(x => x.Id)
            .ToListAsync();

        foreach (var childId in children)
        {
            await RestoreFolderRecursive(childId);
        }
    }

    public async Task<MediaFolderDto> CreateFolderAsync(string name, int? parentId, int userId)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var folder = new MediaFolder
            {
                Name = name,
                ParentId = parentId,
                IsPublic = true,
                CreatedBy = userId,
            };

            await _mediaFolderRepository.AddAsync(folder);

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return new MediaFolderDto
            {
                Id = folder.Id,
                Name = folder.Name,
                ParentId = folder.ParentId,
                IsPublic = folder.IsPublic,
                CreatedAt = folder.CreatedAt,
                CreatedBy = folder.CreatedByNavigation?.Name,
            };
        }
        catch
        {
            if (transaction.GetDbTransaction().Connection != null)
            {
                await transaction.RollbackAsync();
            }

            throw;
        }
    }

    public async Task<bool> DeleteFolderAsync(int id, int userId)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var folder = await _mediaFolderRepository
                .GetAll()
                .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);

            if (folder == null)
                throw new NotFoundException("Không tìm thấy thư mục");

            // Kiểm tra quyền
            if (!HasPermission(folder.CreatedBy, userId))
                throw new UnauthorizedAccessException("Bạn không có quyền xóa thư mục này");

            await SoftDeleteFolderRecursive(id, userId);
            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            if (transaction.GetDbTransaction().Connection != null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task SoftDeleteFolderRecursive(int folderId, int userId)
    {
        var folder = await _mediaFolderRepository
            .GetAll()
            .FirstOrDefaultAsync(x => x.Id == folderId && x.DeletedAt == null);

        if (folder == null)
            return;

        folder.DeletedAt = DateTime.Now.AddHours(7);
        await _mediaFolderRepository.Update(folder);

        //
        var fileQuery = _mediaFileRepository
            .GetAll()
            .Where(x => x.FolderId == folderId && x.DeletedAt == null);

        if (!IsAdmin())
        {
            // User thường chỉ xóa file của mình
            fileQuery = fileQuery.Where(x => x.CreatedBy == userId);
        }
        // Chỉ xóa các file do chính user tạo
        var files = await _mediaFileRepository
            .GetAll()
            .Where(x => x.FolderId == folderId && x.DeletedAt == null && x.CreatedBy == userId)
            .ToListAsync();

        foreach (var file in files)
        {
            file.DeletedAt = DateTime.Now.AddHours(7);
            await _mediaFileRepository.Update(file);
        }

        var children = await _mediaFolderRepository
            .GetAll()
            .Where(x => x.ParentId == folderId && x.DeletedAt == null)
            .Select(x => x.Id)
            .ToListAsync();

        foreach (var childId in children)
        {
            await SoftDeleteFolderRecursive(childId, userId);
        }
    }

    public async Task<bool> DeleteFilesAsync(List<int> ids, int userId)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var files = await _mediaFileRepository
                .GetAll()
                .Where(x => ids.Contains(x.Id) && x.DeletedAt == null)
                .ToListAsync();

            if (!files.Any())
                throw new NotFoundException("Không tìm thấy file nào");

            // Kiểm tra quyền
            foreach (var file in files)
            {
                if (!HasPermission(file.CreatedBy, userId))
                    throw new UnauthorizedAccessException(
                        $"Bạn không có quyền xóa file {file.OriginalName ?? file.FileName}"
                    );
            }

            foreach (var file in files)
            {
                file.DeletedAt = DateTime.Now.AddHours(7);
                await _mediaFileRepository.Update(file);
            }

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            if (transaction.GetDbTransaction().Connection != null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> MoveFileAsync(int id, int folderId, int userId)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var file = await _mediaFileRepository
                .GetAll()
                .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);

            if (file == null)
                throw new NotFoundException("Không tìm thấy file");

            // Kiểm tra quyền
            if (!HasPermission(file.CreatedBy, userId))
                throw new UnauthorizedAccessException("Bạn không có quyền di chuyển file này");

            var folderExists = await _mediaFolderRepository
                .GetAll()
                .AnyAsync(x => x.Id == folderId && x.DeletedAt == null);

            if (!folderExists)
                throw new Exception("Thư mục đích không tồn tại");

            file.FolderId = folderId;
            await _mediaFileRepository.Update(file);
            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            if (transaction.GetDbTransaction().Connection != null)
                await transaction.RollbackAsync();
            throw;
        }
    }
}
