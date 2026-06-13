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

    Task<List<GiftCodeMappingDTO>> GetCodeMappingsAsync(int? branchId);
    Task<PagedResult<GiftCodeChangeRequestDTO>> GetCodeChangeRequestsAsync(
        int page,
        int pageSize,
        string? status,
        int? branchId,
        bool? isActive = null
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
    Task SetChangeRequestActiveAsync(int id, bool isActive);
    Task<GiftCodeChangeRequestDTO> UpdateAndActivateAsync(int id, ActivateCodeChangeRequestDTO dto);
    Task DeleteChangeRequestAsync(int id);
    Task<string> UploadBasketImageAsync(IFormFile file, int userId);
    Task<byte[]> ExportChangeRequestsExcelAsync(string? month, bool? isActive);
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

        await _unitOfWork.SaveChangesAsync();
        await SyncCodeMappingAsync(basket, oldCode != basket.CurrentCode ? oldCode : null);

        return MapBasketDto(basket);
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
        

        // Đánh dấu mã cũ là inactive
        if (!string.IsNullOrWhiteSpace(oldCode))
        {
            var old = await _mappingRepo
                .GetAll()
                .FirstOrDefaultAsync(m => m.Code == oldCode && m.BranchId == basket.BranchId);
            if (old != null)
            {
                old.Active = false;
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
        int? branchId,
        bool? isActive = null
    )
    {
        var query = _ccrRepo.GetAll().Include(r => r.Branch).AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.Status == status);

        if (branchId.HasValue)
            query = query.Where(r => r.BranchId == branchId.Value);

        if (isActive.HasValue)
            query = query.Where(r => r.IsActive == isActive.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.IsActive == true)
            .ThenByDescending(r => r.Status == "pending")
            .ThenByDescending(r => r.CreatedAt)
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
        var req = await _ccrRepo
            .GetAll()
            .Include(r => r.Branch)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);
        if (req == null)
            return null;
        var users = new Dictionary<int, string>();
        if (req.CreatedBy.HasValue || req.HandledBy.HasValue)
        {
            var ids = new List<int>();
            if (req.CreatedBy.HasValue)
                ids.Add(req.CreatedBy.Value);
            if (req.HandledBy.HasValue)
                ids.Add(req.HandledBy.Value);
            users = await _userRepo
                .GetAll()
                .Where(u => ids.Contains(u.Id))
                .AsNoTracking()
                .ToDictionaryAsync(u => u.Id, u => u.Name ?? u.Email);
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
        if (dto.FrontImageUrl != null) req.FrontImageUrl = dto.FrontImageUrl;
        if (dto.BackImageUrl != null) req.BackImageUrl = dto.BackImageUrl;
        req.HandledBy = userId;
        req.HandledAt = DateTime.UtcNow.AddHours(7);
        await _unitOfWork.SaveChangesAsync();

        return MapCcrDto(req, new Dictionary<int, string>());
    }

    public async Task SetChangeRequestActiveAsync(int id, bool isActive)
    {
        var req =
            await _ccrRepo.GetAll().FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new NotFoundException("Không tìm thấy yêu cầu");
        req.IsActive = isActive;
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<GiftCodeChangeRequestDTO> UpdateAndActivateAsync(int id, ActivateCodeChangeRequestDTO dto)
    {
        var req =
            await _ccrRepo.GetAll().Include(r => r.Branch).FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new NotFoundException("Không tìm thấy yêu cầu");
        if (dto.OldCode != null) req.OldCode = dto.OldCode.Trim();
        if (dto.NewCode != null) req.NewCode = dto.NewCode.Trim();
        if (dto.Price.HasValue) req.Price = dto.Price.Value;
        if (dto.ApprovedDate != null) req.ApprovedDate = dto.ApprovedDate;
        if (dto.ResultNote != null) req.ResultNote = dto.ResultNote;
        if (dto.Note != null) req.Note = dto.Note;
        if (dto.GroupCode != null) req.GroupCode = dto.GroupCode;
        if (dto.BranchId.HasValue) req.BranchId = dto.BranchId.Value;
        req.IsActive = dto.IsActive;
        await _unitOfWork.SaveChangesAsync();
        return MapCcrDto(req, new Dictionary<int, string>());
    }

    public async Task DeleteChangeRequestAsync(int id)
    {
        await _ccrRepo.DeleteAsync(id);
        await _unitOfWork.SaveChangesAsync();
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
            IsActive = r.IsActive,
        };

    public async Task<byte[]> ExportChangeRequestsExcelAsync(string? month, bool? isActive)
    {
        IQueryable<GiftCodeChangeRequest> query = _ccrRepo
            .GetAll()
            .Include(r => r.Branch)
            .Where(r => r.Status == "done");

        // Filter by month (format: "YYYY-MM")
        if (!string.IsNullOrWhiteSpace(month))
            query = query.Where(r => r.ApprovedDate != null && r.ApprovedDate.StartsWith(month));

        // Filter by isActive
        if (isActive.HasValue)
            query = query.Where(r => r.IsActive == isActive.Value);

        var rows = await query.OrderBy(r => r.ApprovedDate).ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Đổi Mã");

        // Header row
        ws.Cell(1, 1).Value = "MÃ TRƯỚC";
        ws.Cell(1, 2).Value = "MÃ SAU";
        ws.Cell(1, 3).Value = "GIÁ";
        ws.Cell(1, 4).Value = "NGÀY";
        ws.Cell(1, 5).Value = "CHI NHÁNH";
        ws.Cell(1, 6).Value = "HIỆU LỰC";
        ws.Cell(1, 7).Value = "GHI CHÚ";

        var hRange = ws.Range(1, 1, 1, 7);
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
            ws.Cell(row, 5).Value = r.Branch?.Name ?? "";
            ws.Cell(row, 6).Value = r.IsActive ? "Còn hiệu lực" : "Hết hiệu lực";
            ws.Cell(row, 7).Value = r.ResultNote ?? "";
            row++;
        }

        ws.Columns().AdjustToContents();
        ws.Column(7).Width = Math.Max(ws.Column(7).Width, 40);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
