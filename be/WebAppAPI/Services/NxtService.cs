using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models;

namespace WebAppAPI.Services;

public interface INxtService
{
    Task<IEnumerable<NxtOverviewRowDto>> GetOverviewRowsAsync(NxtOverviewFilterDto filter);
    Task<NxtOverviewKpisDto> GetOverviewKpisAsync(NxtOverviewFilterDto filter);
    Task<IEnumerable<NxtCheckDayDto>> GetCheckDaysAsync();
    Task<NxtOverviewRowDto> InlineEditAsync(NxtInlineEditRequestDto dto);
    Task<NxtSoftDeleteResultDto> SoftDeleteRowsAsync(NxtSoftDeleteRequestDto dto);
    Task<NxtApplyBatchResultDto> ApplyGiftInAsync(NxtApplyBatchRequestDto dto);
    Task<NxtApplyBatchResultDto> ApplyStockAsync(NxtApplyStockRequestDto dto);
    Task<NxtApplyBatchResultDto> ApplyCancelBasketAsync(NxtApplyBatchRequestDto dto);
    Task<NxtApplyWrongCodeResultDto> ApplyWrongCodeAsync(NxtApplyWrongCodeRequestDto dto);
    Task RollbackLogAsync(long logId);
    Task<NxtEditQtyResultDto> ApplyEditQtyAsync(NxtEditQtyRequestDto dto);
    Task<IEnumerable<NxtSapoPendingDto>> GetSapoPendingAsync();
    Task<NxtSapoPendingDto> CreateSapoPendingAsync(NxtSapoPendingCreateRequestDto dto);
    Task<NxtSapoPendingDto> CompleteSapoPendingAsync(int id, NxtSapoPendingCompleteRequestDto dto);
    Task DeleteSapoPendingAsync(int id, string? loginCode, string? displayName);
}

// Toàn bộ công thức/luật trong file này port 1:1 từ fe/web-app-frontend/public/js/nxt-core.js
// — KHÔNG được đổi số học so với bản JS. Đây là service backend đầu tiên của XNT (trước đây
// NxtController.cs chỉ có CRUD thuần, mọi logic nghiệp vụ sống hoàn toàn ở client).
// Theo đúng convention 3 lớp Repository-Service-Controller của dự án (xem VppItemService.cs) —
// inject repo theo entity + IUnitOfWork để SaveChangesAsync, KHÔNG inject thẳng DbContext.
public class NxtService : INxtService
{
    private readonly INxtRowRepository _nxtRowRepo;
    private readonly INxtSapoPendingRepository _sapoPendingRepo;
    private readonly IUserRepository _userRepo;
    private readonly IActivityLogRepository _activityLogRepo;
    private readonly IUnitOfWork _uow;

    public NxtService(
        INxtRowRepository nxtRowRepo,
        INxtSapoPendingRepository sapoPendingRepo,
        IUserRepository userRepo,
        IActivityLogRepository activityLogRepo,
        IUnitOfWork uow
    )
    {
        _nxtRowRepo = nxtRowRepo;
        _sapoPendingRepo = sapoPendingRepo;
        _userRepo = userRepo;
        _activityLogRepo = activityLogRepo;
        _uow = uow;
    }

    // Repo trả entity AsNoTracking() — mỗi lần query là 1 bản mới, tách rời khỏi change tracker.
    // Nếu 1 method xử lý NHIỀU dòng trong 1 vòng lặp (vd ApplyStockAsync) và có cascade sang dòng
    // khác (SetNextDayOpeningFromActualAsync ghi vào ngày N+1), CÓ THỂ chạm cùng 1 khóa
    // (closeDate,branch,itemCode) hai lần trong cùng 1 request — nếu gọi SingleOrDefaultAsync +
    // Update() riêng rẽ mỗi lần, EF Core sẽ ném "entity already being tracked" vì 2 instance khác
    // nhau cùng khóa chính. Cache theo request đảm bảo CÙNG 1 object được tái sử dụng khi chạm lại
    // đúng khóa đó trong cùng 1 lần gọi service.
    // Tìm-hoặc-không (KHÔNG tự tạo) — dùng cho các thao tác chỉ được sửa dòng đã tồn tại (vd xóa
    // mềm, kiểm tra dòng đối ứng) mà không muốn vô tình tạo dòng mới.
    private async Task<NxtRow?> FindAndTrackRowAsync(
        Dictionary<string, NxtRow> cache,
        string closeDate,
        string branch,
        string itemCode
    )
    {
        var key = $"{closeDate}||{branch}||{itemCode}";
        if (cache.TryGetValue(key, out var cached)) return cached;

        var row = await _nxtRowRepo.SingleOrDefaultAsync(x =>
            x.CloseDate == closeDate && x.Branch == branch && x.ItemCode == itemCode
        );
        if (row != null)
        {
            await _nxtRowRepo.Update(row); // no-tracking, cần Update() tường minh
            cache[key] = row;
        }
        return row;
    }

    // Tìm-hoặc-tạo — dùng cho các thao tác được phép tự sinh dòng mới (nạp Gói ra/Tồn CN, cascade
    // tồn đầu ngày mai...), đúng cơ chế "hệ thống tự tạo dòng" của rows/batch cũ.
    private async Task<NxtRow> GetOrTrackRowAsync(
        Dictionary<string, NxtRow> cache,
        string closeDate,
        string branch,
        string itemCode
    )
    {
        var row = await FindAndTrackRowAsync(cache, closeDate, branch, itemCode);
        if (row != null) return row;

        row = new NxtRow { CloseDate = closeDate, Branch = branch, ItemCode = itemCode };
        await _nxtRowRepo.AddAsync(row);
        cache[$"{closeDate}||{branch}||{itemCode}"] = row;
        return row;
    }

    // ─── Công thức lệch (nxt-core.js: calcExpectedStock/calcCompareStock/calcDiff) ───

    public static decimal CalcExpectedStock(NxtRow r) =>
        r.OpeningStock + r.GiftIn + r.ReceiveBranch - r.TransferBranch - r.SapoSold - r.CancelBasket + r.Adjustment;

    public static decimal CalcCompareStock(NxtRow r) => r.ActualStock - r.SoldNotPicked;

    public static decimal CalcDiff(NxtRow r) => CalcCompareStock(r) - CalcExpectedStock(r);

    public static bool HasInsufficientTransferSource(NxtRow r) => CalcExpectedStock(r) < 0 && r.TransferBranch > 0;

    // ─── getStockStatusType — phân loại DTT/CTT theo stockStatus ───
    public static string GetStockStatusType(string? stockStatus)
    {
        var plain = RemoveAccent(stockStatus ?? "").ToLowerInvariant();
        if (plain.Contains("ctt") || plain.Contains("chua thanh toan")) return "CTT";
        if (
            plain.Contains("dtt")
            || plain.Contains("da thanh toan")
            || plain.Contains("cho lay")
            || plain.Contains("chua lay")
            || plain.Contains("cho giao")
            || plain.Contains("da ban chua lay")
        )
            return "DTT";
        return "";
    }

    // ─── isInactiveRow / shouldHideInactive — 1 dòng coi là "trống" nếu cả 11 field đều = 0 ───
    public static bool IsInactiveRow(NxtRow r)
    {
        if (r.Inactive) return true;
        return r.OpeningStock == 0
            && r.GiftIn == 0
            && r.ReceiveBranch == 0
            && r.TransferBranch == 0
            && r.CancelBasket == 0
            && r.SapoSold == 0
            && r.Adjustment == 0
            && r.ActualStock == 0
            && r.SoldNotPicked == 0
            && r.Revenue == 0
            && r.OrderCount == 0;
    }

    public static bool HasTransferNotes(NxtRow r) =>
        !string.IsNullOrWhiteSpace(r.TransferNotes) && r.TransferNotes != "[]" && r.TransferNotes != "null";

