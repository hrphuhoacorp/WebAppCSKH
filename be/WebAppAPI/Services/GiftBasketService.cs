using System.Globalization;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IGiftBasketService
{
    Task<PagedResult<GiftBasketDTO>> GetBasketsAsync(GiftBasketFilterDTO filter);
    Task<GiftBasketDTO> CreateBasketAsync(CreateGiftBasketDTO dto, int userId);
    Task<GiftBasketDTO> UpdateBasketAsync(UpdateGiftBasketDTO dto, int userId);
    Task<bool> DeleteBasketAsync(int id, int userId);
    Task<List<GiftCodeMappingDTO>> GetCodeMappingsAsync(int? branchId);
    Task<PagedResult<GiftCodeChangeRequestDTO>> GetCodeChangeRequestsAsync(
        int page,
        int pageSize,
        string? status,
        int? branchId
    );
    Task<GiftCodeChangeRequestDTO> CreateCodeChangeRequestAsync(
        CreateCodeChangeRequestDTO dto,
        int userId
    );
    Task<GiftCodeChangeRequestDTO> HandleCodeChangeRequestAsync(
        HandleCodeChangeRequestDTO dto,
        int userId
    );
    Task<GiftCodeChangeRequestDTO?> GetCodeChangeRequestByIdAsync(int id);
    Task<string> UploadBasketImageAsync(IFormFile file, int userId);
    Task<byte[]> ExportChangeRequestsExcelAsync(string? status);
}

public class GiftBasketService : IGiftBasketService
{
    private readonly IGiftBasketRepository _basketRepo;
    private readonly IGiftCodeMappingRepository _mappingRepo;
    private readonly IGiftCodeChangeRequestRepository _ccrRepo;
    private readonly IBranchRepository _branchRepo;
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly MediaSettings _mediaSettings;

    public GiftBasketService(
        IGiftBasketRepository basketRepo,
        IGiftCodeMappingRepository mappingRepo,
        IGiftCodeChangeRequestRepository ccrRepo,
        IBranchRepository branchRepo,
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        IOptions<MediaSettings> mediaOptions
    )
    {
        _basketRepo = basketRepo;
        _mappingRepo = mappingRepo;
        _ccrRepo = ccrRepo;
        _branchRepo = branchRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _mediaSettings = mediaOptions.Value;
    }

    // ─── BASKETS ───────────────────────────────────────────────────────────────

    public async Task<PagedResult<GiftBasketDTO>> GetBasketsAsync(GiftBasketFilterDTO filter)
    {
        var query = _basketRepo
            .GetAll()
            .Include(b => b.Branch)
            .Where(b => b.DeletedAt == null)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var kw = filter.Search.Trim().ToLower();
            query = query.Where(b =>
                b.BasketName.ToLower().Contains(kw)
                || b.CurrentCode.ToLower().Contains(kw)
                || b.BaseCode.ToLower().Contains(kw)
            );
        }
        if (filter.BranchId.HasValue)
            query = query.Where(b => b.BranchId == filter.BranchId.Value);
        if (!string.IsNullOrWhiteSpace(filter.Status))
            query = query.Where(b => b.Status == filter.Status);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(b => b.UpdatedAt ?? b.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(b => MapBasketDto(b))
            .ToListAsync();

        return new PagedResult<GiftBasketDTO>
        {
            TotalItems = total,
            Page = filter.Page,
            PageSize = filter.PageSize,
            Items = items,
        };
    }

    public async Task<GiftBasketDTO> CreateBasketAsync(CreateGiftBasketDTO dto, int userId)
    {
        var now = DateTime.UtcNow;
        var basket = new GiftBasket
        {
            BasketUid = "BSK-" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
            BranchId = dto.BranchId,
            BaseCode = dto.BaseCode.Trim().ToUpper(),
            BasketName = dto.BasketName.Trim(),
            CurrentCode = dto.CurrentCode.Trim().ToUpper(),
            Price = dto.Price,
            EffectiveDate = dto.EffectiveDate,
            Status = dto.Status ?? "active",
            FrontImageUrl = dto.FrontImageUrl,
            BackImageUrl = dto.BackImageUrl,
            ImageOverlayText = dto.ImageOverlayText,
            Notice = dto.Notice,
            Note = dto.Note,
            UpdatedBy = userId,
            UpdatedAt = now,
            CreatedAt = now,
        };

        await _basketRepo.AddAsync(basket);
        await _unitOfWork.SaveChangesAsync();

        await SyncCodeMappingAsync(basket, null);

        var branch = basket.BranchId.HasValue
            ? await _branchRepo.GetAll().FirstOrDefaultAsync(b => b.Id == basket.BranchId)
            : null;
        basket.Branch = branch;

        return MapBasketDto(basket);
    }

