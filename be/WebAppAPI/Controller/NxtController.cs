using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppAPI.Authorization;
using WebAppInfractor.Data;
using WebAppInfractor.Models;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NxtController : ControllerBase
    {
        private readonly MemBerContext _db;

        public NxtController(MemBerContext db)
        {
            _db = db;
        }

        // ─── ROWS ─────────────────────────────────────────────────────────────

        [RequirePermission("sales.nxt.view")]
        [HttpGet("rows")]
        public async Task<ResponseValue<IEnumerable<object>>> GetRows()
        {
            var rows = await _db
                .NxtRows.OrderBy(r => r.CloseDate)
                .ThenBy(r => r.Branch)
                .ThenBy(r => r.ItemCode)
                .ToListAsync();
            var result = rows.Select(r => ToDto(r));
            return new ResponseValue<IEnumerable<object>>(
                result,
                "Lấy danh sách thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("sales.nxt.edit")]
        [HttpPost("rows/upsert")]
        public async Task<ResponseValue<object>> UpsertRow([FromBody] NxtRowDto dto)
        {
            var existing = await _db.NxtRows.FirstOrDefaultAsync(r =>
                r.CloseDate == dto.CloseDate && r.Branch == dto.Branch && r.ItemCode == dto.ItemCode
            );

            if (existing == null)
            {
                var row = FromDto(dto);
                _db.NxtRows.Add(row);
            }
            else
            {
                existing.OpeningStock = dto.OpeningStock;
                existing.OpeningSource = dto.OpeningSource;
                existing.GiftIn = dto.GiftIn;
                existing.ReceiveBranch = dto.ReceiveBranch;
                existing.TransferBranch = dto.TransferBranch;
                existing.CancelBasket = dto.CancelBasket;
                existing.SapoSold = dto.SapoSold;
                existing.Adjustment = dto.Adjustment;
                existing.ActualStock = dto.ActualStock;
                existing.SoldNotPicked = dto.SoldNotPicked;
                existing.StockStatus = dto.StockStatus;
                existing.Revenue = dto.Revenue;
                existing.OrderCount = dto.OrderCount;
                existing.TransferNotes =
                    dto.TransferNotes != null ? JsonSerializer.Serialize(dto.TransferNotes) : null;
                existing.Inactive = dto.Inactive;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return new ResponseValue<object>(
                new { success = true },
                "Lưu dữ liệu thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("sales.nxt.edit")]
        [HttpPost("rows/batch")]
        public async Task<ResponseValue<object>> BatchRows([FromBody] List<NxtRowDto> dtos)
        {
            // Deduplicate — giữ entry cuối cùng nếu FE gửi trùng key
            var dedupedDtos = dtos
                .GroupBy(d => (d.CloseDate, d.Branch, d.ItemCode))
                .Select(g => g.Last())
                .ToList();

            var incoming = dedupedDtos.Select(d => (d.CloseDate, d.Branch, d.ItemCode)).ToHashSet();

            var existing = await _db.NxtRows.ToListAsync();

            foreach (var row in existing)
            {
                if (!incoming.Contains((row.CloseDate, row.Branch, row.ItemCode)))
                    _db.NxtRows.Remove(row);
            }

            foreach (var dto in dedupedDtos)
            {
                var ex = existing.FirstOrDefault(r =>
                    r.CloseDate == dto.CloseDate
                    && r.Branch == dto.Branch
                    && r.ItemCode == dto.ItemCode
                );
                if (ex == null)
                {
                    _db.NxtRows.Add(FromDto(dto));
                }
                else
                {
                    ex.OpeningStock = dto.OpeningStock;
                    ex.OpeningSource = dto.OpeningSource;
                    ex.GiftIn = dto.GiftIn;
                    ex.ReceiveBranch = dto.ReceiveBranch;
                    ex.TransferBranch = dto.TransferBranch;
                    ex.CancelBasket = dto.CancelBasket;
                    ex.SapoSold = dto.SapoSold;
                    ex.Adjustment = dto.Adjustment;
                    ex.ActualStock = dto.ActualStock;
                    ex.SoldNotPicked = dto.SoldNotPicked;
                    ex.StockStatus = dto.StockStatus;
                    ex.Revenue = dto.Revenue;
                    ex.OrderCount = dto.OrderCount;
                    ex.TransferNotes =
                        dto.TransferNotes != null
                            ? JsonSerializer.Serialize(dto.TransferNotes)
                            : null;
                    ex.Inactive = dto.Inactive;
                    ex.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _db.SaveChangesAsync();
            return new ResponseValue<object>(
                new { success = true, count = dtos.Count },
                "Cập nhật dữ liệu thành công",
                StatusReponse.Success
            );
        }

        // ─── LOGS (dùng activity_logs) ────────────────────────────────────────

        [RequirePermission("sales.nxt.edit_quatity_nxt")]
        [HttpPost("rows/inline")]
        public async Task<ResponseValue<object>> InlineEditRow([FromBody] NxtRowDto dto)
        {
            var existing = await _db.NxtRows.FirstOrDefaultAsync(r =>
                r.CloseDate == dto.CloseDate && r.Branch == dto.Branch && r.ItemCode == dto.ItemCode
            );
            if (existing == null)
                return new ResponseValue<object>(null, "Không tìm thấy dòng dữ liệu", StatusReponse.Error);

            existing.GiftIn = dto.GiftIn;
            existing.ReceiveBranch = dto.ReceiveBranch;
            existing.TransferBranch = dto.TransferBranch;
            existing.CancelBasket = dto.CancelBasket;
            existing.Adjustment = dto.Adjustment;
            existing.ActualStock = dto.ActualStock;
            existing.SoldNotPicked = dto.SoldNotPicked;
            existing.StockStatus = dto.StockStatus;
            existing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return new ResponseValue<object>(new { success = true }, "Đã lưu chỉnh sửa", StatusReponse.Success);
        }

        [RequirePermission("sales.nxt.manage_logs")]
        [HttpGet("logs")]
        public async Task<ResponseValue<IEnumerable<object>>> GetLogs(
            [FromQuery] string? branch    = null,
            [FromQuery] string? type      = null,
            [FromQuery] string? user      = null,
            [FromQuery] string? dateFrom  = null,  // DD/MM/YYYY
            [FromQuery] string? dateTo    = null)   // DD/MM/YYYY
        {
            // NewData là cột jsonb — Postgres không hỗ trợ toán tử LIKE (~~) trực tiếp trên jsonb,
            // nên KHÔNG được gọi .Contains() trên NewData trong phần query còn dịch sang SQL (sẽ
            // lỗi "operator does not exist: jsonb ~~ jsonb"). Chỉ lọc bằng cột text thường
            // (TableName, Action) ngay trong SQL; mọi thứ liên quan nội dung NewData (branch,
            // user, ngày) phải xử lý sau khi đã tải về bộ nhớ.
            var query = _db.ActivityLogs
                .Where(l => l.TableName == "nxt_rows")
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(type) && type != "all")
                query = query.Where(l => l.Action == type);

            var logs = await query
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();

            if (!string.IsNullOrWhiteSpace(user))
                logs = logs.Where(l =>
                    (l.StaffCode != null && l.StaffCode.Contains(user, StringComparison.OrdinalIgnoreCase)) ||
                    (l.NewData != null && l.NewData.Contains(user, StringComparison.OrdinalIgnoreCase))
                ).ToList();

            // Deserialize và lọc chặt hơn ở bộ nhớ
            var result = logs
                .Select(l =>
                {
                    var d = TryParseNewData(l.NewData);
                    var userName = GetStr(d, "userName");
                    return new
                    {
                        id        = l.Id,
                        createdAt = l.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm:ss"),
                        closeDate = GetStr(d, "closeDate"),
                        branch    = GetStr(d, "branch"),
                        type      = l.Action,
                        source    = GetStr(d, "source"),
                        wrongCode = GetStr(d, "wrongCode"),
                        rightCode = GetStr(d, "rightCode"),
                        qty       = GetDecimalOrNull(d, "qty"),
                        note      = GetStr(d, "note"),
                        user      = userName.Length > 0 ? userName : (l.StaffCode ?? ""),
                        status    = GetStr(d, "status"),
                        detail    = GetStr(d, "detail"),
                        rawBranch = GetStr(d, "branch"),
                        rawCloseDate = GetStr(d, "closeDate"),
                    };
                })
                // Lọc chặt branch — log của thao tác hàng loạt có thể ghi nhiều chi nhánh
                // gộp chung (vd "Phú Lợi/Ngô Quyền"), nên phải tách ra rồi kiểm tra từng phần
                // thay vì so sánh bằng tuyệt đối, nếu không sẽ bỏ sót log hợp lệ.
                .Where(r => string.IsNullOrWhiteSpace(branch) || branch == "Tất cả"
                    || (r.rawBranch ?? "").Split(new[] { ',', ';', '/' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim()).Contains(branch))
                // Lọc chặt ngày đóng gói (DD/MM/YYYY so sánh dạng string YYYY-MM-DD) — cùng lý do,
                // log hàng loạt có thể gộp nhiều ngày (vd "01/07/2026, 02/07/2026")
                .Where(r =>
                {
                    if (string.IsNullOrWhiteSpace(dateFrom) && string.IsNullOrWhiteSpace(dateTo)) return true;
                    var closeDates = (r.rawCloseDate ?? "").Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
                    if (closeDates.Count == 0) return true;
                    return closeDates.Any(cd =>
                    {
                        var parts = cd.Split('/');
                        if (parts.Length != 3) return true;
                        var iso = $"{parts[2]}-{parts[1]}-{parts[0]}";
                        if (!string.IsNullOrWhiteSpace(dateFrom) && string.Compare(iso, dateFrom, StringComparison.Ordinal) < 0) return false;
                        if (!string.IsNullOrWhiteSpace(dateTo)   && string.Compare(iso, dateTo,   StringComparison.Ordinal) > 0) return false;
                        return true;
                    });
                })
                .Take(500)   // giới hạn 500 bản ghi khớp gần nhất để tránh quá tải
                .Select(r => (object)new
                {
                    r.id, r.createdAt, r.closeDate, r.branch,
                    r.type, r.source, r.wrongCode, r.rightCode,
                    r.qty, r.note, r.user, r.status, r.detail
                })
                .ToList();

            return new ResponseValue<IEnumerable<object>>(
                result,
                "Lấy danh sách thành công",
                StatusReponse.Success
            );
        }


        /// <summary>
        /// Lấy toàn bộ bút ký liên quan đến 1 ô cụ thể (closeDate + branch + itemCode) từ DB.
        /// Frontend gọi khi user click vào ô trong bảng Tổng quan để truy vết nguồn gốc.
        /// </summary>
        [RequirePermission("sales.nxt.view")]
        [HttpGet("logs/cell")]
        public async Task<ResponseValue<IEnumerable<object>>> GetCellLogs(
            [FromQuery] string closeDate,
            [FromQuery] string branch,
            [FromQuery] string itemCode)
        {
            if (string.IsNullOrWhiteSpace(closeDate) || string.IsNullOrWhiteSpace(branch) || string.IsNullOrWhiteSpace(itemCode))
                return new ResponseValue<IEnumerable<object>>([], "Thiếu tham số", StatusReponse.Error);

            // NewData là cột jsonb — Postgres không hỗ trợ LIKE (~~) trực tiếp trên jsonb, nên
            // KHÔNG được lọc theo nội dung NewData ngay trong query dịch sang SQL (sẽ lỗi
            // "operator does not exist: jsonb ~~ jsonb"). Chỉ lọc theo TableName (cột text
            // thường) trong SQL; lọc theo nội dung NewData thực hiện sau khi đã tải về bộ nhớ.
            var candidateLogs = await _db.ActivityLogs
                .Where(l => l.TableName == "nxt_rows")
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();

            var logs = candidateLogs
                .Where(l => l.NewData != null
                    && l.NewData.Contains(closeDate, StringComparison.Ordinal)
                    && l.NewData.Contains(branch, StringComparison.Ordinal))
                .ToList();

            // Lọc chặt hơn: itemCode phải có trong detail hoặc là wrongCode/rightCode
            var result = logs
                .Select(l =>
                {
                    var d = TryParseNewData(l.NewData);
                    var userName = GetStr(d, "userName");
                    var detail = GetStr(d, "detail");
                    var wrongCode = GetStr(d, "wrongCode");
                    var rightCode = GetStr(d, "rightCode");
                    return new
                    {
                        id          = l.Id,
                        createdAt   = l.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm:ss"),
                        closeDate   = GetStr(d, "closeDate"),
                        branch      = GetStr(d, "branch"),
                        type        = l.Action,
                        source      = GetStr(d, "source"),
                        wrongCode   = wrongCode,
                        rightCode   = rightCode,
                        qty         = GetDecimalOrNull(d, "qty"),
                        note        = GetStr(d, "note"),
                        user        = userName.Length > 0 ? userName : (l.StaffCode ?? ""),
                        status      = GetStr(d, "status"),
                        detail      = detail,
                        staffCode   = l.StaffCode ?? "",
                        ipAddress   = l.IpAddress ?? "",
                        userAgent   = l.UserAgent ?? "",
                        rawCloseDate = GetStr(d, "closeDate"),
                        rawBranch   = GetStr(d, "branch"),
                        rawDetail   = detail,
                        rawWrongCode = wrongCode,
                        rawRightCode = rightCode,
                    };
                })
                // Lọc chặt closeDate + branch — KHÔNG dùng so sánh bằng tuyệt đối, vì log của
                // thao tác nhập hàng loạt (Nạp Sapo, Nạp Gói ra...) có thể gộp nhiều ngày/chi
                // nhánh trong 1 bản ghi (vd closeDate="01/07/2026, 02/07/2026", branch="Phú Lợi/Ngô
                // Quyền") — so bằng tuyệt đối sẽ luôn trượt và ô sẽ hiện "0 bút ký" dù dữ liệu có
                // trong DB. Phải tách theo dấu phân cách rồi kiểm tra có chứa giá trị cần tìm không.
                .Where(r =>
                    (r.rawCloseDate ?? "").Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim()).Contains(closeDate) &&
                    (r.rawBranch ?? "").Split(new[] { ',', ';', '/' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim()).Contains(branch)
                )
                // itemCode phải xuất hiện trong detail HOẶC là wrongCode/rightCode
                .Where(r =>
                    (r.rawDetail != null && r.rawDetail.Contains("|" + itemCode + ":")) ||
                    (r.rawDetail != null && r.rawDetail.StartsWith(itemCode + ":")) ||
                    r.rawWrongCode == itemCode ||
                    r.rawRightCode == itemCode
                )
                .Select(r => (object)new
                {
                    r.id, r.createdAt, r.closeDate, r.branch,
                    r.type, r.source, r.wrongCode, r.rightCode,
                    r.qty, r.note, r.user, r.status, r.detail,
                    r.staffCode, r.ipAddress, r.userAgent
                })
                .ToList();

            return new ResponseValue<IEnumerable<object>>(
                result,
                "Lấy bút ký ô thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("sales.nxt.manage_logs")]
        [HttpPost("logs")]
        public async Task<ResponseValue<object>> AddLog([FromBody] NxtLogDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.StaffCode == dto.LoginCode);

            var log = new ActivityLog
            {
                UserId = user?.Id,
                StaffCode = dto.LoginCode,
                Action = dto.Type,
                TableName = "nxt_rows",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                NewData = JsonSerializer.Serialize(
                    new
                    {
                        closeDate = dto.CloseDate,
                        branch = dto.Branch,
                        source = dto.Source ?? "",
                        wrongCode = dto.WrongCode,
                        rightCode = dto.RightCode,
                        qty = dto.Qty,
                        note = dto.Note ?? "",
                        userName = dto.UserName ?? "",
                        status = dto.Status,
                        detail = dto.Detail ?? "",
                    }
                ),
                CreatedAt = DateTime.UtcNow,
            };
            _db.ActivityLogs.Add(log);
            await _db.SaveChangesAsync();
            return new ResponseValue<object>(
                new { success = true, id = log.Id },
                "Tạo log thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("sales.nxt.delete_logs")]
        [HttpDelete("logs/{id:long}")]
        public async Task<ResponseValue<object>> DeleteLog(long id)
        {
            var log = await _db.ActivityLogs.FindAsync(id);
            if (log == null || log.TableName != "nxt_rows")
                return new ResponseValue<object>(null, "Không tìm thấy log", StatusReponse.Error);
            _db.ActivityLogs.Remove(log);
            await _db.SaveChangesAsync();
            return new ResponseValue<object>(
                new { success = true },
                "Đã xóa log",
                StatusReponse.Success
            );
        }

        [RequirePermission("sales.nxt.delete_logs")]
        [HttpDelete("logs")]
        public async Task<ResponseValue<object>> ClearLogs()
        {
            var logs = _db.ActivityLogs.Where(l => l.TableName == "nxt_rows");
            _db.ActivityLogs.RemoveRange(logs);
            await _db.SaveChangesAsync();
            return new ResponseValue<object>(
                new { success = true },
                "Xóa log thành công",
                StatusReponse.Success
            );
        }

        // ─── HELPERS ──────────────────────────────────────────────────────────

        // JsonElement.GetValueOrDefault trả về ValueKind.Undefined nếu thiếu key — gọi .GetString()
        // trên đó sẽ ném InvalidOperationException. Log cũ/log thiếu field sẽ làm cả request 500.
        // Dùng TryGetValue + kiểm ValueKind để luôn an toàn, trả "" thay vì crash.
        private static string GetStr(Dictionary<string, JsonElement>? d, string key) =>
            d != null && d.TryGetValue(key, out var v) && v.ValueKind == JsonValueKind.String
                ? (v.GetString() ?? "")
                : "";

        private static decimal? GetDecimalOrNull(Dictionary<string, JsonElement>? d, string key) =>
            d != null && d.TryGetValue(key, out var v) && v.ValueKind == JsonValueKind.Number
                ? v.GetDecimal()
                : (decimal?)null;

        // NewData có thể null/rỗng/JSON hỏng (dữ liệu cũ) — không để 1 bản ghi lỗi làm sập cả request.
        private static Dictionary<string, JsonElement>? TryParseNewData(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try { return JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json); }
            catch (JsonException) { return null; }
        }

        private static object ToDto(NxtRow r) =>
            new
            {
                closeDate = r.CloseDate,
                branch = r.Branch,
                itemCode = r.ItemCode,
                openingStock = r.OpeningStock,
                openingSource = r.OpeningSource ?? "",
                giftIn = r.GiftIn,
                receiveBranch = r.ReceiveBranch,
                transferBranch = r.TransferBranch,
                cancelBasket = r.CancelBasket,
                sapoSold = r.SapoSold,
                adjustment = r.Adjustment,
                actualStock = r.ActualStock,
                soldNotPicked = r.SoldNotPicked,
                stockStatus = r.StockStatus ?? "",
                revenue = r.Revenue,
                orderCount = r.OrderCount,
                transferNotes = r.TransferNotes != null
                    ? JsonSerializer.Deserialize<object>(r.TransferNotes)
                    : new object[0],
                inactive = r.Inactive,
            };

        private static NxtRow FromDto(NxtRowDto dto) =>
            new NxtRow
            {
                CloseDate = dto.CloseDate,
                Branch = dto.Branch,
                ItemCode = dto.ItemCode,
                OpeningStock = dto.OpeningStock,
                OpeningSource = dto.OpeningSource,
                GiftIn = dto.GiftIn,
                ReceiveBranch = dto.ReceiveBranch,
                TransferBranch = dto.TransferBranch,
                CancelBasket = dto.CancelBasket,
                SapoSold = dto.SapoSold,
                Adjustment = dto.Adjustment,
                ActualStock = dto.ActualStock,
                SoldNotPicked = dto.SoldNotPicked,
                StockStatus = dto.StockStatus,
                Revenue = dto.Revenue,
                OrderCount = dto.OrderCount,
                TransferNotes =
                    dto.TransferNotes != null ? JsonSerializer.Serialize(dto.TransferNotes) : null,
                Inactive = dto.Inactive,
            };
    }

    public class NxtRowDto
    {
        public string CloseDate { get; set; } = null!;
        public string Branch { get; set; } = null!;
        public string ItemCode { get; set; } = null!;
        public decimal OpeningStock { get; set; }
        public string? OpeningSource { get; set; }
        public decimal GiftIn { get; set; }
        public decimal ReceiveBranch { get; set; }
        public decimal TransferBranch { get; set; }
        public decimal CancelBasket { get; set; }
        public decimal SapoSold { get; set; }
        public decimal Adjustment { get; set; }
        public decimal ActualStock { get; set; }
        public decimal SoldNotPicked { get; set; }
        public string? StockStatus { get; set; }
        public decimal Revenue { get; set; }
        public decimal OrderCount { get; set; }
        public object[]? TransferNotes { get; set; }
        public bool Inactive { get; set; }
    }

    public class NxtLogDto
    {
        public string CloseDate { get; set; } = null!;
        public string Branch { get; set; } = null!;
        public string Type { get; set; } = null!;
        public string? Source { get; set; }
        public string WrongCode { get; set; } = null!;
        public string RightCode { get; set; } = null!;
        public decimal Qty { get; set; }
        public string? Note { get; set; }
        public string LoginCode { get; set; } = null!;
        public string? UserName { get; set; }
        public string Status { get; set; } = null!;
        public string? Detail { get; set; }
    }
}