    // removeAccent — NFD normalize + strip diacritics + đ/Đ riêng (không tự mất qua NFD)
    public static string RemoveAccent(string str)
    {
        if (string.IsNullOrEmpty(str)) return "";
        var normalized = str.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC).Replace('đ', 'd').Replace('Đ', 'D');
    }

    // ─── guessDiffReason — heuristic gợi ý nguyên nhân lệch, giữ NGUYÊN VĂN mọi câu tiếng Việt ───
    public static string GuessDiffReason(NxtRow r)
    {
        var diff = CalcDiff(r);
        if (diff == 0) return "";

        var code = (r.ItemCode ?? "").ToUpperInvariant();
        var hints = new List<string>();
        var opening = r.OpeningStock;
        var giftIn = r.GiftIn;
        var receive = r.ReceiveBranch;
        var transfer = r.TransferBranch;
        var cancel = r.CancelBasket;
        var sapo = r.SapoSold;
        var actual = r.ActualStock;
        var dtt = r.SoldNotPicked;
        var hasTransferNote = HasTransferNotes(r);

        if (Regex.IsMatch(code, "^(SON|TEMP|TMP)"))
            hints.Add("Mã tạm/SON: kiểm đổi mã");

        if (opening == 0 && sapo > 0 && giftIn == 0 && receive == 0)
            hints.Add("Có bán nhưng không có tồn đầu/gói ra: kiểm mã bán hoặc thiếu tồn đầu");

        if (actual > 0 && opening == 0 && giftIn == 0 && receive == 0)
            hints.Add("Có tồn thực tế nhưng thiếu nguồn vào: kiểm tồn đầu/gói ra/nhận CN");

        if (CalcExpectedStock(r) < 0 && transfer > 0)
            hints.Add("Chuyển CN thiếu nguồn: kiểm tồn đầu/gói ra/nhận CN");
        else if (hasTransferNote || transfer != 0 || receive != 0)
            hints.Add("Có luân chuyển: đối chiếu gửi/nhận CN");

        if (diff > 0 && giftIn == 0 && receive == 0 && opening == 0)
            hints.Add("Dư: hay thiếu Gói ra hoặc Nhận CN");

        if (diff < 0 && sapo == 0 && cancel == 0 && transfer == 0)
            hints.Add("Thiếu: kiểm Sapo bán, Hủy giỏ hoặc Chuyển CN");

        if (sapo > 0 && actual > 0 && dtt == 0)
            hints.Add("Bán rồi vẫn còn tại quầy: nếu đã thanh toán/chưa lấy thì gắn DTT");

        if (hints.Count == 0)
            hints.Add(diff > 0 ? "Dư nhẹ: kiểm nguồn vào" : "Thiếu nhẹ: kiểm nguồn ra");

        return string.Join(" · ", hints.Take(2)) + " — app chỉ nghi thôi 😄";
    }

    // ─── displayToIso / addDaysToDisplayDate — format DD/MM/YYYY <-> ISO ───
    public static string DisplayToIso(string? displayDate)
    {
        if (string.IsNullOrEmpty(displayDate)) return "";
        if (displayDate.Contains('-')) return displayDate;
        var parts = displayDate.Split('/');
        if (parts.Length != 3) return displayDate;
        return $"{parts[2]}-{parts[1].PadLeft(2, '0')}-{parts[0].PadLeft(2, '0')}";
    }

    public static string AddDaysToDisplayDate(string displayDate, int days)
    {
        var iso = DisplayToIso(displayDate);
        if (!DateTime.TryParseExact(iso, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var date))
            return "";
        date = date.AddDays(days);
        return date.ToString("dd/MM/yyyy");
    }

    private static bool IsDateInRange(string displayDate, string? isoFrom, string? isoTo)
    {
        var iso = DisplayToIso(displayDate);
        if (!string.IsNullOrEmpty(isoFrom) && string.Compare(iso, isoFrom, StringComparison.Ordinal) < 0)
            return false;
        if (!string.IsNullOrEmpty(isoTo) && string.Compare(iso, isoTo, StringComparison.Ordinal) > 0)
            return false;
        return true;
    }

    // ─── getRowsByFilter port — lọc active + date range + branch + status ───
    private async Task<List<NxtRow>> GetActiveFilteredRowsAsync(NxtOverviewFilterDto filter)
    {
        var rows = await _nxtRowRepo.GetAllAsync();
        var active = rows.Where(r => !IsInactiveRow(r));

        active = active.Where(r => IsDateInRange(r.CloseDate, filter.DateFrom, filter.DateTo));

        if (!string.IsNullOrWhiteSpace(filter.Branch) && filter.Branch != "Tất cả")
            active = active.Where(r => r.Branch == filter.Branch);

        if (filter.Status == "diff")
            active = active.Where(r => CalcDiff(r) != 0);
        else if (filter.Status == "match")
            active = active.Where(r => CalcDiff(r) == 0);
        else if (filter.Status == "soldNotPicked")
            active = active.Where(r => r.SoldNotPicked > 0);

        return active
            .OrderBy(r => r.CloseDate)
            .ThenBy(r => r.Branch)
            .ThenBy(r => r.ItemCode)
            .ToList();
    }

    public NxtOverviewRowDto ToOverviewDto(NxtRow r)
    {
        var expected = CalcExpectedStock(r);
        var compare = CalcCompareStock(r);
        var diff = CalcDiff(r);
        return new NxtOverviewRowDto
        {
            Id = r.Id,
            CloseDate = r.CloseDate,
            Branch = r.Branch,
            ItemCode = r.ItemCode,
            OpeningStock = r.OpeningStock,
            OpeningSource = r.OpeningSource ?? "",
            GiftIn = r.GiftIn,
            ReceiveBranch = r.ReceiveBranch,
            TransferBranch = r.TransferBranch,
            CancelBasket = r.CancelBasket,
            SapoSold = r.SapoSold,
            Adjustment = r.Adjustment,
            ActualStock = r.ActualStock,
            SoldNotPicked = r.SoldNotPicked,
            StockStatus = r.StockStatus ?? "",
            StockType = GetStockStatusType(r.StockStatus),
            Revenue = r.Revenue,
            OrderCount = r.OrderCount,
            TransferNotes = string.IsNullOrWhiteSpace(r.TransferNotes)
                ? new List<object>()
                : JsonSerializer.Deserialize<List<object>>(r.TransferNotes) ?? new List<object>(),
            Inactive = r.Inactive,
            CompareStock = compare,
            ExpectedStock = expected,
            Diff = diff,
            DiffReasonHint = GuessDiffReason(r),
            HasInsufficientTransferSource = HasInsufficientTransferSource(r),
            UpdatedAt = r.UpdatedAt,
        };
    }

    public async Task<IEnumerable<NxtOverviewRowDto>> GetOverviewRowsAsync(NxtOverviewFilterDto filter)
    {
        var rows = await GetActiveFilteredRowsAsync(filter);
        return rows.Select(ToOverviewDto);
    }

    // ─── updateKpis port — 12 chỉ số KPI tính trên rows đã lọc ───
    public async Task<NxtOverviewKpisDto> GetOverviewKpisAsync(NxtOverviewFilterDto filter)
    {
        var rows = await GetActiveFilteredRowsAsync(filter);
        var kpis = new NxtOverviewKpisDto();
        foreach (var r in rows)
        {
            kpis.OpeningStock += r.OpeningStock;
            kpis.GiftIn += r.GiftIn;
            kpis.ReceiveBranch += r.ReceiveBranch;
            kpis.TransferBranch += r.TransferBranch;
            kpis.CancelBasket += r.CancelBasket;
            kpis.SapoSold += r.SapoSold;
            kpis.ActualStock += r.ActualStock;
            kpis.SoldNotPicked += r.SoldNotPicked;
            kpis.Revenue += r.Revenue;
            kpis.OrderCount += r.OrderCount;
            if (CalcDiff(r) != 0) kpis.DiffRows += 1;
        }
        kpis.LatestSapoDate = await GetLatestSapoDateAsync();
        return kpis;
    }

    // ─── getLatestSapoDate port — dòng active gần nhất có phát sinh Sapo (sold/revenue/orderCount) ───
    private async Task<string> GetLatestSapoDateAsync()
    {
        var rows = await _nxtRowRepo.GetAllAsync();
        var latest = rows
            .Where(r => !IsInactiveRow(r) && (r.SapoSold != 0 || r.Revenue != 0 || r.OrderCount != 0))
            .Select(r => r.CloseDate)
            .Where(d => !string.IsNullOrEmpty(d))
            .OrderByDescending(d => DisplayToIso(d))
            .FirstOrDefault();
        return latest ?? "Chưa nạp";
    }

    // ─── buildCheckDays port — "Ngày cần kiểm tra": dùng TOÀN BỘ dòng (không áp filter Tổng quan) ───
    public async Task<IEnumerable<NxtCheckDayDto>> GetCheckDaysAsync()
    {
        var rows = await _nxtRowRepo.GetAllAsync();
        var map = new Dictionary<string, NxtCheckDayDto>();
        foreach (var r in rows)
        {
            if (IsInactiveRow(r)) continue;
            var diff = CalcDiff(r);
            if (diff == 0) continue;
            var key = $"{r.CloseDate}__{r.Branch}";
            if (!map.TryGetValue(key, out var day))
            {
                day = new NxtCheckDayDto { Date = r.CloseDate, Branch = r.Branch };
                map[key] = day;
            }
            day.DiffRows += 1;
            day.TotalDiff += diff;
            day.AbsDiff += Math.Abs(diff);
            day.Codes.Add(new NxtCheckDayCodeDto { Code = r.ItemCode, Diff = diff });
        }
        return map.Values
            .OrderByDescending(d => DisplayToIso(d.Date))
            .ThenByDescending(d => d.AbsDiff)
            .ToList();
    }

    private static readonly Dictionary<string, string> EditFieldLabels = new()
    {
        ["giftIn"] = "Gói ra",
        ["receiveBranch"] = "Nhận CN",
        ["transferBranch"] = "Chuyển CN",
        ["cancelBasket"] = "Hủy giỏ",
        ["actualStock"] = "Tồn thực tế",
        ["soldNotPicked"] = "Bán chưa lấy",
        ["adjustment"] = "Điều chỉnh",
    };

    private async Task<int?> ResolveUserIdAsync(string? loginCode)
    {
        if (string.IsNullOrWhiteSpace(loginCode)) return null;
        var user = await _userRepo.GetAll().FirstOrDefaultAsync(u => u.StaffCode == loginCode);
        return user?.Id;
    }

    // ─── confirmInlineEdit port — nút "Sửa" trực tiếp trên Tổng quan ───
    // Chụp giá trị CŨ trước khi ghi đè, ghi 1 log riêng cho MỖI field thực sự thay đổi (không gộp
    // chung 1 log — để Truy vết khớp đúng field). Nếu actualStock/soldNotPicked đổi, cascade tồn
    // đầu ngày kế tiếp = actualStock - soldNotPicked (đã trừ DTT — xem giải thích ở
    // SetNextDayOpeningFromActualAsync). Lỗi trả qua exception (GlobalExceptionMiddleware xử lý),
    // không tự dựng ResponseValue lỗi thủ công — đúng convention chung của dự án.
    public async Task<NxtOverviewRowDto> InlineEditAsync(NxtInlineEditRequestDto dto)
    {
        var row = await _nxtRowRepo.SingleOrDefaultAsync(r =>
            r.CloseDate == dto.CloseDate && r.Branch == dto.Branch && r.ItemCode == dto.ItemCode
        );
        if (row == null)
            throw new NotFoundException("Không tìm thấy dòng dữ liệu");
        await _nxtRowRepo.Update(row); // no-tracking, cần Update() tường minh
        // Seed cache với dòng đã lấy để cascade (nếu có) không query/Update() lại lần 2 gây trùng
        // tracking — xem giải thích đầy đủ ở GetOrTrackRowAsync.
        var cache = new Dictionary<string, NxtRow> { [$"{dto.CloseDate}||{dto.Branch}||{dto.ItemCode}"] = row };

        // OCC: repo trả entity no-tracking, so sánh UpdatedAt client gửi lên với bản hiện tại
        // trong DB — nếu khác nghĩa là có thao tác khác đã ghi đè ở giữa, không cho ghi tiếp
        // (Lost Update). Ném ConflictException — middleware tự trả 409 kèm message này.
        if (
            dto.ExpectedUpdatedAt.HasValue
            && row.UpdatedAt.HasValue
            && dto.ExpectedUpdatedAt.Value != row.UpdatedAt.Value
        )
        {
            throw new ConflictException(
                "Dữ liệu đã bị thay đổi bởi thao tác khác — vui lòng tải lại trước khi lưu."
            );
        }

        var oldValues = new Dictionary<string, decimal>
        {
            ["giftIn"] = row.GiftIn,
            ["receiveBranch"] = row.ReceiveBranch,
            ["transferBranch"] = row.TransferBranch,
            ["cancelBasket"] = row.CancelBasket,
            ["adjustment"] = row.Adjustment,
            ["actualStock"] = row.ActualStock,
            ["soldNotPicked"] = row.SoldNotPicked,
        };
        var newValues = new Dictionary<string, decimal>
        {
            ["giftIn"] = dto.GiftIn,
            ["receiveBranch"] = dto.ReceiveBranch,
            ["transferBranch"] = dto.TransferBranch,
            ["cancelBasket"] = dto.CancelBasket,
            ["adjustment"] = dto.Adjustment,
            ["actualStock"] = dto.ActualStock,
            ["soldNotPicked"] = dto.SoldNotPicked,
        };
        var changedFields = oldValues.Keys.Where(k => oldValues[k] != newValues[k]).ToList();

        row.GiftIn = dto.GiftIn;
        row.ReceiveBranch = dto.ReceiveBranch;
        row.TransferBranch = dto.TransferBranch;
        row.CancelBasket = dto.CancelBasket;
        row.Adjustment = dto.Adjustment;
        row.ActualStock = dto.ActualStock;
        row.SoldNotPicked = dto.SoldNotPicked;
        row.UpdatedAt = DateTime.UtcNow;

        var userId = await ResolveUserIdAsync(dto.LoginCode);
        foreach (var field in changedFields)
        {
            var label = EditFieldLabels[field];
            await _activityLogRepo.AddAsync(
                new ActivityLog
                {
                    UserId = userId,
                    StaffCode = dto.LoginCode,
                    Action = "Sửa SL",
                    TableName = "nxt_rows",
                    CreatedAt = DateTime.UtcNow,
                    NewData = JsonSerializer.Serialize(
                        new
                        {
                            closeDate = dto.CloseDate,
                            branch = dto.Branch,
                            itemCode = dto.ItemCode,
                            source = label,
                            rightCode = dto.ItemCode,
                            qty = newValues[field],
                            status = row.StockStatus,
                            detail = $"{label}: {oldValues[field]} → {newValues[field]}",
                            userName = dto.UserName ?? "",
                            note = "Sửa trực tiếp từ bảng Tổng quan",
                        }
                    ),
                }
            );
        }

        if (changedFields.Contains("actualStock") || changedFields.Contains("soldNotPicked"))
        {
            await SetNextDayOpeningFromActualAsync(cache, dto.CloseDate, dto.Branch, dto.ItemCode, dto.ActualStock, dto.SoldNotPicked);
        }

        await _uow.SaveChangesAsync();
        // Reload để lấy đúng giá trị UpdatedAt đã bị Postgres cắt về độ chính xác micro-giây (xem
        // giải thích đầy đủ ở tài liệu commit trước) — nếu không, lần OCC kế tiếp sẽ tự báo xung
        // đột giả với chính dòng vừa lưu. IUnitOfWork.GetDbContext() dùng đúng cho thao tác thuần
        // EF này (repository không có API tương đương).
        await _uow.GetDbContext().Entry(row).ReloadAsync();

        return ToOverviewDto(row);
    }

    // ─── setNextDayOpeningFromActual port ───
    // Nguyên tắc vận hành: tồn đầu ngày sau lấy theo Tồn thực tế cuối ngày trước, TRỪ phần DTT
    // (đã bán/chưa lấy) — vì DTT về bản chất kế toán coi như đã bán xong ngày hôm đó rồi, không còn
    // là "tồn kỳ vọng" cho ngày sau nữa. Nếu khách vẫn chưa lấy ở ngày sau, nhân viên dán "dtt" lại
    // cho ngày đó khi kiểm Tồn CN — hệ thống sẽ tiếp tục tự cân bằng, không cần biết trước bao nhiêu
    // ngày mới lấy. Nếu không trừ, ngày khách thực sự lấy hàng sẽ tự nhiên hiện Lệch ảo (thiếu 1).
    // CTT không bị trừ ở đây vì CTT chưa được coi là đã bán, vẫn là tồn thật.
    // Khác với /rows/inline cũ (chỉ UPDATE), hàm này find-or-create — nếu dòng ngày kế tiếp chưa
    // tồn tại thì tự tạo (đúng cơ chế "hệ thống tự tạo dòng" đã port sang rows/batch).
    private async Task SetNextDayOpeningFromActualAsync(
        Dictionary<string, NxtRow> cache,
        string closeDate,
        string branch,
        string itemCode,
        decimal actualStock,
        decimal soldNotPicked
    )
    {
        var nextDate = AddDaysToDisplayDate(closeDate, 1);
        if (string.IsNullOrEmpty(nextDate)) return;

        var nextRow = await GetOrTrackRowAsync(cache, nextDate, branch, itemCode);

        nextRow.OpeningStock = actualStock - soldNotPicked;
        nextRow.OpeningSource =
            $"Tự lấy từ tồn thực tế cuối ngày {closeDate}" + (soldNotPicked != 0 ? $" (đã trừ {soldNotPicked} DTT)" : "");
        nextRow.Inactive = false;
    }

    // ─── deleteSelectedRows / _applyRowSoftDelete port ───
    // Xóa mềm: zero hóa 9 field tồn kho, xóa openingSource/stockStatus, Inactive=true. Nếu
    // actualStock trước đó khác 0 VÀ dòng ngày kế tiếp có openingSource khớp đúng chuỗi tự động
    // sinh từ chính dòng này, xóa luôn tồn đầu ngày kế đó (tránh để lại tồn đầu "mồ côi" tham chiếu
    // tới 1 dòng đã bị xóa).
    public async Task<NxtSoftDeleteResultDto> SoftDeleteRowsAsync(NxtSoftDeleteRequestDto dto)
    {
        var deletedCount = 0;
        var closeDates = new List<string>();
        var cache = new Dictionary<string, NxtRow>();

        foreach (var key in dto.Keys)
        {
            var row = await FindAndTrackRowAsync(cache, key.CloseDate, key.Branch, key.ItemCode);
            if (row == null) continue;

            var prevActual = row.ActualStock;
            row.OpeningStock = 0;
            row.GiftIn = 0;
            row.ReceiveBranch = 0;
            row.TransferBranch = 0;
            row.CancelBasket = 0;
            row.SapoSold = 0;
            row.Adjustment = 0;
            row.ActualStock = 0;
            row.SoldNotPicked = 0;
            row.OpeningSource = "";
            row.StockStatus = "";
            row.Inactive = true;
            row.UpdatedAt = DateTime.UtcNow;
            deletedCount++;
            closeDates.Add(key.CloseDate);

            if (prevActual != 0)
            {
                var nextDate = AddDaysToDisplayDate(key.CloseDate, 1);
                var expectedSource = $"Tự lấy từ tồn thực tế cuối ngày {key.CloseDate}";
                var nextRow = await FindAndTrackRowAsync(cache, nextDate, key.Branch, key.ItemCode);
                if (nextRow != null && nextRow.OpeningSource != null && nextRow.OpeningSource.StartsWith(expectedSource))
                {
                    nextRow.OpeningStock = 0;
                    nextRow.OpeningSource = "";
                    nextRow.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        if (deletedCount > 0)
        {
            var closeDateSummary = string.Join(", ", closeDates.Distinct());
            if (closeDateSummary.Length > 40) closeDateSummary = closeDateSummary[..40];
            var branches = string.Join("/", dto.Keys.Select(k => k.Branch).Distinct());
            var detail = string.Join(", ", dto.Keys.Take(deletedCount).Select(k => $"{k.CloseDate}|{k.ItemCode}:0"));

            var userId = await ResolveUserIdAsync(dto.LoginCode);
            await _activityLogRepo.AddAsync(
                new ActivityLog
                {
                    UserId = userId,
                    StaffCode = dto.LoginCode,
                    Action = "Xóa dòng",
                    TableName = "nxt_rows",
                    CreatedAt = DateTime.UtcNow,
                    NewData = JsonSerializer.Serialize(
                        new
                        {
                            closeDate = closeDateSummary,
                            branch = branches,
                            qty = deletedCount,
                            note = $"Xóa mềm {deletedCount} dòng từ Tổng quan",
                            userName = dto.UserName ?? "",
                            status = "Đã xóa",
                            detail,
                        }
                    ),
                }
            );
        }

        await _uow.SaveChangesAsync();

        return new NxtSoftDeleteResultDto { DeletedCount = deletedCount };
    }

    // ─── setupGiftIn "Lưu gói ra" port ───
    // setupGiftIn/setupCancel "Lưu" port — cả 2 tab giống hệt nhau về mặt cấu trúc (dán text →
    // parse-preview ở client → gửi xuống patch CỘNG DỒN vào đúng 1 field + ghi 1 log gộp), chỉ
    // khác field đích và loại log — gộp chung 1 hàm generic thay vì lặp lại toàn bộ thân hàm.
    private enum NxtBatchField
    {
        GiftIn,
        CancelBasket,
    }

    // Client parse-preview text ở frontend (parseCodeQtyText — thuần hiển thị, không phải nghiệp
    // vụ dữ liệu) rồi gửi xuống ĐÃ ĐỌC XONG từng dòng {closeDate, branch, itemCode, qty}; backend
    // là nơi duy nhất áp dụng vào DB — cộng dồn vào field đích (đúng semantics patch cộng dồn của
    // upsertDashboardRow cũ, KHÔNG phải ghi đè) và ghi 1 log gộp (đúng makeOpLog cũ).
    private async Task<NxtApplyBatchResultDto> ApplyFieldBatchAsync(
        NxtApplyBatchRequestDto dto,
        NxtBatchField field,
        string logType
    )
    {
        if (dto.Rows == null || dto.Rows.Count == 0)
            throw new BadRequestException("Không có dòng dữ liệu hợp lệ để lưu.");

        // Cache theo request: nếu 2 dòng trong cùng batch trùng khóa (closeDate,branch,itemCode —
        // vd dán cùng 1 mã 2 lần), phải cộng dồn vào ĐÚNG 1 entity thay vì query/Update() riêng lẻ
        // 2 lần (EF Core sẽ ném lỗi "already tracked" nếu 2 instance khác nhau cùng khóa chính).
        var cache = new Dictionary<string, NxtRow>();
        foreach (var r in dto.Rows)
        {
            var row = await GetOrTrackRowAsync(cache, r.CloseDate, r.Branch, r.ItemCode);
            switch (field)
            {
                case NxtBatchField.GiftIn:
                    row.GiftIn += r.Qty;
                    break;
                case NxtBatchField.CancelBasket:
                    row.CancelBasket += r.Qty;
                    break;
            }
            if (r.Qty != 0) row.Inactive = false;
        }

        await _activityLogRepo.AddAsync(await BuildBatchLogAsync(dto, logType));
        await _uow.SaveChangesAsync();

        return new NxtApplyBatchResultDto { RowCount = dto.Rows.Count };
    }

    public Task<NxtApplyBatchResultDto> ApplyGiftInAsync(NxtApplyBatchRequestDto dto) =>
        ApplyFieldBatchAsync(dto, NxtBatchField.GiftIn, "Nạp Gói ra");

    public Task<NxtApplyBatchResultDto> ApplyCancelBasketAsync(NxtApplyBatchRequestDto dto) =>
        ApplyFieldBatchAsync(dto, NxtBatchField.CancelBasket, "Nạp Hủy giỏ");

    // makeOpLog port — 1 log gộp cho cả batch, detail format "{closeDate}|{itemCode}:{qty}" nối
    // bằng ", " — đúng format các nơi khác (rollbackLog, Truy vết) đang parse.
    private async Task<ActivityLog> BuildBatchLogAsync(NxtApplyBatchRequestDto dto, string actionType)
    {
        var dates = string.Join(", ", dto.Rows.Select(r => r.CloseDate).Distinct());
        if (dates.Length > 40) dates = dates[..40];
        var branches = string.Join("/", dto.Rows.Select(r => r.Branch).Distinct());
        var qtyTotal = dto.Rows.Sum(r => Math.Abs(r.Qty));
        var detail = string.Join(", ", dto.Rows.Select(r => $"{r.CloseDate}|{r.ItemCode}:{r.Qty}"));
        var userId = await ResolveUserIdAsync(dto.LoginCode);

        return new ActivityLog
        {
            UserId = userId,
            StaffCode = dto.LoginCode,
            Action = actionType,
            TableName = "nxt_rows",
            CreatedAt = DateTime.UtcNow,
            NewData = JsonSerializer.Serialize(
                new
                {
                    closeDate = dates,
                    branch = branches,
                    qty = qtyTotal,
                    note = $"{dto.Rows.Count} dòng",
                    userName = dto.UserName ?? "",
                    status = "Đã áp dụng",
                    detail,
                }
            ),
        };
    }

    // ─── setupStock "Lưu tồn CN" port ───
    // Frontend đã parse-preview + gộp dòng (mergeStockRows) và tách sẵn dòng nào là "Chuyển chi
    // nhánh" — backend chỉ áp dụng đúng 2 luồng: (1) dòng tồn thường → SET (không cộng dồn, vì đây
    // là số đếm thực tế) actualStock/soldNotPicked/stockStatus + cascade tồn đầu ngày mai (dùng lại
    // SetNextDayOpeningFromActualAsync đã có từ Sửa nhanh Tổng quan); (2) dòng chuyển CN → cộng dồn
    // transferBranch (chi nhánh gửi) + receiveBranch (chi nhánh nhận) + ghi transferNotes cả 2 phía.
    public async Task<NxtApplyBatchResultDto> ApplyStockAsync(NxtApplyStockRequestDto dto)
    {
        if (dto.Rows == null || dto.Rows.Count == 0)
            throw new BadRequestException("Không có dòng dữ liệu hợp lệ để lưu.");

        // 1 cache dùng chung cho CẢ batch: 1 mã có thể vừa xuất hiện là dòng tồn thường vừa là
        // dòng chuyển CN đối ứng của mã khác trong cùng ngày, hoặc cascade tồn đầu ngày mai trùng
        // với 1 dòng khác cũng trong batch — bắt buộc dùng chung 1 cache, xem GetOrTrackRowAsync.
        var cache = new Dictionary<string, NxtRow>();
        foreach (var r in dto.Rows)
        {
            if (r.IsTransfer)
            {
                if (string.IsNullOrWhiteSpace(r.FromBranch) || string.IsNullOrWhiteSpace(r.ToBranch))
                    throw new BadRequestException($"Dòng chuyển CN của mã {r.ItemCode} thiếu chi nhánh gửi/nhận.");
                await ApplyTransferRowAsync(cache, r.CloseDate, r.FromBranch, r.ToBranch, r.ItemCode, r.Qty);
            }
            else
            {
                if (string.IsNullOrWhiteSpace(r.Branch))
                    throw new BadRequestException($"Dòng tồn của mã {r.ItemCode} thiếu chi nhánh.");
                await SetDashboardStockAsync(cache, r.CloseDate, r.Branch, r.ItemCode, r.ActualStock, r.SoldNotPicked, r.StockStatus);
            }
        }

        await _activityLogRepo.AddAsync(BuildStockLog(dto));
        await _uow.SaveChangesAsync();

        return new NxtApplyBatchResultDto { RowCount = dto.Rows.Count };
    }

    // setDashboardStock port — SET (không cộng dồn) vì đây là số đếm thực tế cuối ngày, không phải
    // phát sinh trong ngày như Gói ra/Hủy giỏ.
    private async Task SetDashboardStockAsync(
        Dictionary<string, NxtRow> cache,
        string closeDate,
        string branch,
        string itemCode,
        decimal actualStock,
        decimal soldNotPicked,
        string? stockStatus
    )
    {
        var row = await GetOrTrackRowAsync(cache, closeDate, branch, itemCode);

        row.ActualStock = actualStock;
        row.SoldNotPicked = soldNotPicked;
        row.StockStatus = string.IsNullOrWhiteSpace(stockStatus) ? "Tồn bình thường" : stockStatus;
        row.Inactive = false;

        // Nguyên tắc vận hành: tồn đầu ngày sau lấy theo Tồn thực tế cuối ngày trước, trừ đi phần
        // DTT (đã bán/chưa lấy) — xem giải thích chi tiết trong SetNextDayOpeningFromActualAsync.
        await SetNextDayOpeningFromActualAsync(cache, closeDate, branch, itemCode, actualStock, soldNotPicked);
    }

    private class TransferNoteEntry
    {
        public string Type { get; set; } = "";
        public string OtherBranch { get; set; } = "";
        public decimal Qty { get; set; }
    }

    private static void AppendTransferNote(NxtRow row, string type, string otherBranch, decimal qty)
    {
        var notes = string.IsNullOrWhiteSpace(row.TransferNotes)
            ? new List<TransferNoteEntry>()
            : JsonSerializer.Deserialize<List<TransferNoteEntry>>(row.TransferNotes) ?? new List<TransferNoteEntry>();
        notes.Add(new TransferNoteEntry { Type = type, OtherBranch = otherBranch, Qty = qty });
        row.TransferNotes = JsonSerializer.Serialize(notes);
    }

    // applyTransferRow port — cộng dồn transferBranch (gửi) / receiveBranch (nhận), ghi chú 2 phía.
    private async Task ApplyTransferRowAsync(
        Dictionary<string, NxtRow> cache,
        string closeDate,
        string fromBranch,
        string toBranch,
        string itemCode,
        decimal qty
    )
    {
        var fromRow = await GetOrTrackRowAsync(cache, closeDate, fromBranch, itemCode);
        fromRow.TransferBranch += qty;
        if (qty != 0) fromRow.Inactive = false;
        AppendTransferNote(fromRow, "out", toBranch, qty);

        var toRow = await GetOrTrackRowAsync(cache, closeDate, toBranch, itemCode);
        toRow.ReceiveBranch += qty;
        if (qty != 0) toRow.Inactive = false;
        AppendTransferNote(toRow, "in", fromBranch, qty);
    }

    // makeOpLog port cho Tồn CN — detail có thêm tag DTT/CTT nếu có, khớp đúng format cũ
    // ("{date}|{itemCode}:{qty}|{tag}") để Truy vết/rollbackLog parse đúng.
    private ActivityLog BuildStockLog(NxtApplyStockRequestDto dto)
    {
        var dates = string.Join(", ", dto.Rows.Select(r => r.CloseDate).Distinct());
        if (dates.Length > 40) dates = dates[..40];
        var branches = string.Join(
            "/",
            dto.Rows.SelectMany(r => r.IsTransfer ? new[] { r.FromBranch, r.ToBranch } : new[] { r.Branch })
                .Where(b => !string.IsNullOrWhiteSpace(b))
                .Distinct()
        );
        var qtyTotal = dto.Rows.Sum(r => Math.Abs(r.IsTransfer ? r.Qty : r.ActualStock));
        var detail = string.Join(
            ", ",
            dto.Rows.Select(r =>
            {
                var qty = r.IsTransfer ? r.Qty : r.ActualStock;
                var tag = r.IsTransfer ? null : GetStockStatusType(r.StockStatus);
                return string.IsNullOrEmpty(tag)
                    ? $"{r.CloseDate}|{r.ItemCode}:{qty}"
                    : $"{r.CloseDate}|{r.ItemCode}:{qty}|{tag}";
            })
        );

        return new ActivityLog
        {
            StaffCode = dto.LoginCode,
            Action = "Nạp Tồn CN",
            TableName = "nxt_rows",
            CreatedAt = DateTime.UtcNow,
            NewData = JsonSerializer.Serialize(
                new
                {
                    closeDate = dates,
                    branch = branches,
                    qty = qtyTotal,
                    note = $"{dto.Rows.Count} dòng",
                    userName = dto.UserName ?? "",
                    status = "Đã áp dụng",
                    detail,
                }
            ),
        };
    }

    // ─── SAI MÃ (Đổi mã tạm / Sai mã Sapo) port ───
    // moveTempCodeOccurrences/moveSapoWrongCode/syncNextDayOpeningAfterCodeChange port 1:1. Khác
    // JS: JS quyết định admin/employee ở client (isAdminUser()) rồi mới gọi hàm áp dụng thật; ở đây
    // việc "chỉ Admin mới áp dụng được" chuyển hẳn thành permission gate trên endpoint
    // (RequirePermission "sales.nxt.edit") — Nhân viên gửi đề xuất qua endpoint POST /Nxt/logs sẵn
    // có (không mutate dữ liệu), không cần 1 method riêng ở service.
    private static string NormalizeItemCode(string? value) =>
        Regex.Replace((value ?? "").Trim().ToUpperInvariant(), @"\s+", "");

    private static List<string> GetInternalMoveFields(string? source) =>
        source switch
        {
            "giftIn" => new List<string> { "giftIn" },
            "stock" => new List<string> { "actualStock", "soldNotPicked" },
            "cancel" => new List<string> { "cancelBasket" },
            "transfer" => new List<string> { "transferBranch", "receiveBranch" },
            _ => new List<string>
            {
                "openingStock",
                "giftIn",
                "actualStock",
                "soldNotPicked",
                "cancelBasket",
                "transferBranch",
                "receiveBranch",
                "adjustment",
            },
        };

    private static string FormatSourceName(string? source) =>
        source switch
        {
            "allInternal" => "Tất cả phát sinh nội bộ",
            "giftIn" => "Gói ra",
            "stock" => "Tồn CN",
            "cancel" => "Hủy giỏ",
            "transfer" => "Chuyển CN / Nhận CN",
            _ => source ?? "",
        };

    // Field getter/setter theo tên chuỗi — dùng cho các thao tác cần di chuyển/khôi phục 1 field
    // bất kỳ theo tên (moveTempCodeOccurrences, rollback "Sửa SL") mà không biết trước field nào.
    private static decimal GetRowField(NxtRow r, string field) =>
        field switch
        {
            "openingStock" => r.OpeningStock,
            "giftIn" => r.GiftIn,
            "actualStock" => r.ActualStock,
            "soldNotPicked" => r.SoldNotPicked,
            "cancelBasket" => r.CancelBasket,
            "transferBranch" => r.TransferBranch,
            "receiveBranch" => r.ReceiveBranch,
            "adjustment" => r.Adjustment,
            "sapoSold" => r.SapoSold,
            _ => 0,
        };

    private static void SetRowField(NxtRow r, string field, decimal value)
    {
        switch (field)
        {
            case "openingStock":
                r.OpeningStock = value;
                break;
            case "giftIn":
                r.GiftIn = value;
                break;
            case "actualStock":
                r.ActualStock = value;
                break;
            case "soldNotPicked":
                r.SoldNotPicked = value;
                break;
            case "cancelBasket":
                r.CancelBasket = value;
                break;
            case "transferBranch":
                r.TransferBranch = value;
                break;
            case "receiveBranch":
                r.ReceiveBranch = value;
                break;
            case "adjustment":
                r.Adjustment = value;
                break;
            case "sapoSold":
                r.SapoSold = value;
                break;
        }
    }

    // Dùng decimal nên so sánh = 0 luôn chính xác — không cần "isZeroish"/cleanupZeroFields kiểu JS
    // (chỉ cần vì JS dùng số thực nhị phân, cộng trừ nhiều lần có thể lệch phần thập phân rất nhỏ).
    private static void DeactivateIfEmpty(NxtRow row)
    {
        if (IsInactiveRow(row)) row.Inactive = true;
    }

    // moveNumericFieldByQty port — chuyển tối đa qtyLimit từ from sang to, giữ nguyên dấu.
    private static decimal MoveNumericFieldByQty(NxtRow from, NxtRow to, string field, decimal qtyLimit)
    {
        var current = GetRowField(from, field);
        if (current == 0) return 0;

        var limit = qtyLimit > 0 ? qtyLimit : Math.Abs(current);
        var moveAbs = Math.Min(Math.Abs(current), limit);
        if (moveAbs <= 0) return 0;

        var moveValue = moveAbs * Math.Sign(current);
        SetRowField(from, field, GetRowField(from, field) - moveValue);
        SetRowField(to, field, GetRowField(to, field) + moveValue);
        return moveValue;
    }

    // syncNextDayOpeningAfterCodeChange port — chỉ chuyển đúng phần tồn đầu còn nằm ở mã cũ, không
    // cascade sang các ngày sau, không đụng Sapo/Gói ra/Hủy/Chuyển/Tồn thực tế của ngày kế tiếp.
    private async Task<(bool Synced, decimal Qty, string Detail)> SyncNextDayOpeningAfterCodeChangeAsync(
        Dictionary<string, NxtRow> cache,
        string closeDate,
        string branch,
        string wrongCode,
        string rightCode,
        decimal qty
    )
    {
        var nextDate = AddDaysToDisplayDate(closeDate, 1);
        var requestedQty = Math.Abs(qty);
        if (string.IsNullOrEmpty(nextDate) || requestedQty <= 0)
            return (false, 0, "Không đủ dữ liệu để đồng bộ tồn đầu ngày kế tiếp.");

        var wrongNext = await FindAndTrackRowAsync(cache, nextDate, branch, wrongCode);
        var wrongOpening = wrongNext?.OpeningStock ?? 0;
        if (wrongNext == null || wrongOpening <= 0)
            return (false, 0, $"Không thấy tồn đầu {wrongCode} ở ngày kế tiếp {nextDate}.");

        var syncQty = Math.Min(wrongOpening, requestedQty);
        if (syncQty <= 0)
            return (false, 0, $"Tồn đầu {wrongCode} ngày {nextDate} không đủ để chuyển.");

        var rightNext = await GetOrTrackRowAsync(cache, nextDate, branch, rightCode);

        wrongNext.OpeningStock -= syncQty;
        rightNext.OpeningStock += syncQty;
        rightNext.OpeningSource = $"Đồng bộ sau đổi mã từ tồn thực tế cuối ngày {closeDate}";
        rightNext.Inactive = false;

        DeactivateIfEmpty(wrongNext);

        return (true, syncQty, $"Đã chuyển tồn đầu ngày {nextDate}: {wrongCode} -{syncQty}, {rightCode} +{syncQty}");
    }

    // moveTempCodeOccurrences port — chỉ chuyển phát sinh NỘI BỘ (tuyệt đối không đụng Sapo bán/
    // doanh thu/số đơn — đó là việc của moveSapoWrongCode).
    private async Task<(bool Moved, string? Message, string Detail)> MoveTempCodeOccurrencesAsync(
        Dictionary<string, NxtRow> cache,
        string closeDate,
        string branch,
        string wrongCode,
        string rightCode,
        decimal qty,
        string? source
    )
    {
        var wrong = await FindAndTrackRowAsync(cache, closeDate, branch, wrongCode);
        if (wrong == null || IsInactiveRow(wrong))
            return (
                false,
                $"Không thấy mã {wrongCode} ở {branch} ngày {closeDate}. Kiểm tra lại ngày/chi nhánh/mã.",
                ""
            );

        if (wrong.SapoSold != 0 || wrong.Revenue != 0 || wrong.OrderCount != 0)
            return (
                false,
                $"Mã {wrongCode} đang có dữ liệu Sapo/doanh thu/số đơn. Nếu là bán sai mã, hãy chọn “Sai mã Sapo / check đơn”, không chọn “Đổi mã tạm”.",
                ""
            );

        var right = await GetOrTrackRowAsync(cache, closeDate, branch, rightCode);
        right.Inactive = false;

        var sourceFields = GetInternalMoveFields(source);
        var movedFields = new List<string>();
        decimal movedActualStockAbs = 0;

        foreach (var field in sourceFields)
        {
            var moved = MoveNumericFieldByQty(wrong, right, field, qty);
            if (moved != 0)
            {
                movedFields.Add($"{field}:{moved}");
                if (field == "actualStock") movedActualStockAbs += Math.Abs(moved);
            }
        }

        if (movedFields.Count == 0)
            return (
                false,
                $"Mã {wrongCode} có dòng nhưng không có phát sinh thuộc nguồn \"{FormatSourceName(source)}\" để chuyển.",
                ""
            );

        var nextOpeningSyncDetail = "";
        if ((source == "stock" || source == "allInternal") && movedActualStockAbs > 0)
        {
            var syncResult = await SyncNextDayOpeningAfterCodeChangeAsync(
                cache,
                closeDate,
                branch,
                wrongCode,
                rightCode,
                movedActualStockAbs
            );
            if (!string.IsNullOrEmpty(syncResult.Detail)) nextOpeningSyncDetail = syncResult.Detail;
            if (syncResult.Synced) movedFields.Add($"nextOpeningStock:{syncResult.Qty}");
        }

        if ((source == "transfer" || source == "allInternal") && HasTransferNotes(wrong))
        {
            var wrongNotes =
                JsonSerializer.Deserialize<List<TransferNoteEntry>>(wrong.TransferNotes!) ?? new();
            var rightNotes = string.IsNullOrWhiteSpace(right.TransferNotes)
                ? new List<TransferNoteEntry>()
                : JsonSerializer.Deserialize<List<TransferNoteEntry>>(right.TransferNotes) ?? new();
            rightNotes.AddRange(wrongNotes);
            right.TransferNotes = JsonSerializer.Serialize(rightNotes);
            wrong.TransferNotes = "[]";
        }

        DeactivateIfEmpty(wrong);

        var detail = string.Join(
            " | ",
            new[] { string.Join(", ", movedFields), nextOpeningSyncDetail }.Where(s => !string.IsNullOrEmpty(s))
        );
        return (true, null, detail);
    }

    // moveSapoWrongCode port — chuyển sapoSold/revenue/orderCount theo đúng tỉ lệ SL đã bán sai.
    private async Task<(bool Moved, string? Message, string Detail)> MoveSapoWrongCodeAsync(
        Dictionary<string, NxtRow> cache,
        string closeDate,
        string branch,
        string wrongCode,
        string rightCode,
        decimal qty
    )
    {
        var wrong = await FindAndTrackRowAsync(cache, closeDate, branch, wrongCode);
        if (wrong == null || IsInactiveRow(wrong))
            return (
                false,
                $"Không thấy mã Sapo {wrongCode} ở {branch} ngày {closeDate}. Kiểm tra lại ngày/chi nhánh/mã.",
                ""
            );

        var oldSold = wrong.SapoSold;
        if (oldSold == 0)
            return (
                false,
                $"Mã {wrongCode} không có Sapo bán trong ngày/chi nhánh đã chọn. Nếu là mã tạm nội bộ, hãy chọn \"Đổi mã tạm / nhập nhầm\".",
                ""
            );

        var right = await GetOrTrackRowAsync(cache, closeDate, branch, rightCode);
        right.Inactive = false;

        var moveAbs = Math.Min(Math.Abs(oldSold), qty);
        var moveSold = moveAbs * Math.Sign(oldSold);
        var share = Math.Abs(oldSold) > 0 ? moveAbs / Math.Abs(oldSold) : 0;

        var moveRevenue = wrong.Revenue * share;
        var moveOrderCount = wrong.OrderCount * share;

        wrong.SapoSold -= moveSold;
        right.SapoSold += moveSold;
        wrong.Revenue -= moveRevenue;
        right.Revenue += moveRevenue;
        wrong.OrderCount -= moveOrderCount;
        right.OrderCount += moveOrderCount;

        DeactivateIfEmpty(wrong);

        return (true, null, $"sapoSold:{moveSold}, revenue:{moveRevenue}, orderCount:{moveOrderCount}");
    }

    // applyWrongCode (nhánh Admin) port — Nhân viên (không có sales.nxt.edit) không gọi được
    // endpoint này (RequirePermission chặn ở controller), chỉ gửi đề xuất qua POST /Nxt/logs có sẵn.
    public async Task<NxtApplyWrongCodeResultDto> ApplyWrongCodeAsync(NxtApplyWrongCodeRequestDto dto)
    {
        if (
            string.IsNullOrWhiteSpace(dto.CloseDate)
            || string.IsNullOrWhiteSpace(dto.Branch)
            || string.IsNullOrWhiteSpace(dto.WrongCode)
            || string.IsNullOrWhiteSpace(dto.RightCode)
            || dto.Qty <= 0
        )
            throw new BadRequestException(
                "Vui lòng nhập đủ ngày phát sinh, chi nhánh, mã sai, mã đúng, số lượng."
            );

        var wrongCode = NormalizeItemCode(dto.WrongCode);
        var rightCode = NormalizeItemCode(dto.RightCode);
        if (wrongCode == rightCode)
            throw new BadRequestException("Mã sai/mã tạm và mã đúng đang giống nhau. Vui lòng kiểm tra lại mã.");

        var cache = new Dictionary<string, NxtRow>();
        var result =
            dto.Type == "Sai mã Sapo / check đơn"
                ? await MoveSapoWrongCodeAsync(cache, dto.CloseDate, dto.Branch, wrongCode, rightCode, dto.Qty)
                : await MoveTempCodeOccurrencesAsync(
                    cache,
                    dto.CloseDate,
                    dto.Branch,
                    wrongCode,
                    rightCode,
                    dto.Qty,
                    dto.Source
                );

        if (!result.Moved)
            throw new BadRequestException(
                result.Message ?? "Chưa tìm thấy phát sinh phù hợp để chuyển. App chưa đổi số trên Dashboard."
            );

        var userId = await ResolveUserIdAsync(dto.LoginCode);
        await _activityLogRepo.AddAsync(
            new ActivityLog
            {
                UserId = userId,
                StaffCode = dto.LoginCode,
                Action = dto.Type,
                TableName = "nxt_rows",
                CreatedAt = DateTime.UtcNow,
                NewData = JsonSerializer.Serialize(
                    new
                    {
                        closeDate = dto.CloseDate,
                        branch = dto.Branch,
                        source = dto.Type == "Đổi mã tạm / nhập nhầm" ? (dto.Source ?? "") : "",
                        wrongCode,
                        rightCode,
                        qty = dto.Qty,
                        note = dto.Note ?? "",
                        userName = dto.UserName ?? "",
                        status = "Đã áp dụng",
                        detail = result.Detail,
                    }
                ),
            }
        );
        await _uow.SaveChangesAsync();

        var message =
            dto.Type == "Sai mã Sapo / check đơn"
                ? "Đã chuyển Sapo bán từ mã sai sang mã đúng trong Tổng quan."
                : "Đã chuyển phát sinh nội bộ từ mã cũ sang mã đúng trong Tổng quan.";
        return new NxtApplyWrongCodeResultDto { Detail = result.Detail, Message = message };
    }

    // ─── ROLLBACK (Nhật ký / Lịch sử điều chỉnh) port ───
    // Khác JS: rollbackLog cũ chạy 2 giai đoạn từ client (lưu batch → xóa log riêng, có thể fail
    // giữa chừng để lại dữ liệu đã đảo ngược nhưng log vẫn còn). Ở đây gộp thành 1 transaction
    // DB duy nhất (đảo ngược + xóa log cùng 1 SaveChangesAsync) — hoặc thành công cả 2, hoặc
    // không đổi gì, không còn trạng thái nửa vời.
    private static readonly string[] RollbackSupportedTypes =
    {
        "Nạp Gói ra",
        "Nạp Hủy giỏ",
        "Nạp Sapo",
        "Nạp Tồn CN",
        "Sửa SL",
    };

    private class RollbackLogItem
    {
        public string? CloseDate { get; set; }
        public string Code { get; set; } = "";
        public decimal Qty { get; set; }
        public decimal? PrevQty { get; set; }
    }

    // parseLogDetail port — 4 định dạng, PHẢI kiểm v4 (có "→") trước v3/v2 vì "→" phá regex 2 cái
    // kia, rơi xuống v1 sẽ mất luôn closeDate.
    private static List<RollbackLogItem> ParseLogDetail(string? detail)
    {
        var items = new List<RollbackLogItem>();
        foreach (var raw in (detail ?? "").Split(','))
        {
            var s = raw.Trim();
            if (s.Length == 0) continue;

            var v4 = Regex.Match(s, @"^(\d{2}/\d{2}/\d{4})\|(.+):(-?[\d.]+)→(-?[\d.]+)$");
            if (v4.Success)
            {
                items.Add(
                    new RollbackLogItem
                    {
                        CloseDate = v4.Groups[1].Value,
                        Code = v4.Groups[2].Value.Trim(),
                        PrevQty = decimal.Parse(v4.Groups[3].Value, CultureInfo.InvariantCulture),
                        Qty = decimal.Parse(v4.Groups[4].Value, CultureInfo.InvariantCulture),
                    }
                );
                continue;
            }
            var v3 = Regex.Match(s, @"^(\d{2}/\d{2}/\d{4})\|(.+):(-?[\d.]+)\|(.*)$");
            if (v3.Success)
            {
                items.Add(
                    new RollbackLogItem
                    {
                        CloseDate = v3.Groups[1].Value,
                        Code = v3.Groups[2].Value.Trim(),
                        Qty = decimal.Parse(v3.Groups[3].Value, CultureInfo.InvariantCulture),
                    }
                );
                continue;
            }
            var v2 = Regex.Match(s, @"^(\d{2}/\d{2}/\d{4})\|(.+):(-?[\d.]+)$");
            if (v2.Success)
            {
                items.Add(
                    new RollbackLogItem
                    {
                        CloseDate = v2.Groups[1].Value,
                        Code = v2.Groups[2].Value.Trim(),
                        Qty = decimal.Parse(v2.Groups[3].Value, CultureInfo.InvariantCulture),
                    }
                );
                continue;
            }
            var v1 = Regex.Match(s, @"^(.+):(-?[\d.]+)$");
            if (v1.Success)
            {
                items.Add(
                    new RollbackLogItem
                    {
                        CloseDate = null,
                        Code = v1.Groups[1].Value.Trim(),
                        Qty = decimal.Parse(v1.Groups[2].Value, CultureInfo.InvariantCulture),
                    }
                );
            }
        }
        return items;
    }

    private static string GetJsonStr(JsonElement? root, string key)
    {
        if (root == null || root.Value.ValueKind != JsonValueKind.Object) return "";
        return root.Value.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String ? (v.GetString() ?? "") : "";
    }

    private static readonly Dictionary<string, string> RollbackEditQtyLabelToField = new()
    {
        ["Gói ra"] = "giftIn",
        ["Nhận CN"] = "receiveBranch",
        ["Chuyển CN"] = "transferBranch",
        ["Hủy giỏ"] = "cancelBasket",
        ["Tồn thực tế"] = "actualStock",
        ["Bán chưa lấy"] = "soldNotPicked",
        ["Điều chỉnh"] = "adjustment",
        ["Sapo bán"] = "sapoSold",
    };

    // rollbackLog port — đảo ngược đúng thao tác đã ghi trong 1 log rồi xóa log đó.
    public async Task RollbackLogAsync(long logId)
    {
        var log = await _activityLogRepo.SingleOrDefaultAsync(l => l.Id == logId && l.TableName == "nxt_rows");
        if (log == null)
            throw new NotFoundException("Không tìm thấy log");

        var type = log.Action ?? "";
        if (!RollbackSupportedTypes.Contains(type))
            throw new BadRequestException("Loại thao tác này không hỗ trợ hoàn tác.");

        JsonElement? data = null;
        if (!string.IsNullOrWhiteSpace(log.NewData))
        {
            try
            {
                data = JsonSerializer.Deserialize<JsonElement>(log.NewData);
            }
            catch (JsonException) { }
        }
        var rawBranch = GetJsonStr(data, "branch");
        var rawCloseDate = GetJsonStr(data, "closeDate");
        var rawDetail = GetJsonStr(data, "detail");
        var rawRightCode = GetJsonStr(data, "rightCode");

        var branches = rawBranch
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(b => b.Trim())
            .Where(b => b.Length > 0)
            .ToList();
        var items = ParseLogDetail(rawDetail);
        var fallbackDates = rawCloseDate
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(d => d.Trim())
            .Where(d => d.Length > 0)
            .ToList();
        List<string> GetCds(RollbackLogItem item) =>
            item.CloseDate != null ? new List<string> { item.CloseDate } : fallbackDates;

        var cache = new Dictionary<string, NxtRow>();

        if (type == "Nạp Gói ra" || type == "Nạp Hủy giỏ")
        {
            var field = type == "Nạp Gói ra" ? "giftIn" : "cancelBasket";
            foreach (var item in items)
            foreach (var br in branches)
            foreach (var cd in GetCds(item))
            {
                var row = await FindAndTrackRowAsync(cache, cd, br, item.Code);
                if (row == null) continue;
                SetRowField(row, field, GetRowField(row, field) - item.Qty);
                DeactivateIfEmpty(row);
            }
        }
        else if (type == "Nạp Sapo")
        {
            foreach (var item in items)
            foreach (var br in branches)
            foreach (var cd in GetCds(item))
            {
                var row = await FindAndTrackRowAsync(cache, cd, br, item.Code);
                if (row == null) continue;
                // setSapoExact khi nạp GHI ĐÈ sapoSold (không cộng dồn) — hoàn tác đúng phải SET lại
                // giá trị CŨ (item.PrevQty, có ở bút ký v4), không được trừ (chỉ đúng nếu sapoSold
                // từng = 0 trước khi nạp — sai ngay khi có thao tác Sapo/sửa tay khác chen giữa).
                row.SapoSold = item.PrevQty ?? (row.SapoSold - item.Qty);
                DeactivateIfEmpty(row);
            }
        }
        else if (type == "Nạp Tồn CN")
        {
            foreach (var item in items)
            foreach (var br in branches)
            foreach (var cd in GetCds(item))
            {
                var row = await FindAndTrackRowAsync(cache, cd, br, item.Code);
                if (row == null) continue;
                row.ActualStock = 0;
                row.SoldNotPicked = 0;
                row.StockStatus = "";
                DeactivateIfEmpty(row);

                var nextDate = AddDaysToDisplayDate(cd, 1);
                var expectedSource = $"Tự lấy từ tồn thực tế cuối ngày {cd}";
                var nextRow = await FindAndTrackRowAsync(cache, nextDate, br, item.Code);
                if (nextRow != null && (nextRow.OpeningSource ?? "").StartsWith(expectedSource))
                {
                    nextRow.OpeningStock = 0;
                    nextRow.OpeningSource = "";
                }
            }
        }
        else if (type == "Sửa SL")
        {
            var m = Regex.Match(rawDetail, @"^(.+):\s*([-\d.]+)\s*→\s*([-\d.]+)");
            if (m.Success && !string.IsNullOrEmpty(rawRightCode))
            {
                var label = m.Groups[1].Value.Trim();
                if (RollbackEditQtyLabelToField.TryGetValue(label, out var fieldKey))
                {
                    var oldVal = decimal.Parse(m.Groups[2].Value, CultureInfo.InvariantCulture);
                    foreach (var br in branches)
                    {
                        var row = await FindAndTrackRowAsync(cache, rawCloseDate, br, rawRightCode);
                        if (row == null) continue;
                        SetRowField(row, fieldKey, oldVal);
                        DeactivateIfEmpty(row);
                    }
                }
            }
        }

        await _activityLogRepo.DeleteAsync(log);
        await _uow.SaveChangesAsync();
    }

    // ─── SỬA SL (TAB) port ───
    // applyEditQty port — sửa nhanh ĐÚNG 1 field trên 1 dòng (khác Sửa nhanh ở Tổng quan cho phép
    // sửa nhiều field cùng lúc). Cùng bộ 7 field được phép sửa (EditFieldLabels) + cùng permission
    // gate (sales.nxt.edit_quatity_nxt) với nút "Sửa" ở Tổng quan — xem NxtController.InlineEditOverview.
    // Riêng có thêm: (1) bắt buộc nhập lý do, (2) sửa Chuyển CN/Nhận CN phải đồng bộ luôn field đối
    // ứng ở chi nhánh kia (transferBranch <-> receiveBranch), việc Tổng quan không làm.
    public async Task<NxtEditQtyResultDto> ApplyEditQtyAsync(NxtEditQtyRequestDto dto)
    {
        if (
            string.IsNullOrWhiteSpace(dto.CloseDate)
            || string.IsNullOrWhiteSpace(dto.Branch)
            || string.IsNullOrWhiteSpace(dto.ItemCode)
        )
            throw new BadRequestException("Vui lòng nhập đủ ngày, chi nhánh và mã giỏ.");
        if (string.IsNullOrWhiteSpace(dto.Reason))
            throw new BadRequestException("Vui lòng nhập lý do sửa.");
        if (!EditFieldLabels.TryGetValue(dto.Field, out var fieldLabel))
            throw new BadRequestException("Trường cần sửa không hợp lệ.");

        var itemCode = NormalizeItemCode(dto.ItemCode);
        var cache = new Dictionary<string, NxtRow>();
        var row = await FindAndTrackRowAsync(cache, dto.CloseDate, dto.Branch, itemCode);
        if (row == null)
            throw new NotFoundException($"Không tìm thấy {itemCode} tại {dto.Branch} ngày {dto.CloseDate}.");

        var oldVal = GetRowField(row, dto.Field);
        if (oldVal == dto.NewValue)
            throw new BadRequestException("Giá trị mới giống giá trị cũ, không có gì thay đổi.");

        SetRowField(row, dto.Field, dto.NewValue);
        row.UpdatedAt = DateTime.UtcNow;
        var extraDetail = "";

        if (dto.Field == "actualStock" || dto.Field == "soldNotPicked")
        {
            await SetNextDayOpeningFromActualAsync(cache, dto.CloseDate, dto.Branch, itemCode, row.ActualStock, row.SoldNotPicked);
            extraDetail = " (đồng bộ tồn đầu ngày kế tiếp)";
        }

        if (dto.Field == "transferBranch" || dto.Field == "receiveBranch")
        {
            if (string.IsNullOrWhiteSpace(dto.CounterBranch) || dto.CounterBranch == dto.Branch)
                throw new BadRequestException("Vui lòng chọn chi nhánh đối ứng khác chi nhánh hiện tại.");

            var counterField = dto.Field == "transferBranch" ? "receiveBranch" : "transferBranch";
            var counterRow = await GetOrTrackRowAsync(cache, dto.CloseDate, dto.CounterBranch, itemCode);
            SetRowField(counterRow, counterField, dto.NewValue);
            counterRow.UpdatedAt = DateTime.UtcNow;
            if (dto.NewValue != 0) counterRow.Inactive = false;
            extraDetail =
                $" (cập nhật {(counterField == "receiveBranch" ? "Nhận CN" : "Chuyển CN")} tại {dto.CounterBranch})";
        }

        DeactivateIfEmpty(row);

        var detail = $"{fieldLabel}: {oldVal} → {dto.NewValue}{extraDetail}";
        var userId = await ResolveUserIdAsync(dto.LoginCode);
        await _activityLogRepo.AddAsync(
            new ActivityLog
            {
                UserId = userId,
                StaffCode = dto.LoginCode,
                Action = "Sửa SL",
                TableName = "nxt_rows",
                CreatedAt = DateTime.UtcNow,
                NewData = JsonSerializer.Serialize(
                    new
                    {
                        closeDate = dto.CloseDate,
                        branch = dto.Branch,
                        source = fieldLabel,
                        wrongCode = "",
                        rightCode = itemCode,
                        qty = dto.NewValue,
                        note = dto.Reason,
                        userName = dto.UserName ?? "",
                        status = "Đã sửa",
                        detail,
                    }
                ),
            }
        );
        await _uow.SaveChangesAsync();

        return new NxtEditQtyResultDto
        {
            Detail = detail,
            Message = $"Đã sửa {fieldLabel} của {itemCode} ({dto.Branch}): {oldVal} → {dto.NewValue}.",
        };
    }

    // ─── SAPO TREO (Đã lấy - chờ Sapo) port ───
    // Khác bản cũ (NxtSapoPendingController raw MemBerContext, patch NxtRow.adjustment hoàn toàn ở
    // client rồi gọi dbSyncBatch()+dbSaveLog() riêng — có thể fail nửa chừng): gộp patch
    // NxtRow.Adjustment/StockStatus + ghi ActivityLog + mutate NxtSapoPending vào 1
    // SaveChangesAsync duy nhất.
    private static NxtSapoPendingDto ToSapoPendingDto(NxtSapoPending r) =>
        new()
        {
            Id = r.Id,
            CloseDate = r.CloseDate,
            Branch = r.Branch,
            ItemCode = r.ItemCode,
            Qty = r.Qty,
            Reason = r.Reason ?? "",
            Note = r.Note ?? "",
            Status = r.Status,
            CreatedBy = r.CreatedBy ?? "",
            CreatedByName = r.CreatedByName ?? "",
            CreatedAt = r.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
            CreatedAtRaw = r.CreatedAt,
            SapoDate = r.SapoDate ?? "",
            SapoOrderCode = r.SapoOrderCode ?? "",
            CompletedBy = r.CompletedBy ?? "",
            CompletedByName = r.CompletedByName ?? "",
            CompletedAt = r.CompletedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
            CompletionNote = r.CompletionNote ?? "",
            PositiveAdjDate = r.PositiveAdjDate ?? "",
        };

    public async Task<IEnumerable<NxtSapoPendingDto>> GetSapoPendingAsync()
    {
        var records = await _sapoPendingRepo.GetAllAsync();
        return records
            .OrderBy(r => r.Status == "completed" ? 1 : 0)
            .ThenByDescending(r => r.CreatedAt)
            .Select(ToSapoPendingDto);
    }

    // setupSapoPending "Tạo mục treo" port — điều chỉnh ÂM ngày hàng ra thực tế (chờ Sapo ghi
    // nhận), gắn nhãn CTT tạm thời để phân biệt với dòng đã đối chiếu xong (DTT).
    public async Task<NxtSapoPendingDto> CreateSapoPendingAsync(NxtSapoPendingCreateRequestDto dto)
    {
        if (
            string.IsNullOrWhiteSpace(dto.CloseDate)
            || string.IsNullOrWhiteSpace(dto.Branch)
            || string.IsNullOrWhiteSpace(dto.ItemCode)
            || dto.Qty <= 0
        )
            throw new BadRequestException("Vui lòng điền đầy đủ ngày, chi nhánh, mã giỏ và số lượng > 0.");

        var itemCode = NormalizeItemCode(dto.ItemCode);
        var reason = string.IsNullOrWhiteSpace(dto.Reason) ? "Đã lấy - chờ Sapo" : dto.Reason;

        var cache = new Dictionary<string, NxtRow>();
        var row = await GetOrTrackRowAsync(cache, dto.CloseDate, dto.Branch, itemCode);
        var existAdj = row.Adjustment;
        var newAdj = existAdj - dto.Qty;
        row.Adjustment = newAdj;
        row.StockStatus = "CTT - giữ giỏ/chưa thanh toán";
        row.Inactive = false;
        row.UpdatedAt = DateTime.UtcNow;

        var record = new NxtSapoPending
        {
            CloseDate = dto.CloseDate,
            Branch = dto.Branch,
            ItemCode = itemCode,
            Qty = dto.Qty,
            Reason = reason,
            Note = dto.Note,
            Status = "pending",
            CreatedBy = dto.LoginCode,
            CreatedByName = dto.DisplayName,
        };
        await _sapoPendingRepo.AddAsync(record);

        var userId = await ResolveUserIdAsync(dto.LoginCode);
        await _activityLogRepo.AddAsync(
            new ActivityLog
            {
                UserId = userId,
                StaffCode = dto.LoginCode,
                Action = "Nạp Sapo treo",
                TableName = "nxt_rows",
                CreatedAt = DateTime.UtcNow,
                NewData = JsonSerializer.Serialize(
                    new
                    {
                        closeDate = dto.CloseDate,
                        branch = dto.Branch,
                        source = "Điều chỉnh",
                        wrongCode = "",
                        rightCode = itemCode,
                        qty = -dto.Qty,
                        note = dto.Note ?? reason,
                        userName = dto.DisplayName ?? "",
                        status = "Đã áp dụng",
                        detail = $"Điều chỉnh: {existAdj} → {newAdj} (treo chờ Sapo, SL {dto.Qty}, lý do: {reason})",
                    }
                ),
            }
        );

        await _uow.SaveChangesAsync();
        return ToSapoPendingDto(record);
    }

    // confirmSapoPending port — đổi nhãn CTT→DTT ở dòng gốc (đã có đơn Sapo, chỉ còn chờ đối
    // chiếu), điều chỉnh DƯƠNG ngày Sapo xác nhận để tránh trừ tồn 2 lần.
    public async Task<NxtSapoPendingDto> CompleteSapoPendingAsync(int id, NxtSapoPendingCompleteRequestDto dto)
    {
        var record = await _sapoPendingRepo.SingleOrDefaultAsync(r => r.Id == id);
        if (record == null)
            throw new NotFoundException("Không tìm thấy mục treo");
        if (record.Status == "completed")
            throw new ConflictException("Mục này đã hoàn thành rồi");
        await _sapoPendingRepo.Update(record);

        record.Status = "completed";
        record.SapoDate = dto.SapoDate;
        record.SapoOrderCode = dto.SapoOrderCode;
        record.CompletedBy = dto.LoginCode;
        record.CompletedByName = dto.DisplayName;
        record.CompletedAt = DateTime.UtcNow;
        record.CompletionNote = dto.CompletionNote;
        record.PositiveAdjDate = dto.SapoDate;
        record.UpdatedAt = DateTime.UtcNow;

        var cache = new Dictionary<string, NxtRow>();

        var originRow = await FindAndTrackRowAsync(cache, record.CloseDate, record.Branch, record.ItemCode);
        if (originRow != null && GetStockStatusType(originRow.StockStatus) == "CTT")
        {
            originRow.StockStatus = "DTT - đã bán chưa lấy";
            originRow.UpdatedAt = DateTime.UtcNow;
        }

        if (!string.IsNullOrWhiteSpace(dto.SapoDate))
        {
            var adjRow = await GetOrTrackRowAsync(cache, dto.SapoDate, record.Branch, record.ItemCode);
            var existAdj = adjRow.Adjustment;
            var newAdj = existAdj + record.Qty;
            adjRow.Adjustment = newAdj;
            adjRow.Inactive = false;
            adjRow.UpdatedAt = DateTime.UtcNow;

            var userId = await ResolveUserIdAsync(dto.LoginCode);
            await _activityLogRepo.AddAsync(
                new ActivityLog
                {
                    UserId = userId,
                    StaffCode = dto.LoginCode,
                    Action = "Sapo treo hoàn thành",
                    TableName = "nxt_rows",
                    CreatedAt = DateTime.UtcNow,
                    NewData = JsonSerializer.Serialize(
                        new
                        {
                            closeDate = dto.SapoDate,
                            branch = record.Branch,
                            source = "Điều chỉnh",
                            wrongCode = "",
                            rightCode = record.ItemCode,
                            qty = record.Qty,
                            note = dto.CompletionNote ?? "",
                            userName = dto.DisplayName ?? "",
                            status = "Đã áp dụng",
                            detail = $"Điều chỉnh: {existAdj} → {newAdj} (hoàn thành Sapo treo{(string.IsNullOrWhiteSpace(dto.SapoOrderCode) ? "" : $", mã đơn {dto.SapoOrderCode}")})",
                        }
                    ),
                }
            );
        }

        await _uow.SaveChangesAsync();
        return ToSapoPendingDto(record);
    }

    // deleteSapoPending port — hoàn lại đúng phần Điều chỉnh đã trừ lúc tạo treo, bỏ nhãn CTT nếu
    // vẫn còn nguyên (chưa bị đổi bởi thao tác khác chen giữa).
    public async Task DeleteSapoPendingAsync(int id, string? loginCode, string? displayName)
    {
        var record = await _sapoPendingRepo.SingleOrDefaultAsync(r => r.Id == id);
        if (record == null)
            throw new NotFoundException("Không tìm thấy");
        if (record.Status == "completed")
            throw new BadRequestException("Không thể xóa mục đã hoàn thành");

        var cache = new Dictionary<string, NxtRow>();
        var row = await FindAndTrackRowAsync(cache, record.CloseDate, record.Branch, record.ItemCode);
        if (row != null)
        {
            var existAdj = row.Adjustment;
            var newAdj = existAdj + record.Qty;
            row.Adjustment = newAdj;
            if (GetStockStatusType(row.StockStatus) == "CTT") row.StockStatus = "Tồn bình thường";
            row.UpdatedAt = DateTime.UtcNow;
            DeactivateIfEmpty(row);

            var userId = await ResolveUserIdAsync(loginCode);
            await _activityLogRepo.AddAsync(
                new ActivityLog
                {
                    UserId = userId,
                    StaffCode = loginCode,
                    Action = "Hủy Sapo treo",
                    TableName = "nxt_rows",
                    CreatedAt = DateTime.UtcNow,
                    NewData = JsonSerializer.Serialize(
                        new
                        {
                            closeDate = record.CloseDate,
                            branch = record.Branch,
                            source = "Điều chỉnh",
                            wrongCode = "",
                            rightCode = record.ItemCode,
                            qty = record.Qty,
                            note = "Hủy mục Sapo treo, hoàn lại điều chỉnh và nhãn CTT",
                            userName = displayName ?? "",
                            status = "Đã áp dụng",
                            detail = $"Điều chỉnh: {existAdj} → {newAdj} (hủy Sapo treo, hoàn lại SL {record.Qty})",
                        }
                    ),
                }
            );
        }

        await _sapoPendingRepo.DeleteAsync(record);
        await _uow.SaveChangesAsync();
    }
}

// ─── DTOs ───

public class NxtOverviewFilterDto
{
    public string? Branch { get; set; }
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public string? Status { get; set; }
}

public class NxtOverviewRowDto
{
    public int Id { get; set; }
    public string CloseDate { get; set; } = "";
    public string Branch { get; set; } = "";
    public string ItemCode { get; set; } = "";
    public decimal OpeningStock { get; set; }
    public string OpeningSource { get; set; } = "";
    public decimal GiftIn { get; set; }
    public decimal ReceiveBranch { get; set; }
    public decimal TransferBranch { get; set; }
    public decimal CancelBasket { get; set; }
    public decimal SapoSold { get; set; }
    public decimal Adjustment { get; set; }
    public decimal ActualStock { get; set; }
    public decimal SoldNotPicked { get; set; }
    public string StockStatus { get; set; } = "";
    public string StockType { get; set; } = "";
    public decimal Revenue { get; set; }
    public decimal OrderCount { get; set; }
    public List<object> TransferNotes { get; set; } = new();
    public bool Inactive { get; set; }
    public decimal CompareStock { get; set; }
    public decimal ExpectedStock { get; set; }
    public decimal Diff { get; set; }
    public string DiffReasonHint { get; set; } = "";
    public bool HasInsufficientTransferSource { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class NxtOverviewKpisDto
{
    public decimal OpeningStock { get; set; }
    public decimal GiftIn { get; set; }
    public decimal ReceiveBranch { get; set; }
    public decimal TransferBranch { get; set; }
    public decimal CancelBasket { get; set; }
    public decimal SapoSold { get; set; }
    public decimal ActualStock { get; set; }
    public decimal SoldNotPicked { get; set; }
    public decimal Revenue { get; set; }
    public decimal OrderCount { get; set; }
    public int DiffRows { get; set; }
    public string LatestSapoDate { get; set; } = "Chưa nạp";
}

public class NxtCheckDayCodeDto
{
    public string Code { get; set; } = "";
    public decimal Diff { get; set; }
}

public class NxtCheckDayDto
{
    public string Date { get; set; } = "";
    public string Branch { get; set; } = "";
    public int DiffRows { get; set; }
    public decimal TotalDiff { get; set; }
    public decimal AbsDiff { get; set; }
    public List<NxtCheckDayCodeDto> Codes { get; set; } = new();
}

public class NxtInlineEditRequestDto
{
    public string CloseDate { get; set; } = "";
    public string Branch { get; set; } = "";
    public string ItemCode { get; set; } = "";
    public decimal GiftIn { get; set; }
    public decimal ReceiveBranch { get; set; }
    public decimal TransferBranch { get; set; }
    public decimal CancelBasket { get; set; }
    public decimal Adjustment { get; set; }
    public decimal ActualStock { get; set; }
    public decimal SoldNotPicked { get; set; }
    public DateTime? ExpectedUpdatedAt { get; set; }
    public string? LoginCode { get; set; }
    public string? UserName { get; set; }
}

public class NxtRowKeyDto
{
    public string CloseDate { get; set; } = "";
    public string Branch { get; set; } = "";
    public string ItemCode { get; set; } = "";
}

public class NxtSoftDeleteRequestDto
{
    public List<NxtRowKeyDto> Keys { get; set; } = new();
    public string? LoginCode { get; set; }
    public string? UserName { get; set; }
}

public class NxtSoftDeleteResultDto
{
    public int DeletedCount { get; set; }
}

public class NxtBatchRowDto
{
    public string CloseDate { get; set; } = "";
    public string Branch { get; set; } = "";
    public string ItemCode { get; set; } = "";
    public decimal Qty { get; set; }
}

public class NxtApplyBatchRequestDto
{
    public List<NxtBatchRowDto> Rows { get; set; } = new();
    public string? LoginCode { get; set; }
    public string? UserName { get; set; }
}

public class NxtApplyBatchResultDto
{
    public int RowCount { get; set; }
}

// Dòng Tồn CN sau khi frontend đã parse-preview + gộp (mergeStockRows) — IsTransfer phân biệt 2
// luồng áp dụng khác nhau hẳn (SET tồn thực tế vs cộng dồn chuyển CN), xem ApplyStockAsync.
public class NxtApplyStockRowDto
{
    public string CloseDate { get; set; } = "";
    public string ItemCode { get; set; } = "";
    public bool IsTransfer { get; set; }

    // Dòng tồn thường
    public string? Branch { get; set; }
    public decimal ActualStock { get; set; }
    public decimal SoldNotPicked { get; set; }
    public string? StockStatus { get; set; }

    // Dòng chuyển CN
    public string? FromBranch { get; set; }
    public string? ToBranch { get; set; }
    public decimal Qty { get; set; }
}

public class NxtApplyStockRequestDto
{
    public List<NxtApplyStockRowDto> Rows { get; set; } = new();
    public string? LoginCode { get; set; }
    public string? UserName { get; set; }
}

public class NxtApplyWrongCodeRequestDto
{
    public string CloseDate { get; set; } = "";
    public string Branch { get; set; } = "";
    public string Type { get; set; } = ""; // "Đổi mã tạm / nhập nhầm" | "Sai mã Sapo / check đơn"
    public string? Source { get; set; } // chỉ áp dụng khi Type = Đổi mã tạm
    public string WrongCode { get; set; } = "";
    public string RightCode { get; set; } = "";
    public decimal Qty { get; set; }
    public string? Note { get; set; }
    public string? LoginCode { get; set; }
    public string? UserName { get; set; }
}

public class NxtApplyWrongCodeResultDto
{
    public string Detail { get; set; } = "";
    public string Message { get; set; } = "";
}

public class NxtEditQtyRequestDto
{
    public string CloseDate { get; set; } = "";
    public string Branch { get; set; } = "";
    public string ItemCode { get; set; } = "";

    // giftIn | receiveBranch | transferBranch | cancelBasket | actualStock | soldNotPicked | adjustment
    public string Field { get; set; } = "";
    public decimal NewValue { get; set; }
    public string Reason { get; set; } = "";

    // Bắt buộc khi Field = transferBranch/receiveBranch — chi nhánh đối ứng cần đồng bộ song song.
    public string? CounterBranch { get; set; }
    public string? LoginCode { get; set; }
    public string? UserName { get; set; }
}

public class NxtEditQtyResultDto
{
    public string Detail { get; set; } = "";
    public string Message { get; set; } = "";
}

public class NxtSapoPendingDto
{
    public int Id { get; set; }
    public string CloseDate { get; set; } = "";
    public string Branch { get; set; } = "";
    public string ItemCode { get; set; } = "";
    public decimal Qty { get; set; }
    public string Reason { get; set; } = "";
    public string Note { get; set; } = "";
    public string Status { get; set; } = "";
    public string CreatedBy { get; set; } = "";
    public string CreatedByName { get; set; } = "";
    public string? CreatedAt { get; set; }
    public DateTime? CreatedAtRaw { get; set; }
    public string SapoDate { get; set; } = "";
    public string SapoOrderCode { get; set; } = "";
    public string CompletedBy { get; set; } = "";
    public string CompletedByName { get; set; } = "";
    public string? CompletedAt { get; set; }
    public string CompletionNote { get; set; } = "";
    public string PositiveAdjDate { get; set; } = "";
}

public class NxtSapoPendingCreateRequestDto
{
    public string CloseDate { get; set; } = "";
    public string Branch { get; set; } = "";
    public string ItemCode { get; set; } = "";
    public decimal Qty { get; set; }
    public string? Reason { get; set; }
    public string? Note { get; set; }
    public string? LoginCode { get; set; }
    public string? DisplayName { get; set; }
}

public class NxtSapoPendingCompleteRequestDto
{
    public string? SapoDate { get; set; }
    public string? SapoOrderCode { get; set; }
    public string? CompletionNote { get; set; }
    public string? LoginCode { get; set; }
    public string? DisplayName { get; set; }
}
