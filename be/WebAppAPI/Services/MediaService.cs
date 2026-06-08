using DocumentFormat.OpenXml.Office2010.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using WebAppInfractor.Models;

public interface IMediaService
{
    Task<List<MediaUploadResultDto>> UploadAsync(int folderId, List<IFormFile> files, int? userId);
    Task<List<MediaFolderDto>> GetFolderAsync();
    Task<List<MediaFileDto>> GetFilesAsync(int? folderId, string? search);
    Task<List<MediaFileDto>> GetRecycledFilesAsync(int? folderId, string? search);
    Task<MediaFolderDto> CreateFolderAsync(string name, int? parentId, int? userId);
    Task<bool> DeleteFileAsync(int id);
    Task<bool> RestoreFileAsync(int id);

    Task<bool> MoveFileAsync(int id, int folderId);
}

public class MediaService : IMediaService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMediaFolderRepository _mediaFolderRepository;
    private readonly IMediaFileRepository _mediaFileRepository;
    private readonly MediaSettings _mediaSettings;

    public MediaService(
        IUnitOfWork unitOfWork,
        IMediaFolderRepository mediaFolderRepository,
        IMediaFileRepository mediaFileRepository,
        IOptions<MediaSettings> mediaOptions
    )
    {
        _unitOfWork = unitOfWork;
        _mediaFolderRepository = mediaFolderRepository;
        _mediaFileRepository = mediaFileRepository;
        _mediaSettings = mediaOptions.Value;
    }

    public async Task<List<MediaUploadResultDto>> UploadAsync(
        int folderId,
        List<IFormFile> files,
        int? userId
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
            })
            .ToListAsync();
        var lookup = folders.ToDictionary(x => x.Id);
        foreach (var folder in folders)
        {
            if (folder.ParentId.HasValue)
            {
                var parent = lookup[folder.ParentId.Value];
                if (parent != null)
                {
                    parent.Children.Add(folder);
                }
            }
        }
        folders = folders.Where(x => x.ParentId == null).ToList();
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

    public async Task<List<MediaFileDto>> GetRecycledFilesAsync(int? folderId, string? search)
    {
        var query = _mediaFileRepository.GetAll().Where(x => x.DeletedAt != null).AsQueryable();

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
            .OrderByDescending(x => x.DeletedAt)
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
                CreatedBy = x.CreatedByNavigation != null ? x.CreatedByNavigation.Name : null,
            })
            .ToListAsync();

        return files;
    }

    public async Task<bool> RestoreFileAsync(int id)
    {
        var file = await _mediaFileRepository
            .GetAll()
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt != null);

        if (file == null)
            throw new NotFoundException("Không tìm thấy file trong thùng rác");

        file.DeletedAt = null;

        await _mediaFileRepository.Update(file);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<MediaFolderDto> CreateFolderAsync(string name, int? parentId, int? userId)
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

    public async Task<bool> DeleteFileAsync(int id)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var file = await _mediaFileRepository
                .GetAll()
                .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);

            if (file == null)
                throw new NotFoundException("Không tìm thấy file");

            file.DeletedAt = DateTime.Now.AddHours(7);

            await _mediaFileRepository.Update(file);

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return true;
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

    public async Task<bool> MoveFileAsync(int id, int folderId)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var file = await _mediaFileRepository
                .GetAll()
                .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);

            if (file == null)
                throw new NotFoundException("Không tìm thấy file");

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
            {
                await transaction.RollbackAsync();
            }

            throw;
        }
    }
}