    public async Task<GiftBasketDTO> UpdateBasketAsync(UpdateGiftBasketDTO dto, int userId)
    {
        var basket =
            await _basketRepo
                .GetAll()
                .Include(b => b.Branch)
                .FirstOrDefaultAsync(b => b.Id == dto.Id && b.DeletedAt == null)
            ?? throw new NotFoundException("Không tìm thấy giỏ quà");

        var oldCode = basket.CurrentCode;

        basket.BranchId = dto.BranchId;
        basket.BaseCode = dto.BaseCode.Trim().ToUpper();
        basket.BasketName = dto.BasketName.Trim();
        basket.CurrentCode = dto.CurrentCode.Trim().ToUpper();
        basket.Price = dto.Price;
        basket.EffectiveDate = dto.EffectiveDate;
        basket.Status = dto.Status ?? "active";
        basket.FrontImageUrl = dto.FrontImageUrl ?? basket.FrontImageUrl;
        basket.BackImageUrl = dto.BackImageUrl ?? basket.BackImageUrl;
        basket.ImageOverlayText = dto.ImageOverlayText;
        basket.Notice = dto.Notice;
        basket.Note = dto.Note;
        basket.UpdatedBy = userId;
        basket.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();
        await SyncCodeMappingAsync(basket, oldCode != basket.CurrentCode ? oldCode : null);

        return MapBasketDto(basket);
    }

    public async Task<bool> DeleteBasketAsync(int id, int userId)
    {
        var basket =
            await _basketRepo.GetAll().FirstOrDefaultAsync(b => b.Id == id && b.DeletedAt == null)
            ?? throw new NotFoundException("Không tìm thấy giỏ quà");

        basket.DeletedAt = DateTime.UtcNow;
        basket.Status = "deleted";
        basket.UpdatedBy = userId;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    // ─── CODE MAPPINGS ─────────────────────────────────────────────────────────

    public async Task<List<GiftCodeMappingDTO>> GetCodeMappingsAsync(int? branchId)
    {
        var query = _mappingRepo.GetAll().Include(m => m.Branch).AsNoTracking();

        if (branchId.HasValue)
            query = query.Where(m => m.BranchId == branchId.Value);

        return await query
            .OrderBy(m => m.Code)
            .Select(m => new GiftCodeMappingDTO
            {
                Id = m.Id,
                Code = m.Code,
                BaseCode = m.BaseCode,
                BasketName = m.BasketName,
                BranchId = m.BranchId,
                BranchName = m.Branch != null ? m.Branch.Name : null,
                BasketId = m.BasketId,
                Active = m.Active,
                Source = m.Source,
                UpdatedAt = m.UpdatedAt,
            })
            .ToListAsync();
    }

    private async Task SyncCodeMappingAsync(GiftBasket basket, string? oldCode)
    {
        var now = DateTime.UtcNow;

        // Đánh dấu mã cũ là inactive
        if (!string.IsNullOrWhiteSpace(oldCode))
        {
            var old = await _mappingRepo
                .GetAll()
                .FirstOrDefaultAsync(m => m.Code == oldCode && m.BranchId == basket.BranchId);
            if (old != null)
            {
                old.Active = false;
                old.UpdatedAt = now;
            }
        }

        // Upsert mã mới
        var existing = await _mappingRepo
            .GetAll()
            .FirstOrDefaultAsync(m =>
                m.Code == basket.CurrentCode && m.BranchId == basket.BranchId
            );

        if (existing != null)
        {
            existing.BaseCode = basket.BaseCode;
            existing.BasketName = basket.BasketName;
            existing.BasketId = basket.Id;
            existing.Active = true;
            existing.Source = "library-sync";
            existing.UpdatedAt = now;
        }
        else
        {
            await _mappingRepo.AddAsync(
                new GiftCodeMapping
                {
                    Code = basket.CurrentCode,
                    BaseCode = basket.BaseCode,
                    BasketName = basket.BasketName,
                    BranchId = basket.BranchId,
                    BasketId = basket.Id,
                    Active = true,
                    Source = "library-sync",
                    UpdatedAt = now,
                }
            );
        }

        await _unitOfWork.SaveChangesAsync();
    }

    // ─── CODE CHANGE REQUESTS ──────────────────────────────────────────────────

    public async Task<PagedResult<GiftCodeChangeRequestDTO>> GetCodeChangeRequestsAsync(
        int page,
        int pageSize,
        string? status,
        int? branchId
    )
    {
        var query = _ccrRepo.GetAll().Include(r => r.Branch).AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.Status == status);
        if (branchId.HasValue)
            query = query.Where(r => r.BranchId == branchId.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var userIds = items
            .Select(i => i.CreatedBy)
            .Where(x => x.HasValue)
            .Select(x => x!.Value)
            .Union(items.Select(i => i.HandledBy).Where(x => x.HasValue).Select(x => x!.Value))
            .Distinct()
            .ToList();
        var users = await _userRepo
            .GetAll()
            .Where(u => userIds.Contains(u.Id))
            .AsNoTracking()
            .ToDictionaryAsync(u => u.Id, u => u.Name ?? u.Email);

        return new PagedResult<GiftCodeChangeRequestDTO>
        {
            TotalItems = total,
            Page = page,
            PageSize = pageSize,
            Items = items.Select(r => MapCcrDto(r, users)).ToList(),
        };
    }

    public async Task<GiftCodeChangeRequestDTO?> GetCodeChangeRequestByIdAsync(int id)
    {
        var req = await _ccrRepo.GetAll()
            .Include(r => r.Branch)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);
        if (req == null) return null;
        var users = new Dictionary<int, string>();
        if (req.CreatedBy.HasValue || req.HandledBy.HasValue)
        {
            var ids = new List<int>();
            if (req.CreatedBy.HasValue) ids.Add(req.CreatedBy.Value);
            if (req.HandledBy.HasValue) ids.Add(req.HandledBy.Value);
            users = await _userRepo.GetAll().Where(u => ids.Contains(u.Id))
                .AsNoTracking().ToDictionaryAsync(u => u.Id, u => u.Name ?? u.Email);
        }
        return MapCcrDto(req, users);
    }

