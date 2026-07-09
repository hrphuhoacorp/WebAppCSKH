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
    public class NxtSapoPendingController : ControllerBase
    {
        private readonly MemBerContext _db;

        public NxtSapoPendingController(MemBerContext db)
        {
            _db = db;
        }

        [RequirePermission("sales.nxt.view")]
        [HttpGet]
        public async Task<ResponseValue<IEnumerable<object>>> GetAll()
        {
            var records = await _db.NxtSapoPendings
                .OrderBy(r => r.Status == "completed" ? 1 : 0)
                .ThenByDescending(r => r.CreatedAt)
                .ToListAsync();
            return new ResponseValue<IEnumerable<object>>(
                records.Select(ToDto),
                "Lấy danh sách thành công",
                StatusReponse.Success
            );
        }

        // Create/Complete/Delete đã chuyển sang NxtController (GET "sapo-pending", ...) — nơi có
        // NxtService xử lý atomically cùng patch NxtRow.Adjustment/StockStatus + ghi ActivityLog
        // trong 1 transaction, thay vì tách rời như ở đây trước đây. Controller này chỉ còn giữ lại
        // GET (đọc thuần) vì bootNxt (nxt-core.js, chưa xóa) vẫn gọi để hiện số đếm ở tab badge.

        private static object ToDto(NxtSapoPending r) => new
        {
            id = r.Id,
            closeDate = r.CloseDate,
            branch = r.Branch,
            itemCode = r.ItemCode,
            qty = r.Qty,
            reason = r.Reason ?? "",
            note = r.Note ?? "",
            status = r.Status,
            createdBy = r.CreatedBy ?? "",
            createdByName = r.CreatedByName ?? "",
            createdAt = r.CreatedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
            createdAtRaw = r.CreatedAt?.ToString("o"),
            sapoDate = r.SapoDate ?? "",
            sapoOrderCode = r.SapoOrderCode ?? "",
            completedBy = r.CompletedBy ?? "",
            completedByName = r.CompletedByName ?? "",
            completedAt = r.CompletedAt?.AddHours(7).ToString("dd/MM/yyyy HH:mm"),
            completionNote = r.CompletionNote ?? "",
            positiveAdjDate = r.PositiveAdjDate ?? "",
        };
    }
}
