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
    Task<SapoDashboardDTO> GetSapoDashboardAsync(string filterKey);
    Task<SapoDashboardDTO> ImportSapoFileAsync(IFormFile file, string reportDate, int userId);
    Task<bool> DeleteSapoImportAsync(string importBatchId, int userId);
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
    Task<string> UploadBasketImageAsync(IFormFile file, int userId);
}

public class GiftBasketService : IGiftBasketService
{
    private readonly IGiftBasketRepository _basketRepo;
    private readonly IGiftCodeMappingRepository _mappingRepo;
    private readonly ISapoSaleRepository _sapoSaleRepo;
    private readonly ISapoImportRepository _sapoImportRepo;
    private readonly IGiftCodeChangeRequestRepository _ccrRepo;
    private readonly IBranchRepository _branchRepo;
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly MediaSettings _mediaSettings;

    public GiftBasketService(
        IGiftBasketRepository basketRepo,
        IGiftCodeMappingRepository mappingRepo,
        ISapoSaleRepository sapoSaleRepo,
        ISapoImportRepository sapoImportRepo,
        IGiftCodeChangeRequestRepository ccrRepo,
        IBranchRepository branchRepo,
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        IOptions<MediaSettings> mediaOptions
    )
    {
        _basketRepo = basketRepo;
        _mappingRepo = mappingRepo;
        _sapoSaleRepo = sapoSaleRepo;
        _sapoImportRepo = sapoImportRepo;
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

    // ─── SAPO IMPORT ───────────────────────────────────────────────────────────

    public async Task<SapoDashboardDTO> ImportSapoFileAsync(
        IFormFile file,
        string reportDate,
        int userId
    )
    {
        if (file == null || file.Length == 0)
            throw new BadRequestException("File không hợp lệ");

        var importedAt = DateTime.UtcNow;
        var batchId = "SAPO-" + DateTime.UtcNow.ToString("yyyyMMddHHmmss");

        List<SapoSale> rows;
        using (var stream = file.OpenReadStream())
        using (var wb = new XLWorkbook(stream))
        {
            var ws = wb.Worksheet(1);
            rows = ParseSapoWorksheet(ws, batchId, userId, importedAt, reportDate);
        }

        if (rows.Count == 0)
            throw new BadRequestException("File Sapo không có dòng dữ liệu hợp lệ.");

        // Xóa các ngày có trong file này trước khi insert để tránh trùng
        var datesInFile = rows.Select(r => r.ReportDate)
            .Where(d => !string.IsNullOrEmpty(d))
            .Distinct()
            .ToList();
        var toDelete = await _sapoSaleRepo
            .GetAll()
            .Where(s => datesInFile.Contains(s.ReportDate))
            .ToListAsync();
        _sapoSaleRepo.RemoveRange(toDelete);

        foreach (var row in rows)
            await _sapoSaleRepo.AddAsync(row);

        // Log import
        var import = new SapoImport
        {
            ReportDate =
                datesInFile.Count > 1
                    ? $"{datesInFile.Min()} → {datesInFile.Max()}"
                    : (datesInFile.FirstOrDefault() ?? reportDate),
            ImportBatchId = batchId,
            UploadedBy = userId,
            UploadedAt = importedAt,
            RowCount = rows.Count,
            NetRevenue = rows.Sum(r => r.NetRevenue),
            Orders = rows.Sum(r => r.Orders),
            Qty = rows.Sum(r => r.Qty),
            Note = $"Import {rows.Count} dòng / {datesInFile.Count} ngày",
        };
        await _sapoImportRepo.AddAsync(import);
        await _unitOfWork.SaveChangesAsync();

        return await BuildDashboardAsync("all");
    }

    public async Task<bool> DeleteSapoImportAsync(string importBatchId, int userId)
    {
        var rows = await _sapoSaleRepo
            .GetAll()
            .Where(s => s.ImportBatchId == importBatchId)
            .ToListAsync();
        _sapoSaleRepo.RemoveRange(rows);

        var log = await _sapoImportRepo
            .GetAll()
            .FirstOrDefaultAsync(i => i.ImportBatchId == importBatchId);
        if (log != null)
            await _sapoImportRepo.DeleteAsync(log);

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    // ─── DASHBOARD ─────────────────────────────────────────────────────────────

    public async Task<SapoDashboardDTO> GetSapoDashboardAsync(string filterKey) =>
        await BuildDashboardAsync(filterKey ?? "all");

    private async Task<SapoDashboardDTO> BuildDashboardAsync(string filterKey)
    {
        var allSales = await _sapoSaleRepo.GetAll().AsNoTracking().ToListAsync();
        var filtered = FilterRows(allSales, filterKey);

        var byCode = filtered
            .GroupBy(r => r.ReportCode ?? r.BasketCode ?? r.Sku ?? "Chưa rõ")
            .Select(g => new SapoBucketDTO
            {
                Key = g.Key,
                Label = g.First().ReportName ?? g.Key,
                NetRevenue = g.Sum(r => r.NetRevenue),
                Revenue = g.Sum(r => r.Revenue),
                Orders = g.Sum(r => r.Orders),
                Qty = g.Sum(r => r.Qty),
            })
            .OrderByDescending(b => b.NetRevenue)
            .Take(50)
            .ToList();

        var byDay = filtered
            .GroupBy(r => r.ReportDate ?? "")
            .Select(g => new SapoBucketDTO
            {
                Key = g.Key,
                Label = g.Key,
                NetRevenue = g.Sum(r => r.NetRevenue),
                Revenue = g.Sum(r => r.Revenue),
                Orders = g.Sum(r => r.Orders),
                Qty = g.Sum(r => r.Qty),
            })
            .OrderBy(b => b.Key)
            .ToList();

        var byBranch = filtered
            .GroupBy(r => r.Branch ?? "Chưa rõ")
            .Select(g => new SapoBucketDTO
            {
                Key = g.Key,
                Label = g.Key,
                NetRevenue = g.Sum(r => r.NetRevenue),
                Revenue = g.Sum(r => r.Revenue),
                Orders = g.Sum(r => r.Orders),
                Qty = g.Sum(r => r.Qty),
            })
            .OrderByDescending(b => b.NetRevenue)
            .ToList();

        var recentImports = await _sapoImportRepo
            .GetAll()
            .AsNoTracking()
            .OrderByDescending(i => i.UploadedAt)
            .Take(30)
            .Select(i => new SapoImportDTO
            {
                Id = i.Id,
                ReportDate = i.ReportDate,
                ImportBatchId = i.ImportBatchId,
                UploadedBy = i.UploadedBy,
                UploadedAt = i.UploadedAt,
                RowCount = i.RowCount,
                NetRevenue = i.NetRevenue,
                Orders = i.Orders,
                Qty = i.Qty,
                Note = i.Note,
            })
            .ToListAsync();

        return new SapoDashboardDTO
        {
            FilterKey = filterKey,
            TotalNetRevenue = filtered.Sum(r => r.NetRevenue),
            TotalRevenue = filtered.Sum(r => r.Revenue),
            TotalOrders = filtered.Sum(r => r.Orders),
            TotalQty = filtered.Sum(r => r.Qty),
            ByCode = byCode,
            ByDay = byDay,
            ByBranch = byBranch,
            RecentImports = recentImports,
        };
    }

    private static List<SapoSale> FilterRows(List<SapoSale> rows, string filterKey)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        string? start = null,
            end = today;

        switch (filterKey)
        {
            case "today":
                start = today;
                break;
            case "yesterday":
                start = end = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
                break;
            case "7days":
                start = DateTime.UtcNow.AddDays(-6).ToString("yyyy-MM-dd");
                break;
            case "30days":
                start = DateTime.UtcNow.AddDays(-29).ToString("yyyy-MM-dd");
                break;
            case "month":
                start = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).ToString(
                    "yyyy-MM-dd"
                );
                break;
            default:
                return rows;
        }

        return rows.Where(r =>
            {
                var d = r.ReportDate ?? "";
                return string.Compare(d, start, StringComparison.Ordinal) >= 0
                    && string.Compare(d, end, StringComparison.Ordinal) <= 0;
            })
            .ToList();
    }