    public async Task<GiftCodeChangeRequestDTO> CreateCodeChangeRequestAsync(
        CreateCodeChangeRequestDTO dto,
        int userId
    )
    {
        var now = DateTime.UtcNow;
        var batchId = "CCR-" + now.ToString("yyyyMMddHHmmss");
        var req = new GiftCodeChangeRequest
        {
            BatchId = batchId,
            BatchNote = dto.BatchNote,
            RequestUid = "REQ-" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
            BranchId = dto.BranchId,
            BasketCodeOrName = dto.BasketCodeOrName?.Trim(),
            Reason = dto.Reason?.Trim(),
            Note = dto.Note,
            Priority = dto.Priority ?? "normal",
            GroupCode = dto.GroupCode,
            Price = dto.Price,
            SentZaloPhoto = dto.SentZaloPhoto,
            FrontImageUrl = dto.FrontImageUrl,
            BackImageUrl = dto.BackImageUrl,
            Status = "pending",
            CreatedBy = userId,
            CreatedAt = now,
        };
        await _ccrRepo.AddAsync(req);
        await _unitOfWork.SaveChangesAsync();

        var branch = req.BranchId.HasValue
            ? await _branchRepo.GetAll().FirstOrDefaultAsync(b => b.Id == req.BranchId)
            : null;
        req.Branch = branch;

        return MapCcrDto(req, new Dictionary<int, string>());
    }

    public async Task<GiftCodeChangeRequestDTO> HandleCodeChangeRequestAsync(
        HandleCodeChangeRequestDTO dto,
        int userId
    )
    {
        var req =
            await _ccrRepo.GetAll().Include(r => r.Branch).FirstOrDefaultAsync(r => r.Id == dto.Id)
            ?? throw new NotFoundException("Không tìm thấy yêu cầu");

        req.Status = dto.Status;
        req.OldCode = dto.OldCode?.Trim();
        req.NewCode = dto.NewCode?.Trim();
        req.Price = dto.Price ?? req.Price;
        req.ApprovedDate = dto.ApprovedDate;
        req.ResultNote = dto.ResultNote;
        req.HandledBy = userId;
        req.HandledAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return MapCcrDto(req, new Dictionary<int, string>());
    }

    // ─── IMAGE UPLOAD ──────────────────────────────────────────────────────────

