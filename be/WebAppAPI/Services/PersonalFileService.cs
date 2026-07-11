using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebAppInfractor.Data;
using WebAppInfractor.Models.PersonalFiles;

public interface IPersonalFileService
{
    Task<List<PersonalFolderDTO>> GetFoldersAsync(int userId);
    Task<PersonalItemsDTO> GetItemsAsync(int userId, int? folderId, string? search);
    Task<PersonalFolderDTO> CreateFolderAsync(int userId, string name, int? parentId);
    Task<PersonalFolderDTO> RenameFolderAsync(int userId, int id, string newName);
    Task<PersonalFileDTO> RenameFileAsync(int userId, int id, string newName);
    Task<List<PersonalFileDTO>> UploadFilesAsync(int userId, int? folderId, List<IFormFile> files);
    Task<bool> MoveItemsAsync(int userId, List<int> folderIds, List<int> fileIds, int? targetFolderId);
    Task<bool> CopyItemsAsync(int userId, List<int> folderIds, List<int> fileIds, int? targetFolderId);
    Task<bool> DeleteItemsAsync(int userId, List<int> folderIds, List<int> fileIds);
    Task<List<PersonalRecycleItemDTO>> GetTrashAsync(int userId);
    Task<bool> RestoreItemsAsync(int userId, List<int> folderIds, List<int> fileIds);
    Task<bool> PermanentDeleteAsync(int userId, List<int> folderIds, List<int> fileIds);
    Task<(Stream Stream, string FileName, string MimeType)> GetFileStreamAsync(int userId, int fileId);
}