    private List<SapoSale> ParseSapoWorksheet(
        IXLWorksheet ws,
        string batchId,
        int userId,
        DateTime importedAt,
        string fallbackDate
    )
    {
        var rows = ws.RangeUsed()?.RowsUsed().ToList() ?? new();
        if (rows.Count < 2)
            return new();

        // Tìm header row có cột SKU
        int headerRowIndex = -1;
        Dictionary<string, int> colMap = new(StringComparer.OrdinalIgnoreCase);

        for (int i = 0; i < Math.Min(rows.Count, 35); i++)
        {
            var cells = rows[i].CellsUsed().ToList();
            foreach (var cell in cells)
            {
                var val = NormalizeHeader(cell.GetString());
                if (val == "ma sku" || val == "sku")
                {
                    headerRowIndex = i;
                    foreach (var c in rows[i].CellsUsed())
                    {
                        var h = NormalizeHeader(c.GetString());
                        if (!string.IsNullOrEmpty(h) && !colMap.ContainsKey(h))
                            colMap[h] = c.Address.ColumnNumber;
                    }
                    break;
                }
            }
            if (headerRowIndex >= 0)
                break;
        }

        if (headerRowIndex < 0)
            throw new BadRequestException(
                "File Sapo chưa đúng mẫu: không tìm thấy dòng tiêu đề có cột Mã SKU."
            );

        var result = new List<SapoSale>();

        for (int i = headerRowIndex + 1; i < rows.Count; i++)
        {
            var row = rows[i];
            var sku = GetCell(row, colMap, "ma sku", "sku");
            var productName = GetCell(row, colMap, "ten phien ban", "ten san pham", "ten hang");
            if (string.IsNullOrWhiteSpace(sku) && string.IsNullOrWhiteSpace(productName))
                continue;

            var rawDate = GetCell(row, colMap, "ngay", "thoi gian");
            var reportDate = NormalizeDate(rawDate) ?? fallbackDate;
            var branchText = GetCell(row, colMap, "chi nhanh", "cua hang", "kho") ?? "";
            var parsedCode = ParseBasketCode(productName ?? "") ?? ParseBasketCode(sku ?? "");
            var (reportCode, reportName) = ResolveCode(parsedCode, branchText);

            result.Add(
                new SapoSale
                {
                    ReportDate = reportDate,
                    Branch = branchText.Length > 0 ? branchText : "Tất cả",
                    ProductType = GetCell(row, colMap, "loai san pham", "nhom san pham"),
                    Sku = sku,
                    BasketCode = parsedCode,
                    ReportCode = reportCode,
                    ReportName = reportName,
                    ProductName = productName,
                    Price = GetDecimal(row, colMap, "don gia ban", "gia ban"),
                    Qty = GetDecimal(row, colMap, "sl hang thuc ban", "so luong", "sl"),
                    Orders = (int)GetDecimal(row, colMap, "sl don hang", "don hang"),
                    Revenue = GetDecimal(row, colMap, "doanh thu", "thanh tien"),
                    NetRevenue =
                        GetDecimal(row, colMap, "doanh thu thuan") > 0
                            ? GetDecimal(row, colMap, "doanh thu thuan")
                            : GetDecimal(row, colMap, "doanh thu", "thanh tien"),
                    ImportBatchId = batchId,
                    UploadedBy = userId,
                    UploadedAt = importedAt,
                    ImportedAt = importedAt,
                }
            );
        }

        return result;
    }