    public async Task<string> UploadBasketImageAsync(IFormFile file, int userId)
    {
        var allowExts = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLower();
        if (!allowExts.Contains(ext))
            throw new BadRequestException("Chỉ chấp nhận file ảnh (.jpg, .jpeg, .png, .webp)");

        var saveFolder = Path.Combine(_mediaSettings.RootPath, "gift-baskets");
        Directory.CreateDirectory(saveFolder);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var savePath = Path.Combine(saveFolder, fileName);

        await using var stream = new FileStream(savePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"{_mediaSettings.RequestPath}/gift-baskets/{fileName}";
    }

    // ─── HELPERS ───────────────────────────────────────────────────────────────

    private static GiftBasketDTO MapBasketDto(GiftBasket b) =>
        new()
        {
            Id = b.Id,
            BasketUid = b.BasketUid,
            BranchId = b.BranchId,
            BranchName = b.Branch?.Name,
            BaseCode = b.BaseCode,
            BasketName = b.BasketName,
            CurrentCode = b.CurrentCode,
            Price = b.Price,
            EffectiveDate = b.EffectiveDate,
            Status = b.Status,
            FrontImageUrl = b.FrontImageUrl,
            BackImageUrl = b.BackImageUrl,
            ImageOverlayText = b.ImageOverlayText,
            Notice = b.Notice,
            Note = b.Note,
            UpdatedBy = b.UpdatedBy,
            UpdatedAt = b.UpdatedAt,
            CreatedAt = b.CreatedAt,
        };

    private static GiftCodeChangeRequestDTO MapCcrDto(
        GiftCodeChangeRequest r,
        Dictionary<int, string> users
    ) =>
        new()
        {
            Id = r.Id,
            BatchId = r.BatchId,
            BatchNote = r.BatchNote,
            RequestUid = r.RequestUid,
            BranchId = r.BranchId,
            BranchName = r.Branch?.Name,
            BasketCodeOrName = r.BasketCodeOrName,
            Reason = r.Reason,
            Note = r.Note,
            Priority = r.Priority,
            GroupCode = r.GroupCode,
            Price = r.Price,
            SentZaloPhoto = r.SentZaloPhoto,
            FrontImageUrl = r.FrontImageUrl,
            BackImageUrl = r.BackImageUrl,
            Status = r.Status,
            HandledBy = r.HandledBy,
            HandledByName =
                r.HandledBy.HasValue && users.TryGetValue(r.HandledBy.Value, out var hn)
                    ? hn
                    : null,
            HandledAt = r.HandledAt,
            OldCode = r.OldCode,
            NewCode = r.NewCode,
            ApprovedDate = r.ApprovedDate,
            ResultNote = r.ResultNote,
            CreatedBy = r.CreatedBy,
            CreatedByName =
                r.CreatedBy.HasValue && users.TryGetValue(r.CreatedBy.Value, out var cn)
                    ? cn
                    : null,
            CreatedAt = r.CreatedAt,
        };

    public async Task<byte[]> ExportChangeRequestsExcelAsync(string? status)
    {
        var query = _ccrRepo.GetAll()
            .Include(r => r.Branch)
            .Where(r => r.Status == "done")
            .OrderBy(r => r.HandledAt);

        var rows = await query.ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Đổi Mã");

        // Header row
        ws.Cell(1, 1).Value = "MÃ TRƯỚC";
        ws.Cell(1, 2).Value = "MÃ SAU";
        ws.Cell(1, 3).Value = "GIÁ";
        ws.Cell(1, 4).Value = "NGÀY";
        ws.Cell(1, 5).Value = "GHI CHÚ";

        var hRange = ws.Range(1, 1, 1, 5);
        hRange.Style.Font.Bold = true;
        hRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#086839");
        hRange.Style.Font.FontColor = XLColor.White;
        hRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        int row = 2;
        foreach (var r in rows)
        {
            ws.Cell(row, 1).Value = r.OldCode ?? "";
            ws.Cell(row, 2).Value = r.NewCode ?? "";
            if (r.Price.HasValue)
            {
                ws.Cell(row, 3).Value = r.Price.Value;
                ws.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
            }
            ws.Cell(row, 4).Value = r.ApprovedDate ?? "";
            ws.Cell(row, 5).Value = r.ResultNote ?? "";
            row++;
        }

        ws.Columns().AdjustToContents();
        ws.Column(5).Width = Math.Max(ws.Column(5).Width, 40);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