public class PersonalFileService : IPersonalFileService
{
    private static readonly HashSet<string> BlockedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".exe", ".bat", ".cmd", ".msi", ".sh", ".ps1", ".js", ".vbs", ".scr", ".com", ".jar", ".dll", ".cpl", ".msc",
    };
    private const long MaxFileSizeBytes = 200L * 1024 * 1024; // 200MB / file

    private readonly MemBerContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IActivityService _auditLogService;
    private readonly MediaSettings _mediaSettings;

    public PersonalFileService(
        MemBerContext context,
        IUnitOfWork unitOfWork,
        IActivityService auditLogService,
        IOptions<MediaSettings> mediaOptions
    )
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _auditLogService = auditLogService;
        _mediaSettings = mediaOptions.Value;
    }

    public async Task<List<PersonalFolderDTO>> GetFoldersAsync(int userId)
    {
        // Trả về phẳng — frontend tự dựng cây theo ParentId (đơn giản hơn tính đệ quy ở server).
        return await _context.Set<PersonalFolder>()
            .AsNoTracking()
            .Where(f => f.OwnerId == userId && f.DeletedAt == null)
            .OrderBy(f => f.Name)
            .Select(f => new PersonalFolderDTO
            {
                Id = f.Id,
                Name = f.Name,
                ParentId = f.ParentId,
                CreatedAt = f.CreatedAt,
                UpdatedAt = f.UpdatedAt,
            })
            .ToListAsync();
    }

    public async Task<PersonalItemsDTO> GetItemsAsync(int userId, int? folderId, string? search)
    {
        var folderQuery = _context.Set<PersonalFolder>().AsNoTracking().Where(f => f.OwnerId == userId && f.DeletedAt == null);
        var fileQuery = _context.Set<PersonalFile>().AsNoTracking().Where(f => f.OwnerId == userId && f.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.Trim().ToLower();
            folderQuery = folderQuery.Where(f => f.Name.ToLower().Contains(kw));
            fileQuery = fileQuery.Where(f =>
                f.FileName.ToLower().Contains(kw) || (f.OriginalName != null && f.OriginalName.ToLower().Contains(kw))
            );
        }
        else
        {
            folderQuery = folderQuery.Where(f => f.ParentId == folderId);
            fileQuery = fileQuery.Where(f => f.FolderId == folderId);
        }

        var folders = await folderQuery
            .OrderBy(f => f.Name)
            .Select(f => new PersonalFolderDTO { Id = f.Id, Name = f.Name, ParentId = f.ParentId, CreatedAt = f.CreatedAt, UpdatedAt = f.UpdatedAt })
            .ToListAsync();

        var files = await fileQuery
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new PersonalFileDTO
            {
                Id = f.Id,
                FolderId = f.FolderId,
                FileName = f.FileName,
                OriginalName = f.OriginalName,
                MimeType = f.MimeType,
                FileSize = f.FileSize,
                CreatedAt = f.CreatedAt,
                UpdatedAt = f.UpdatedAt,
            })
            .ToListAsync();

        return new PersonalItemsDTO
        {
            Folders = folders,
            Files = files,
            Breadcrumb = string.IsNullOrWhiteSpace(search) ? await GetBreadcrumbAsync(userId, folderId) : new(),
        };
    }

    private async Task<List<BreadcrumbItemDTO>> GetBreadcrumbAsync(int userId, int? folderId)
    {
        var trail = new List<BreadcrumbItemDTO>();
        var currentId = folderId;
        // Giới hạn 50 cấp để tránh vòng lặp vô hạn nếu dữ liệu lỡ bị hỏng (ParentId trỏ vòng).
        for (var guard = 0; currentId.HasValue && guard < 50; guard++)
        {
            var folder = await _context.Set<PersonalFolder>()
                .AsNoTracking()
                .Where(f => f.Id == currentId.Value && f.OwnerId == userId)
                .Select(f => new { f.Id, f.Name, f.ParentId })
                .FirstOrDefaultAsync();
            if (folder == null) break;
            trail.Insert(0, new BreadcrumbItemDTO { Id = folder.Id, Name = folder.Name });
            currentId = folder.ParentId;
        }
        return trail;
    }

    // File và thư mục dùng chung 1 "không gian tên" trong cùng thư mục cha — không được trùng
    // tên (không phân biệt hoa/thường), đúng quy tắc hệ thống file thật (NTFS/Explorer).
    private async Task<bool> NameExistsAsync(int userId, int? containerId, string name, int? excludeFolderId = null, int? excludeFileId = null)
    {
        var lower = name.Trim().ToLower();
        var folderExists = await _context.Set<PersonalFolder>()
            .AnyAsync(f => f.OwnerId == userId && f.ParentId == containerId && f.DeletedAt == null
                && f.Name.ToLower() == lower && (excludeFolderId == null || f.Id != excludeFolderId));
        if (folderExists) return true;

        return await _context.Set<PersonalFile>()
            .AnyAsync(f => f.OwnerId == userId && f.FolderId == containerId && f.DeletedAt == null
                && f.FileName.ToLower() == lower && (excludeFileId == null || f.Id != excludeFileId));
    }

    private async Task EnsureNameAvailableAsync(int userId, int? containerId, string name, int? excludeFolderId = null, int? excludeFileId = null)
    {
        if (await NameExistsAsync(userId, containerId, name, excludeFolderId, excludeFileId))
            throw new BadRequestException($"Đã có mục tên '{name.Trim()}' trong thư mục này");
    }

    // Dùng cho tải lên/di chuyển/sao chép — thay vì chặn, tự thêm hậu tố " (1)", " (2)"... để
    // không làm gián đoạn thao tác hàng loạt (đúng kiểu "Keep both" của Explorer).
    private async Task<string> MakeUniqueNameAsync(int userId, int? containerId, string desiredName, bool isFile, int? excludeFolderId = null, int? excludeFileId = null)
    {
        var stem = desiredName;
        var ext = "";
        if (isFile)
        {
            var lastDot = desiredName.LastIndexOf('.');
            if (lastDot > 0) { stem = desiredName.Substring(0, lastDot); ext = desiredName.Substring(lastDot); }
        }

        var candidate = desiredName;
        for (var n = 1; await NameExistsAsync(userId, containerId, candidate, excludeFolderId, excludeFileId); n++)
        {
            candidate = n <= 1000 ? $"{stem} ({n}){ext}" : $"{stem}-{Guid.NewGuid():N}{ext}";
        }
        return candidate;
    }

    public async Task<PersonalFolderDTO> CreateFolderAsync(int userId, string name, int? parentId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new BadRequestException("Tên thư mục không được để trống");
        name = name.Trim();

        if (parentId.HasValue)
        {
            var parentExists = await _context.Set<PersonalFolder>()
                .AnyAsync(f => f.Id == parentId.Value && f.OwnerId == userId && f.DeletedAt == null);
            if (!parentExists)
                throw new NotFoundException("Không tìm thấy thư mục cha");
        }

        await EnsureNameAvailableAsync(userId, parentId, name);

        var folder = new PersonalFolder { Name = name, ParentId = parentId, OwnerId = userId };
        _context.Set<PersonalFolder>().Add(folder);
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "CREATE_PERSONAL_FOLDER", "personal_folders", folder.Id, null, new { folder.Name, folder.ParentId });

        return new PersonalFolderDTO { Id = folder.Id, Name = folder.Name, ParentId = folder.ParentId, CreatedAt = folder.CreatedAt, UpdatedAt = folder.UpdatedAt };
    }

    public async Task<PersonalFolderDTO> RenameFolderAsync(int userId, int id, string newName)
    {
        if (string.IsNullOrWhiteSpace(newName))
            throw new BadRequestException("Tên thư mục không được để trống");

        var folder = await _context.Set<PersonalFolder>().FirstOrDefaultAsync(f => f.Id == id && f.OwnerId == userId && f.DeletedAt == null);
        if (folder == null)
            throw new NotFoundException("Không tìm thấy thư mục");

        newName = newName.Trim();
        await EnsureNameAvailableAsync(userId, folder.ParentId, newName, excludeFolderId: folder.Id);

        var oldName = folder.Name;
        folder.Name = newName;
        folder.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "RENAME_PERSONAL_FOLDER", "personal_folders", folder.Id, new { Name = oldName }, new { Name = folder.Name });

        return new PersonalFolderDTO { Id = folder.Id, Name = folder.Name, ParentId = folder.ParentId, CreatedAt = folder.CreatedAt, UpdatedAt = folder.UpdatedAt };
    }

    public async Task<PersonalFileDTO> RenameFileAsync(int userId, int id, string newName)
    {
        if (string.IsNullOrWhiteSpace(newName))
            throw new BadRequestException("Tên file không được để trống");

        var file = await _context.Set<PersonalFile>().FirstOrDefaultAsync(f => f.Id == id && f.OwnerId == userId && f.DeletedAt == null);
        if (file == null)
            throw new NotFoundException("Không tìm thấy file");

        newName = newName.Trim();
        await EnsureNameAvailableAsync(userId, file.FolderId, newName, excludeFileId: file.Id);

        var oldName = file.FileName;
        file.FileName = newName;
        file.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "RENAME_PERSONAL_FILE", "personal_files", file.Id, new { FileName = oldName }, new { file.FileName });

        return new PersonalFileDTO { Id = file.Id, FolderId = file.FolderId, FileName = file.FileName, OriginalName = file.OriginalName, MimeType = file.MimeType, FileSize = file.FileSize, CreatedAt = file.CreatedAt, UpdatedAt = file.UpdatedAt };
    }

    public async Task<List<PersonalFileDTO>> UploadFilesAsync(int userId, int? folderId, List<IFormFile> files)
    {
        if (files == null || files.Count == 0)
            throw new BadRequestException("Chưa có file để tải lên");

        if (folderId.HasValue)
        {
            var folderExists = await _context.Set<PersonalFolder>()
                .AnyAsync(f => f.Id == folderId.Value && f.OwnerId == userId && f.DeletedAt == null);
            if (!folderExists)
                throw new NotFoundException("Không tìm thấy thư mục đích");
        }

        var saveFolder = Path.Combine(_mediaSettings.RootPath, "personal-files", userId.ToString());
        Directory.CreateDirectory(saveFolder);

        var result = new List<PersonalFileDTO>();
        foreach (var file in files)
        {
            if (file.Length == 0) continue;
            if (file.Length > MaxFileSizeBytes)
                throw new BadRequestException($"File '{file.FileName}' vượt quá giới hạn 200MB");

            var ext = Path.GetExtension(file.FileName);
            if (BlockedExtensions.Contains(ext))
                throw new BadRequestException($"File '{file.FileName}' thuộc loại không được phép tải lên (đuôi {ext})");

            var storedName = $"{Guid.NewGuid():N}{ext}";
            var savePath = Path.Combine(saveFolder, storedName);
            await using (var stream = new FileStream(savePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var uniqueName = await MakeUniqueNameAsync(userId, folderId, file.FileName, isFile: true);
            var personalFile = new PersonalFile
            {
                FolderId = folderId,
                FileName = uniqueName,
                OriginalName = file.FileName,
                StoragePath = Path.Combine("personal-files", userId.ToString(), storedName),
                MimeType = file.ContentType,
                FileSize = file.Length,
                OwnerId = userId,
            };
            _context.Set<PersonalFile>().Add(personalFile);
            await _unitOfWork.SaveChangesAsync();

            await _auditLogService.SaveLogAsync(userId, null, "UPLOAD_PERSONAL_FILE", "personal_files", personalFile.Id, null,
                new { personalFile.FileName, personalFile.FolderId, personalFile.FileSize });

            result.Add(new PersonalFileDTO { Id = personalFile.Id, FolderId = personalFile.FolderId, FileName = personalFile.FileName, OriginalName = personalFile.OriginalName, MimeType = personalFile.MimeType, FileSize = personalFile.FileSize, CreatedAt = personalFile.CreatedAt, UpdatedAt = personalFile.UpdatedAt });
        }
        return result;
    }

    public async Task<bool> MoveItemsAsync(int userId, List<int> folderIds, List<int> fileIds, int? targetFolderId)
    {
        folderIds ??= new(); fileIds ??= new();
        if (folderIds.Count == 0 && fileIds.Count == 0)
            throw new BadRequestException("Chưa chọn mục nào để di chuyển");

        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            if (targetFolderId.HasValue)
            {
                var targetExists = await _context.Set<PersonalFolder>()
                    .AnyAsync(f => f.Id == targetFolderId.Value && f.OwnerId == userId && f.DeletedAt == null);
                if (!targetExists)
                    throw new NotFoundException("Không tìm thấy thư mục đích");
            }

            var folders = await _context.Set<PersonalFolder>()
                .Where(f => folderIds.Contains(f.Id) && f.OwnerId == userId && f.DeletedAt == null)
                .ToListAsync();

            foreach (var folder in folders)
            {
                if (targetFolderId.HasValue && (targetFolderId.Value == folder.Id || await IsDescendantAsync(userId, targetFolderId.Value, folder.Id)))
                    throw new BadRequestException($"Không thể di chuyển thư mục '{folder.Name}' vào chính nó hoặc thư mục con của nó");
                folder.Name = await MakeUniqueNameAsync(userId, targetFolderId, folder.Name, isFile: false, excludeFolderId: folder.Id);
                folder.ParentId = targetFolderId;
                folder.UpdatedAt = DateTime.UtcNow;
                await _unitOfWork.SaveChangesAsync();
            }

            var files = await _context.Set<PersonalFile>()
                .Where(f => fileIds.Contains(f.Id) && f.OwnerId == userId && f.DeletedAt == null)
                .ToListAsync();
            foreach (var file in files)
            {
                file.FileName = await MakeUniqueNameAsync(userId, targetFolderId, file.FileName, isFile: true, excludeFileId: file.Id);
                file.FolderId = targetFolderId;
                file.UpdatedAt = DateTime.UtcNow;
                await _unitOfWork.SaveChangesAsync();
            }

            await _auditLogService.SaveLogAsync(userId, null, "MOVE_PERSONAL_ITEMS", "personal_files", targetFolderId, null,
                new { FolderIds = folderIds, FileIds = fileIds, TargetFolderId = targetFolderId });
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // Kiểm tra folderId có phải là con cháu (ở bất kỳ cấp nào) của ancestorId không — chặn di
    // chuyển 1 thư mục vào chính thư mục con của nó (sẽ tạo vòng lặp vô hạn trong cây).
    private async Task<bool> IsDescendantAsync(int userId, int folderId, int ancestorId)
    {
        var currentId = (int?)folderId;
        for (var guard = 0; currentId.HasValue && guard < 50; guard++)
        {
            if (currentId.Value == ancestorId) return true;
            currentId = await _context.Set<PersonalFolder>()
                .Where(f => f.Id == currentId.Value && f.OwnerId == userId)
                .Select(f => f.ParentId)
                .FirstOrDefaultAsync();
        }
        return false;
    }

    public async Task<bool> CopyItemsAsync(int userId, List<int> folderIds, List<int> fileIds, int? targetFolderId)
    {
        folderIds ??= new(); fileIds ??= new();
        if (folderIds.Count == 0 && fileIds.Count == 0)
            throw new BadRequestException("Chưa chọn mục nào để sao chép");

        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            if (targetFolderId.HasValue)
            {
                var targetExists = await _context.Set<PersonalFolder>()
                    .AnyAsync(f => f.Id == targetFolderId.Value && f.OwnerId == userId && f.DeletedAt == null);
                if (!targetExists)
                    throw new NotFoundException("Không tìm thấy thư mục đích");
            }

            var files = await _context.Set<PersonalFile>()
                .Where(f => fileIds.Contains(f.Id) && f.OwnerId == userId && f.DeletedAt == null)
                .ToListAsync();
            foreach (var file in files)
                await CopyFileAsync(userId, file, targetFolderId);

            var folders = await _context.Set<PersonalFolder>()
                .Where(f => folderIds.Contains(f.Id) && f.OwnerId == userId && f.DeletedAt == null)
                .ToListAsync();
            foreach (var folder in folders)
            {
                if (targetFolderId.HasValue && (targetFolderId.Value == folder.Id || await IsDescendantAsync(userId, targetFolderId.Value, folder.Id)))
                    throw new BadRequestException($"Không thể sao chép thư mục '{folder.Name}' vào chính nó hoặc thư mục con của nó");
                await CopyFolderRecursiveAsync(userId, folder.Id, targetFolderId);
            }

            await _unitOfWork.SaveChangesAsync();
            await _auditLogService.SaveLogAsync(userId, null, "COPY_PERSONAL_ITEMS", "personal_files", targetFolderId, null,
                new { FolderIds = folderIds, FileIds = fileIds, TargetFolderId = targetFolderId });
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task<PersonalFile> CopyFileAsync(int userId, PersonalFile source, int? targetFolderId)
    {
        var sourcePath = Path.Combine(_mediaSettings.RootPath, source.StoragePath);
        var ext = Path.GetExtension(source.StoragePath);
        var storedName = $"{Guid.NewGuid():N}{ext}";
        var relativePath = Path.Combine("personal-files", userId.ToString(), storedName);
        var destPath = Path.Combine(_mediaSettings.RootPath, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
        if (File.Exists(sourcePath))
            File.Copy(sourcePath, destPath, overwrite: false);

        var uniqueName = await MakeUniqueNameAsync(userId, targetFolderId, source.FileName, isFile: true);
        var copy = new PersonalFile
        {
            FolderId = targetFolderId,
            FileName = uniqueName,
            OriginalName = source.OriginalName,
            StoragePath = relativePath,
            MimeType = source.MimeType,
            FileSize = source.FileSize,
            OwnerId = userId,
        };
        _context.Set<PersonalFile>().Add(copy);
        await _unitOfWork.SaveChangesAsync();
        return copy;
    }

    private async Task<PersonalFolder> CopyFolderRecursiveAsync(int userId, int sourceFolderId, int? targetParentId)
    {
        var source = await _context.Set<PersonalFolder>().AsNoTracking().FirstAsync(f => f.Id == sourceFolderId);
        var uniqueName = await MakeUniqueNameAsync(userId, targetParentId, source.Name, isFile: false);
        var copy = new PersonalFolder { Name = uniqueName, ParentId = targetParentId, OwnerId = userId };
        _context.Set<PersonalFolder>().Add(copy);
        await _unitOfWork.SaveChangesAsync();

        var files = await _context.Set<PersonalFile>()
            .Where(f => f.FolderId == sourceFolderId && f.OwnerId == userId && f.DeletedAt == null)
            .ToListAsync();
        foreach (var file in files)
            await CopyFileAsync(userId, file, copy.Id);

        var children = await _context.Set<PersonalFolder>()
            .Where(f => f.ParentId == sourceFolderId && f.OwnerId == userId && f.DeletedAt == null)
            .Select(f => f.Id)
            .ToListAsync();
        foreach (var childId in children)
            await CopyFolderRecursiveAsync(userId, childId, copy.Id);

        return copy;
    }

    public async Task<bool> DeleteItemsAsync(int userId, List<int> folderIds, List<int> fileIds)
    {
        folderIds ??= new(); fileIds ??= new();
        if (folderIds.Count == 0 && fileIds.Count == 0)
            throw new BadRequestException("Chưa chọn mục nào để xóa");

        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var now = DateTime.UtcNow;
            var files = await _context.Set<PersonalFile>()
                .Where(f => fileIds.Contains(f.Id) && f.OwnerId == userId && f.DeletedAt == null)
                .ToListAsync();
            foreach (var file in files) { file.DeletedAt = now; file.UpdatedAt = now; }

            foreach (var folderId in folderIds)
                await SoftDeleteFolderRecursiveAsync(userId, folderId, now);

            await _unitOfWork.SaveChangesAsync();
            await _auditLogService.SaveLogAsync(userId, null, "DELETE_PERSONAL_ITEMS", "personal_files", null, null,
                new { FolderIds = folderIds, FileIds = fileIds });
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task SoftDeleteFolderRecursiveAsync(int userId, int folderId, DateTime now)
    {
        var folder = await _context.Set<PersonalFolder>().FirstOrDefaultAsync(f => f.Id == folderId && f.OwnerId == userId && f.DeletedAt == null);
        if (folder == null) return;
        folder.DeletedAt = now;
        folder.UpdatedAt = now;

        var files = await _context.Set<PersonalFile>()
            .Where(f => f.FolderId == folderId && f.OwnerId == userId && f.DeletedAt == null)
            .ToListAsync();
        foreach (var file in files) { file.DeletedAt = now; file.UpdatedAt = now; }

        var childIds = await _context.Set<PersonalFolder>()
            .Where(f => f.ParentId == folderId && f.OwnerId == userId && f.DeletedAt == null)
            .Select(f => f.Id)
            .ToListAsync();
        foreach (var childId in childIds)
            await SoftDeleteFolderRecursiveAsync(userId, childId, now);
    }

    public async Task<List<PersonalRecycleItemDTO>> GetTrashAsync(int userId)
    {
        var folders = await _context.Set<PersonalFolder>()
            .AsNoTracking()
            .Where(f => f.OwnerId == userId && f.DeletedAt != null)
            .Select(f => new PersonalRecycleItemDTO { Id = f.Id, Name = f.Name, IsFolder = true, DeletedAt = f.DeletedAt })
            .ToListAsync();

        var files = await _context.Set<PersonalFile>()
            .AsNoTracking()
            .Where(f => f.OwnerId == userId && f.DeletedAt != null)
            .Select(f => new PersonalRecycleItemDTO { Id = f.Id, Name = f.FileName, IsFolder = false, DeletedAt = f.DeletedAt })
            .ToListAsync();

        return folders.Concat(files).OrderByDescending(x => x.DeletedAt).ToList();
    }

    public async Task<bool> RestoreItemsAsync(int userId, List<int> folderIds, List<int> fileIds)
    {
        folderIds ??= new(); fileIds ??= new();
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            foreach (var folderId in folderIds)
                await RestoreFolderRecursiveAsync(userId, folderId);

            var files = await _context.Set<PersonalFile>()
                .Where(f => fileIds.Contains(f.Id) && f.OwnerId == userId && f.DeletedAt != null)
                .ToListAsync();
            foreach (var file in files)
            {
                // Nếu thư mục cha vẫn còn trong thùng rác, khôi phục luôn cả chuỗi cha để file
                // không bị "mồ côi" (hiện ở gốc nhưng dữ liệu vẫn ghi FolderId cũ).
                if (file.FolderId.HasValue)
                    await RestoreFolderChainAsync(userId, file.FolderId.Value);
                file.DeletedAt = null;
                file.UpdatedAt = DateTime.UtcNow;
            }

            await _unitOfWork.SaveChangesAsync();
            await _auditLogService.SaveLogAsync(userId, null, "RESTORE_PERSONAL_ITEMS", "personal_files", null, null,
                new { FolderIds = folderIds, FileIds = fileIds });
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task RestoreFolderChainAsync(int userId, int folderId)
    {
        var folder = await _context.Set<PersonalFolder>().FirstOrDefaultAsync(f => f.Id == folderId && f.OwnerId == userId);
        if (folder == null || folder.DeletedAt == null) return;
        folder.DeletedAt = null;
        folder.UpdatedAt = DateTime.UtcNow;
        if (folder.ParentId.HasValue)
            await RestoreFolderChainAsync(userId, folder.ParentId.Value);
    }

    private async Task RestoreFolderRecursiveAsync(int userId, int folderId)
    {
        var folder = await _context.Set<PersonalFolder>().FirstOrDefaultAsync(f => f.Id == folderId && f.OwnerId == userId);
        if (folder == null) return;
        folder.DeletedAt = null;
        folder.UpdatedAt = DateTime.UtcNow;

        var files = await _context.Set<PersonalFile>()
            .Where(f => f.FolderId == folderId && f.OwnerId == userId && f.DeletedAt != null)
            .ToListAsync();
        foreach (var file in files) { file.DeletedAt = null; file.UpdatedAt = DateTime.UtcNow; }

        var childIds = await _context.Set<PersonalFolder>()
            .Where(f => f.ParentId == folderId && f.OwnerId == userId && f.DeletedAt != null)
            .Select(f => f.Id)
            .ToListAsync();
        foreach (var childId in childIds)
            await RestoreFolderRecursiveAsync(userId, childId);
    }

    public async Task<bool> PermanentDeleteAsync(int userId, List<int> folderIds, List<int> fileIds)
    {
        folderIds ??= new(); fileIds ??= new();
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            foreach (var folderId in folderIds)
                await PermanentDeleteFolderRecursiveAsync(userId, folderId);

            var files = await _context.Set<PersonalFile>()
                .Where(f => fileIds.Contains(f.Id) && f.OwnerId == userId && f.DeletedAt != null)
                .ToListAsync();
            foreach (var file in files)
                DeletePhysicalFileAndRemove(file);

            await _unitOfWork.SaveChangesAsync();
            await _auditLogService.SaveLogAsync(userId, null, "PERMANENT_DELETE_PERSONAL_ITEMS", "personal_files", null, null,
                new { FolderIds = folderIds, FileIds = fileIds });
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private void DeletePhysicalFileAndRemove(PersonalFile file)
    {
        try
        {
            var fullPath = Path.Combine(_mediaSettings.RootPath, file.StoragePath);
            if (File.Exists(fullPath))
                File.Delete(fullPath);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PersonalFile] Không xóa được file vật lý {file.StoragePath}: {ex.Message}");
        }
        _context.Set<PersonalFile>().Remove(file);
    }

    private async Task PermanentDeleteFolderRecursiveAsync(int userId, int folderId)
    {
        var folder = await _context.Set<PersonalFolder>().FirstOrDefaultAsync(f => f.Id == folderId && f.OwnerId == userId);
        if (folder == null) return;

        var files = await _context.Set<PersonalFile>()
            .Where(f => f.FolderId == folderId && f.OwnerId == userId)
            .ToListAsync();
        foreach (var file in files)
            DeletePhysicalFileAndRemove(file);

        var childIds = await _context.Set<PersonalFolder>()
            .Where(f => f.ParentId == folderId && f.OwnerId == userId)
            .Select(f => f.Id)
            .ToListAsync();
        foreach (var childId in childIds)
            await PermanentDeleteFolderRecursiveAsync(userId, childId);

        _context.Set<PersonalFolder>().Remove(folder);
    }

    public async Task<(Stream Stream, string FileName, string MimeType)> GetFileStreamAsync(int userId, int fileId)
    {
        var file = await _context.Set<PersonalFile>()
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == fileId && f.OwnerId == userId && f.DeletedAt == null);
        // Cố tình trả NotFound kể cả khi file tồn tại nhưng thuộc người khác — không lộ thông
        // tin tồn tại của file người khác.
        if (file == null)
            throw new NotFoundException("Không tìm thấy file");

        var fullPath = Path.Combine(_mediaSettings.RootPath, file.StoragePath);
        if (!File.Exists(fullPath))
            throw new NotFoundException("File đã bị xóa khỏi server");

        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read);
        return (stream, file.OriginalName ?? file.FileName, file.MimeType ?? "application/octet-stream");
    }
}
