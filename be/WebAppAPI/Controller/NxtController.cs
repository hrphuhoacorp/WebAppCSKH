using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppAPI.Authorization;
using WebAppAPI.Services;
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
        private readonly INxtService _nxtService;

        public NxtController(MemBerContext db, INxtService nxtService)
        {
            _db = db;
            _nxtService = nxtService;
        }

        // ─── TỔNG QUAN (React/MUI — backend tính Lệch/KPI/gợi ý, frontend chỉ hiển thị) ────────
        // Tái sử dụng nguyên vẹn các endpoint logs/logs-cell bên dưới cho modal Truy vết. Các tab
        // khác (Gói ra, Tồn CN, Nạp Sapo...) vẫn dùng rows/rows-batch/rows-inline cũ cho tới lượt
        // migrate — nên các endpoint CRUD gốc bên dưới giữ nguyên, KHÔNG xóa.

        [RequirePermission("sales.nxt.view")]
        [HttpGet("overview")]
        public async Task<ResponseValue<IEnumerable<NxtOverviewRowDto>>> GetOverview(
            [FromQuery] string? branch = null,
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null,
            [FromQuery] string? status = null
        )
        {
            var rows = await _nxtService.GetOverviewRowsAsync(
                new NxtOverviewFilterDto
                {
                    Branch = branch,
                    DateFrom = dateFrom,
                    DateTo = dateTo,
                    Status = status,
                }
            );
            return new ResponseValue<IEnumerable<NxtOverviewRowDto>>(
                rows,
                "Lấy dữ liệu Tổng quan thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("sales.nxt.view")]
        [HttpGet("overview/kpis")]
        public async Task<ResponseValue<NxtOverviewKpisDto>> GetOverviewKpis(
            [FromQuery] string? branch = null,
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null,
            [FromQuery] string? status = null
        )
        {
            var kpis = await _nxtService.GetOverviewKpisAsync(
                new NxtOverviewFilterDto
                {
                    Branch = branch,
                    DateFrom = dateFrom,
                    DateTo = dateTo,
                    Status = status,
                }
            );
            return new ResponseValue<NxtOverviewKpisDto>(kpis, "Lấy KPI thành công", StatusReponse.Success);
        }

        [RequirePermission("sales.nxt.view")]
        [HttpGet("overview/check-days")]
        public async Task<ResponseValue<IEnumerable<NxtCheckDayDto>>> GetOverviewCheckDays()
        {
            var days = await _nxtService.GetCheckDaysAsync();
            return new ResponseValue<IEnumerable<NxtCheckDayDto>>(
                days,
                "Lấy Ngày cần kiểm tra thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("sales.nxt.edit_quatity_nxt")]
        [HttpPost("overview/inline-edit")]
        public async Task<ResponseValue<NxtOverviewRowDto>> InlineEditOverview([FromBody] NxtInlineEditRequestDto dto)
        {
            // Lỗi (không tìm thấy dòng / xung đột dữ liệu) ném exception, GlobalExceptionMiddleware
            // tự trả đúng mã HTTP — không tự dựng ResponseValue lỗi thủ công ở đây nữa.
            var row = await _nxtService.InlineEditAsync(dto);
            return new ResponseValue<NxtOverviewRowDto>(row, "Đã lưu chỉnh sửa thành công.", StatusReponse.Success);
        }

        [RequirePermission("sales.nxt.delete_logs")]
        [HttpDelete("overview/rows")]
        public async Task<ResponseValue<NxtSoftDeleteResultDto>> SoftDeleteOverviewRows(
            [FromBody] NxtSoftDeleteRequestDto dto
        )
        {
            var result = await _nxtService.SoftDeleteRowsAsync(dto);
            return new ResponseValue<NxtSoftDeleteResultDto>(
                result,
                $"Đã xóa {result.DeletedCount} dòng",
                StatusReponse.Success
            );
        }

        // ─── GÓI RA ───────────────────────────────────────────────────────────
        // Frontend tự parse-preview text (xem trước) — chỉ gửi xuống đây các dòng ĐÃ đọc hợp lệ.

        [RequirePermission("sales.nxt.edit")]
        [HttpPost("gift-in")]
        public async Task<ResponseValue<NxtApplyBatchResultDto>> ApplyGiftIn([FromBody] NxtApplyBatchRequestDto dto)
        {
            var result = await _nxtService.ApplyGiftInAsync(dto);
            return new ResponseValue<NxtApplyBatchResultDto>(
                result,
                "Đã cộng Gói ra vào Tổng quan.",
                StatusReponse.Success
            );
        }

        // ─── TỒN CN ───────────────────────────────────────────────────────────
        // Frontend đã parse-preview + gộp dòng (mergeStockRows) + tách sẵn dòng nào là "chuyển CN".

        [RequirePermission("sales.nxt.edit")]
        [HttpPost("stock")]
        public async Task<ResponseValue<NxtApplyBatchResultDto>> ApplyStock([FromBody] NxtApplyStockRequestDto dto)
        {
            var result = await _nxtService.ApplyStockAsync(dto);
            return new ResponseValue<NxtApplyBatchResultDto>(
                result,
                "Đã cập nhật Tồn CN / Chuyển CN vào Tổng quan.",
                StatusReponse.Success
            );
        }

        // ─── HỦY GIỎ ──────────────────────────────────────────────────────────

        [RequirePermission("sales.nxt.edit")]
        [HttpPost("cancel-basket")]
        public async Task<ResponseValue<NxtApplyBatchResultDto>> ApplyCancelBasket([FromBody] NxtApplyBatchRequestDto dto)
        {
            var result = await _nxtService.ApplyCancelBasketAsync(dto);
            return new ResponseValue<NxtApplyBatchResultDto>(
                result,
                "Đã cập nhật Hủy giỏ vào Tổng quan.",
                StatusReponse.Success
            );
        }

        // ─── SAI MÃ ───────────────────────────────────────────────────────────
        // Chỉ Admin/Trưởng ca (sales.nxt.edit) gọi được endpoint áp dụng thật — Nhân viên gửi đề
        // xuất qua POST /Nxt/logs (permission sales.nxt.manage_logs, xem section LOGS bên dưới),
        // không mutate dữ liệu, đúng hành vi applyWrongCode nhánh !isAdminUser() cũ.

        [RequirePermission("sales.nxt.edit")]
        [HttpPost("wrong-code/apply")]
        public async Task<ResponseValue<NxtApplyWrongCodeResultDto>> ApplyWrongCode(
            [FromBody] NxtApplyWrongCodeRequestDto dto
        )
        {
            var result = await _nxtService.ApplyWrongCodeAsync(dto);
            return new ResponseValue<NxtApplyWrongCodeResultDto>(result, result.Message, StatusReponse.Success);
        }

        [RequirePermission("sales.nxt.edit")]
        [HttpPost("late-delivery/apply")]
        public async Task<ResponseValue<NxtLateDeliveryResultDto>> ApplyLateDelivery(
            [FromBody] NxtLateDeliveryRequestDto dto
        )
        {
            var result = await _nxtService.ApplyLateDeliveryAsync(dto);
            return new ResponseValue<NxtLateDeliveryResultDto>(result, result.Message, StatusReponse.Success);
        }

        [RequirePermission("sales.nxt.delete_logs")]
        [HttpPost("logs/{id:long}/rollback")]
        public async Task<ResponseValue<object>> RollbackLog(long id)
        {
            await _nxtService.RollbackLogAsync(id);
            return new ResponseValue<object>(
                new { success = true },
                "Đã hoàn tác và xóa thao tác thành công.",
                StatusReponse.Success
            );
        }

        // ─── SỬA SL ───────────────────────────────────────────────────────────
        // Cùng permission gate với nút "Sửa" ở Tổng quan (xem InlineEditOverview) — không dùng
        // sales.nxt.edit vì đây là quyền sửa số lượng riêng, không phải quyền áp dụng điều chỉnh
        // sai mã/Sapo.

        [RequirePermission("sales.nxt.edit_quatity_nxt")]
        [HttpPost("edit-qty")]
        public async Task<ResponseValue<NxtEditQtyResultDto>> ApplyEditQty([FromBody] NxtEditQtyRequestDto dto)
        {
            var result = await _nxtService.ApplyEditQtyAsync(dto);
            return new ResponseValue<NxtEditQtyResultDto>(result, result.Message, StatusReponse.Success);
        }

        // ─── SAPO TREO ────────────────────────────────────────────────────────
        // Thay thế phần ghi (POST/complete/DELETE) của NxtSapoPendingController cũ — nay patch
        // NxtRow.Adjustment/StockStatus + ghi ActivityLog + mutate NxtSapoPending atomically trong
        // NxtService. NxtSapoPendingController chỉ còn giữ GET cho bootNxt cũ.

        [RequirePermission("sales.nxt.view")]
        [HttpGet("sapo-pending")]
        public async Task<ResponseValue<IEnumerable<NxtSapoPendingDto>>> GetSapoPending()
        {
            var result = await _nxtService.GetSapoPendingAsync();
            return new ResponseValue<IEnumerable<NxtSapoPendingDto>>(result, "Lấy danh sách thành công", StatusReponse.Success);
        }

        [RequirePermission("sales.nxt.edit")]
        [HttpPost("sapo-pending")]
        public async Task<ResponseValue<NxtSapoPendingDto>> CreateSapoPending([FromBody] NxtSapoPendingCreateRequestDto dto)
        {
            var result = await _nxtService.CreateSapoPendingAsync(dto);
            return new ResponseValue<NxtSapoPendingDto>(result, "Đã tạo mục treo Sapo", StatusReponse.Success);
        }

        [RequirePermission("sales.nxt.edit")]
        [HttpPost("sapo-pending/{id:int}/complete")]
        public async Task<ResponseValue<NxtSapoPendingDto>> CompleteSapoPending(
            int id,
            [FromBody] NxtSapoPendingCompleteRequestDto dto
        )
        {
            var result = await _nxtService.CompleteSapoPendingAsync(id, dto);
            return new ResponseValue<NxtSapoPendingDto>(result, "Đã hoàn thành", StatusReponse.Success);
        }

        [RequirePermission("sales.nxt.edit")]
        [HttpDelete("sapo-pending/{id:int}")]
        public async Task<ResponseValue<object>> DeleteSapoPending(
            int id,
            [FromQuery] string? loginCode,
            [FromQuery] string? displayName
        )
        {
            await _nxtService.DeleteSapoPendingAsync(id, loginCode, displayName);
            return new ResponseValue<object>(new { success = true }, "Đã hủy treo", StatusReponse.Success);
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

            NxtRow saved;
            if (existing == null)
            {
                saved = FromDto(dto);
                _db.NxtRows.Add(saved);
            }
            else
            {
                // OCC — xem giải thích đầy đủ ở BatchRows(). Endpoint này cũng có thể ghi đè mù
                // nếu không kiểm tra, vì nó được gọi độc lập (Đổi mã tạm/Sai mã Sapo) ngoài luồng
                // rows/batch chính.
                if (
                    dto.UpdatedAt.HasValue
                    && existing.UpdatedAt.HasValue
                    && dto.UpdatedAt.Value != existing.UpdatedAt.Value
                )
                {
                    return new ResponseValue<object>(
                        new
                        {
                            success = false,
                            conflict = true,
                            updatedAt = existing.UpdatedAt,
                        },
                        "Dữ liệu đã bị thay đổi bởi thao tác khác — vui lòng tải lại trước khi lưu.",
                        StatusReponse.Error
                    );
                }

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
                saved = existing;
            }

            await _db.SaveChangesAsync();
            // Reload để lấy đúng giá trị UpdatedAt đã bị Postgres cắt về độ chính xác micro-giây
            // (xem giải thích đầy đủ ở BatchRows()) — nếu không, lần OCC kế tiếp sẽ tự báo xung
            // đột giả với chính dòng vừa lưu.
            await _db.Entry(saved).ReloadAsync();
            return new ResponseValue<object>(
                new { success = true, updatedAt = saved.UpdatedAt },
                "Lưu dữ liệu thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("sales.nxt.edit")]
        [HttpPost("rows/batch")]
        public async Task<ResponseValue<object>> BatchRows([FromBody] List<NxtRowDto> dtos)
        {
            var dedupedDtos = dtos.GroupBy(d => (d.CloseDate, d.Branch, d.ItemCode))
                .Select(g => g.Last())
                .ToList();

            var existingRows = await _db.NxtRows.ToListAsync();
            var logs = new List<ActivityLog>();
            var savedRows = new List<object>();
            var conflicts = new List<object>();

            foreach (var dto in dedupedDtos)
            {
                var ex = existingRows.FirstOrDefault(r =>
                    r.CloseDate == dto.CloseDate
                    && r.Branch == dto.Branch
                    && r.ItemCode == dto.ItemCode
                );

                if (ex == null)
                {
                    // TH1: dòng mới — hoặc do user vừa nạp dữ liệu lần đầu cho ngày/mã này (đã có
                    // log riêng đúng thao tác — Nạp Gói ra/Nạp Tồn CN/...— ghi trong cùng request
                    // rồi), hoặc do cơ chế tồn đầu ngày mai tự tạo (đã có sẵn nguồn gốc riêng ở
                    // NxtRow.OpeningSource, hiện khi bấm Truy vết cột Tồn đầu). KHÔNG ghi thêm log
                    // "Hệ thống tự tạo dòng" ở đây nữa — trước đây log này chạy cho MỌI dòng mới,
                    // không thêm thông tin gì so với 2 nguồn trên, chỉ làm Nhật ký bị spam.
                    var newRow = FromDto(dto);
                    _db.NxtRows.Add(newRow);

                    savedRows.Add(
                        new
                        {
                            closeDate = dto.CloseDate,
                            branch = dto.Branch,
                            itemCode = dto.ItemCode,
                            row = newRow,
                        }
                    );
                }
                else
                {
                    // Optimistic concurrency: client gửi kèm updatedAt lần cuối nó biết. Nếu DB đã
                    // bị thao tác khác ghi mới hơn từ lúc đó, KHÔNG ghi đè mù (Lost Update) — bỏ
                    // qua dòng này, ghi log xung đột để có dấu vết, và báo lại cho client biết.
                    if (
                        dto.UpdatedAt.HasValue
                        && ex.UpdatedAt.HasValue
                        && dto.UpdatedAt.Value != ex.UpdatedAt.Value
                    )
                    {
                        logs.Add(
                            CreateSystemLog(
                                dto,
                                "Xung đột dữ liệu",
                                $"Bỏ qua ghi đè vì dữ liệu đã bị thay đổi bởi thao tác khác sau lần tải gần nhất của client."
                            )
                        );
                        conflicts.Add(
                            new
                            {
                                closeDate = dto.CloseDate,
                                branch = dto.Branch,
                                itemCode = dto.ItemCode,
                            }
                        );
                        continue;
                    }

                    // TH2: Cập nhật mã cũ
                    if (IsDataChanged(ex, dto))
                    {
                        string detail = GenerateChangeDetail(ex, dto);
                        UpdateRowValues(ex, dto);

                        // Ghi log chi tiết: Ai đã thay đổi cái gì từ bao nhiêu thành bao nhiêu
                        logs.Add(CreateSystemLog(dto, "Cập nhật dữ liệu", detail, null));
                    }
                    savedRows.Add(
                        new
                        {
                            closeDate = dto.CloseDate,
                            branch = dto.Branch,
                            itemCode = dto.ItemCode,
                            row = ex,
                        }
                    );
                }
            }

            // Lưu dữ liệu XNT và bảng Log cùng một lúc
            if (logs.Count > 0)
                _db.ActivityLogs.AddRange(logs);

            await _db.SaveChangesAsync();

            // QUAN TRỌNG: sau SaveChangesAsync(), entity trong bộ nhớ vẫn giữ nguyên giá trị
            // DateTime.UtcNow gốc ở độ chính xác 100ns (tick) của .NET — nhưng Postgres `timestamp`
            // chỉ lưu được độ chính xác micro-giây (ít hơn .NET 1 chữ số), nên giá trị THỰC SỰ nằm
            // trong DB đã bị cắt bớt so với giá trị đang có trong bộ nhớ. Nếu trả thẳng giá trị
            // trong bộ nhớ (chưa cắt) cho client, lần sync KẾ TIẾP client gửi lại đúng giá trị đó,
            // nhưng backend đọc lại từ DB sẽ thấy giá trị ĐÃ BỊ CẮT — khác nhau — và báo "xung đột"
            // giả cho MỌI dòng vừa lưu, dù không có ai khác đụng vào. Phải Reload lại từ DB để lấy
            // đúng giá trị đã thực sự được cắt/lưu trước khi trả về cho client.
            foreach (var sr in savedRows)
            {
                dynamic d = sr;
                await _db.Entry((NxtRow)d.row).ReloadAsync();
            }

            // savedRows chỉ cần trả lại updatedAt mới nhất — client dùng để đồng bộ lại state cục
            // bộ, tránh lần sync KẾ TIẾP từ chính tab này tự xung đột với bản ghi nó vừa lưu.
            var savedRowsResult = savedRows
                .Select(o =>
                {
                    dynamic d = o;
                    return new
                    {
                        closeDate = (string)d.closeDate,
                        branch = (string)d.branch,
                        itemCode = (string)d.itemCode,
                        updatedAt = ((NxtRow)d.row).UpdatedAt,
                    };
                })
                .ToList();

            return new ResponseValue<object>(
                new
                {
                    count = dedupedDtos.Count,
                    savedRows = savedRowsResult,
                    conflicts,
                },
                conflicts.Count > 0
                    ? $"Thành công ({conflicts.Count} dòng bị bỏ qua do xung đột dữ liệu)"
                    : "Thành công",
                StatusReponse.Success
            );
        }

        // 1. Kiểm tra xem dữ liệu có thực sự thay đổi không (để tránh ghi log thừa)
        private bool IsDataChanged(NxtRow ex, NxtRowDto dto)
        {
            return ex.OpeningStock != dto.OpeningStock
                || ex.GiftIn != dto.GiftIn
                || ex.ReceiveBranch != dto.ReceiveBranch
                || ex.TransferBranch != dto.TransferBranch
                || ex.CancelBasket != dto.CancelBasket
                || ex.SapoSold != dto.SapoSold
                || ex.Adjustment != dto.Adjustment
                || ex.ActualStock != dto.ActualStock
                || ex.SoldNotPicked != dto.SoldNotPicked
                || ex.StockStatus != dto.StockStatus
                || ex.Inactive != dto.Inactive;
        }

        // 2. Tạo chuỗi chi tiết thay đổi: "Trường: Cũ -> Mới"
        private string GenerateChangeDetail(NxtRow old, NxtRowDto @new)
        {
            var changes = new List<string>();
            if (old.OpeningStock != @new.OpeningStock)
                changes.Add($"Tồn đầu: {old.OpeningStock} -> {@new.OpeningStock}");
            if (old.GiftIn != @new.GiftIn)
                changes.Add($"Gói ra: {old.GiftIn} -> {@new.GiftIn}");
            if (old.ActualStock != @new.ActualStock)
                changes.Add($"Tồn thực tế: {old.ActualStock} -> {@new.ActualStock}");
            if (old.SoldNotPicked != @new.SoldNotPicked)
                changes.Add($"Bán chưa lấy: {old.SoldNotPicked} -> {@new.SoldNotPicked}");
            if (old.SapoSold != @new.SapoSold)
                changes.Add($"Sapo bán: {old.SapoSold} -> {@new.SapoSold}");
            if (old.Adjustment != @new.Adjustment)
                changes.Add($"Điều chỉnh: {old.Adjustment} -> {@new.Adjustment}");

            return changes.Count > 0 ? string.Join(", ", changes) : "Cập nhật thông tin khác";
        }

        // 3. Hàm tạo đối tượng Log (để ghi vào bảng ActivityLogs)
        // qty: giá trị số lượng có ý nghĩa cho log này (vd Tồn đầu khi tự tạo dòng) — trước đây
        // luôn gán = dto.ActualStock bất kể trường nào thực sự thay đổi, gây hiển thị sai lệch ở
        // Nhật ký. Truyền null nếu không có 1 con số duy nhất đại diện được (vd "Cập nhật dữ liệu"
        // có thể đổi nhiều trường cùng lúc — chi tiết đầy đủ đã nằm trong `detail`).
        private ActivityLog CreateSystemLog(
            NxtRowDto dto,
            string actionType,
            string detail,
            decimal? qty = null
        )
        {
            // Lấy thông tin user đang đăng nhập từ Token
            var staffCode = User.Identity?.Name ?? "System";

            return new ActivityLog
            {
                StaffCode = staffCode,
                Action = actionType,
                TableName = "nxt_rows",
                CreatedAt = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                NewData = JsonSerializer.Serialize(
                    new
                    {
                        closeDate = dto.CloseDate,
                        branch = dto.Branch,
                        itemCode = dto.ItemCode, // Thêm mã hàng vào Log để dễ tìm — dùng để lọc
                        // truy vết ở GetCellLogs, KHÔNG chỉ dựa vào regex trên `detail` (log hệ
                        // thống không theo định dạng "code:qty" như log thao tác thủ công).
                        qty = qty,
                        status = dto.StockStatus,
                        detail = detail,
                        userName = "Hệ thống ghi nhận",
                    }
                ),
            };
        }

        // Hàm Helper để cập nhật giá trị từ DTO vào Entity (Giải quyết lỗi bạn gặp phải)
        private void UpdateRowValues(NxtRow existing, NxtRowDto dto)
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

        // ─── LOGS (dùng activity_logs) ────────────────────────────────────────

        [RequirePermission("sales.nxt.edit_quatity_nxt")]
        [HttpPost("rows/inline")]
        public async Task<ResponseValue<object>> InlineEditRow([FromBody] NxtRowDto dto)
        {
            var existing = await _db.NxtRows.FirstOrDefaultAsync(r =>
                r.CloseDate == dto.CloseDate && r.Branch == dto.Branch && r.ItemCode == dto.ItemCode
            );
            if (existing == null)
                return new ResponseValue<object>(
                    null,
                    "Không tìm thấy dòng dữ liệu",
                    StatusReponse.Error
                );

            // OCC — cùng lý do với UpsertRow(): đây là endpoint "Sửa" trực tiếp trên Tổng quan,
            // gọi độc lập ngoài luồng rows/batch, nên vẫn cần tự kiểm tra để không ghi đè mù.
            if (
                dto.UpdatedAt.HasValue
                && existing.UpdatedAt.HasValue
                && dto.UpdatedAt.Value != existing.UpdatedAt.Value
            )
            {
                return new ResponseValue<object>(
                    new
                    {
                        success = false,
                        conflict = true,
                        updatedAt = existing.UpdatedAt,
                    },
                    "Dữ liệu đã bị thay đổi bởi thao tác khác — vui lòng tải lại trước khi lưu.",
                    StatusReponse.Error
                );
            }

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
            // Reload để lấy đúng giá trị UpdatedAt đã bị Postgres cắt về độ chính xác micro-giây
            // (xem giải thích đầy đủ ở BatchRows()) — nếu không, lần OCC kế tiếp sẽ tự báo xung
            // đột giả với chính dòng vừa lưu.
            await _db.Entry(existing).ReloadAsync();
            return new ResponseValue<object>(
                new { success = true, updatedAt = existing.UpdatedAt },
                "Đã lưu chỉnh sửa",
                StatusReponse.Success
            );
        }

        [RequirePermission("sales.nxt.manage_logs")]
        [HttpGet("logs")]
        public async Task<ResponseValue<IEnumerable<object>>> GetLogs(
            [FromQuery] string? branch = null,
            [FromQuery] string? type = null,
            [FromQuery] string? user = null,
            [FromQuery] string? dateFrom = null, // DD/MM/YYYY
            [FromQuery] string? dateTo = null
        ) // DD/MM/YYYY
        {
            // NewData là cột jsonb — Postgres không hỗ trợ toán tử LIKE (~~) trực tiếp trên jsonb,
            // nên KHÔNG được gọi .Contains() trên NewData trong phần query còn dịch sang SQL (sẽ
            // lỗi "operator does not exist: jsonb ~~ jsonb"). Chỉ lọc bằng cột text thường
            // (TableName, Action) ngay trong SQL; mọi thứ liên quan nội dung NewData (branch,
            // user, ngày) phải xử lý sau khi đã tải về bộ nhớ.
            var query = _db.ActivityLogs.Where(l => l.TableName == "nxt_rows").AsQueryable();

            if (!string.IsNullOrWhiteSpace(type) && type != "all")
                query = query.Where(l => l.Action == type);

            var logs = await query.OrderByDescending(l => l.CreatedAt).ToListAsync();

            if (!string.IsNullOrWhiteSpace(user))
                logs = logs.Where(l =>
                        (
                            l.StaffCode != null
                            && l.StaffCode.Contains(user, StringComparison.OrdinalIgnoreCase)
                        )
                        || (
                            l.NewData != null
                            && l.NewData.Contains(user, StringComparison.OrdinalIgnoreCase)
                        )
                    )
                    .ToList();

            // Deserialize và lọc chặt hơn ở bộ nhớ
            var result = logs.Select(l =>
                {
                    var d = TryParseNewData(l.NewData);
                    var userName = GetStr(d, "userName");
                    return new
                    {
                        id = l.Id,
                        createdAt = l.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm:ss"),
                        closeDate = GetStr(d, "closeDate"),
                        branch = GetStr(d, "branch"),
                        type = l.Action,
                        source = GetStr(d, "source"),
                        wrongCode = GetStr(d, "wrongCode"),
                        rightCode = GetStr(d, "rightCode"),
                        qty = GetDecimalOrNull(d, "qty"),
                        note = GetStr(d, "note"),
                        user = userName.Length > 0 ? userName : (l.StaffCode ?? ""),
                        status = GetStr(d, "status"),
                        detail = GetStr(d, "detail"),
                        rawBranch = GetStr(d, "branch"),
                        rawCloseDate = GetStr(d, "closeDate"),
                    };
                })
                // Lọc chặt branch — log của thao tác hàng loạt có thể ghi nhiều chi nhánh
                // gộp chung (vd "Phú Lợi/Ngô Quyền"), nên phải tách ra rồi kiểm tra từng phần
                // thay vì so sánh bằng tuyệt đối, nếu không sẽ bỏ sót log hợp lệ.
                .Where(r =>
                    string.IsNullOrWhiteSpace(branch)
                    || branch == "Tất cả"
                    || (r.rawBranch ?? "")
                        .Split(new[] { ',', ';', '/' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim())
                        .Contains(branch)
                )
                // Lọc chặt ngày đóng gói (DD/MM/YYYY so sánh dạng string YYYY-MM-DD) — cùng lý do,
                // log hàng loạt có thể gộp nhiều ngày (vd "01/07/2026, 02/07/2026")
                .Where(r =>
                {
                    if (string.IsNullOrWhiteSpace(dateFrom) && string.IsNullOrWhiteSpace(dateTo))
                        return true;
                    var closeDates = (r.rawCloseDate ?? "")
                        .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim())
                        .Where(s => s.Length > 0)
                        .ToList();
                    if (closeDates.Count == 0)
                        return true;
                    return closeDates.Any(cd =>
                    {
                        var parts = cd.Split('/');
                        if (parts.Length != 3)
                            return true;
                        var iso = $"{parts[2]}-{parts[1]}-{parts[0]}";
                        if (
                            !string.IsNullOrWhiteSpace(dateFrom)
                            && string.Compare(iso, dateFrom, StringComparison.Ordinal) < 0
                        )
                            return false;
                        if (
                            !string.IsNullOrWhiteSpace(dateTo)
                            && string.Compare(iso, dateTo, StringComparison.Ordinal) > 0
                        )
                            return false;
                        return true;
                    });
                })
                .Take(500) // giới hạn 500 bản ghi khớp gần nhất để tránh quá tải
                .Select(r =>
                    (object)
                        new
                        {
                            r.id,
                            r.createdAt,
                            r.closeDate,
                            r.branch,
                            r.type,
                            r.source,
                            r.wrongCode,
                            r.rightCode,
                            r.qty,
                            r.note,
                            r.user,
                            r.status,
                            r.detail,
                        }
                )
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
            [FromQuery] string itemCode
        )
        {
            if (
                string.IsNullOrWhiteSpace(closeDate)
                || string.IsNullOrWhiteSpace(branch)
                || string.IsNullOrWhiteSpace(itemCode)
            )
                return new ResponseValue<IEnumerable<object>>(
                    [],
                    "Thiếu tham số",
                    StatusReponse.Error
                );

            // NewData là cột jsonb — Postgres không hỗ trợ LIKE (~~) trực tiếp trên jsonb, nên
            // KHÔNG được lọc theo nội dung NewData ngay trong query dịch sang SQL (sẽ lỗi
            // "operator does not exist: jsonb ~~ jsonb"). Chỉ lọc theo TableName (cột text
            // thường) trong SQL; lọc theo nội dung NewData thực hiện sau khi đã tải về bộ nhớ.
            var candidateLogs = await _db
                .ActivityLogs.Where(l => l.TableName == "nxt_rows")
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();

            var logs = candidateLogs
                .Where(l =>
                    l.NewData != null
                    && l.NewData.Contains(closeDate, StringComparison.Ordinal)
                    && l.NewData.Contains(branch, StringComparison.Ordinal)
                )
                .ToList();

            // Lọc chặt hơn: itemCode phải có trong detail hoặc là wrongCode/rightCode
            var result = logs.Select(l =>
                {
                    var d = TryParseNewData(l.NewData);
                    var userName = GetStr(d, "userName");
                    var detail = GetStr(d, "detail");
                    var wrongCode = GetStr(d, "wrongCode");
                    var rightCode = GetStr(d, "rightCode");
                    var logItemCode = GetStr(d, "itemCode");
                    return new
                    {
                        id = l.Id,
                        createdAt = l.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm:ss"),
                        closeDate = GetStr(d, "closeDate"),
                        branch = GetStr(d, "branch"),
                        type = l.Action,
                        source = GetStr(d, "source"),
                        wrongCode = wrongCode,
                        rightCode = rightCode,
                        qty = GetDecimalOrNull(d, "qty"),
                        note = GetStr(d, "note"),
                        user = userName.Length > 0 ? userName : (l.StaffCode ?? ""),
                        status = GetStr(d, "status"),
                        detail = detail,
                        staffCode = l.StaffCode ?? "",
                        ipAddress = l.IpAddress ?? "",
                        userAgent = l.UserAgent ?? "",
                        rawCloseDate = GetStr(d, "closeDate"),
                        rawBranch = GetStr(d, "branch"),
                        rawDetail = detail,
                        rawWrongCode = wrongCode,
                        rawRightCode = rightCode,
                        rawItemCode = logItemCode,
                    };
                })
                // Lọc chặt closeDate + branch — KHÔNG dùng so sánh bằng tuyệt đối, vì log của
                // thao tác nhập hàng loạt (Nạp Sapo, Nạp Gói ra...) có thể gộp nhiều ngày/chi
                // nhánh trong 1 bản ghi (vd closeDate="01/07/2026, 02/07/2026", branch="Phú Lợi/Ngô
                // Quyền") — so bằng tuyệt đối sẽ luôn trượt và ô sẽ hiện "0 bút ký" dù dữ liệu có
                // trong DB. Phải tách theo dấu phân cách rồi kiểm tra có chứa giá trị cần tìm không.
                .Where(r =>
                    (r.rawCloseDate ?? "")
                        .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim())
                        .Contains(closeDate)
                    && (r.rawBranch ?? "")
                        .Split(new[] { ',', ';', '/' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim())
                        .Contains(branch)
                )
                // itemCode phải xuất hiện trong detail, là wrongCode/rightCode, HOẶC khớp trực
                // tiếp trường itemCode (log hệ thống tự sinh từ rows/batch — "Hệ thống tự tạo
                // dòng"/"Cập nhật dữ liệu"/"Xung đột dữ liệu" — không theo định dạng "code:qty"
                // trong detail như log thao tác thủ công, nên phải khớp qua field riêng).
                .Where(r =>
                    (r.rawDetail != null && r.rawDetail.Contains("|" + itemCode + ":"))
                    || (r.rawDetail != null && r.rawDetail.StartsWith(itemCode + ":"))
                    || r.rawWrongCode == itemCode
                    || r.rawRightCode == itemCode
                    || r.rawItemCode == itemCode
                )
                .Select(r =>
                    (object)
                        new
                        {
                            r.id,
                            r.createdAt,
                            r.closeDate,
                            r.branch,
                            r.type,
                            r.source,
                            r.wrongCode,
                            r.rightCode,
                            r.qty,
                            r.note,
                            r.user,
                            r.status,
                            r.detail,
                            r.staffCode,
                            r.ipAddress,
                            r.userAgent,
                        }
                )
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
            if (string.IsNullOrWhiteSpace(json))
                return null;
            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
            }
            catch (JsonException)
            {
                return null;
            }
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
                updatedAt = r.UpdatedAt,
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

        // Optimistic concurrency: client gửi lại updatedAt lần cuối nó biết được (từ GET rows/
        // rows/batch trước đó). Nếu khác với DB hiện tại nghĩa là có thao tác khác đã ghi đè ở
        // giữa — rows/batch sẽ BỎ QUA thay vì ghi đè mù, tránh Lost Update. Null = client cũ chưa
        // gửi field này, hoặc dòng vừa tạo mới trên client (chưa có updatedAt) — không chặn.
        public DateTime? UpdatedAt { get; set; }
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