    private static string NormalizeHeader(string s) =>
        System.Text.RegularExpressions.Regex.Replace(
            RemoveDiacritics(s ?? "").ToLower().Trim(),
            @"\s+",
            " "
        );

    private static string RemoveDiacritics(string s)
    {
        var normalized = s.Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder();
        foreach (var c in normalized)
        {
            var cat = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
            if (cat != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().Normalize(System.Text.NormalizationForm.FormC);
    }

    private static string? GetCell(IXLRangeRow row, Dictionary<string, int> colMap, params string[] keys)
    {
        foreach (var key in keys)
            if (colMap.TryGetValue(key, out var col))
            {
                var val = row.Cell(col).GetString().Trim();
                if (!string.IsNullOrEmpty(val))
                    return val;
            }
        return null;
    }

    private static decimal GetDecimal(
        IXLRangeRow row,
        Dictionary<string, int> colMap,
        params string[] keys
    )
    {
        foreach (var key in keys)
            if (colMap.TryGetValue(key, out var col))
                try
                {
                    return row.Cell(col).GetValue<decimal>();
                }
                catch { }
        return 0;
    }

    private static string? ParseBasketCode(string text)
    {
        var m = System.Text.RegularExpressions.Regex.Match(
            text,
            @"\b([A-Z]{2,5}\d{2,6}[A-Z]?)\b",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase
        );
        return m.Success ? m.Value.ToUpper() : null;
    }

    private (string reportCode, string reportName) ResolveCode(string? code, string branch)
    {
        if (string.IsNullOrEmpty(code))
            return ("", "");
        var mapping =
            _mappingRepo.GetAll().FirstOrDefault(m => m.Code == code && m.BranchId != null)
            ?? _mappingRepo.GetAll().FirstOrDefault(m => m.Code == code);
        if (mapping != null)
            return (mapping.BaseCode, $"{mapping.BaseCode} - {mapping.BasketName}");
        return (code, code);
    }

    private static string? NormalizeDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        if (
            DateTime.TryParseExact(
                raw,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var d1
            )
        )
            return d1.ToString("yyyy-MM-dd");
        if (
            DateTime.TryParseExact(
                raw,
                "dd/MM/yyyy",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var d2
            )
        )
            return d2.ToString("yyyy-MM-dd");
        if (
            DateTime.TryParseExact(
                raw,
                "d/M/yyyy",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var d3
            )
        )
            return d3.ToString("yyyy-MM-dd");
        return null;
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
            BasketCodeOrName = dto.BasketCodeOrName.Trim(),
            Reason = dto.Reason.Trim(),
            Note = dto.Note,
            Priority = dto.Priority ?? "normal",
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
            FrontImageUrl = r.FrontImageUrl,
            BackImageUrl = r.BackImageUrl,
            Status = r.Status,
            HandledBy = r.HandledBy,
            HandledByName =
                r.HandledBy.HasValue && users.TryGetValue(r.HandledBy.Value, out var hn)
                    ? hn
                    : null,
            HandledAt = r.HandledAt,
            ResultNote = r.ResultNote,
            CreatedBy = r.CreatedBy,
            CreatedByName =
                r.CreatedBy.HasValue && users.TryGetValue(r.CreatedBy.Value, out var cn)
                    ? cn
                    : null,
            CreatedAt = r.CreatedAt,
        };
}
