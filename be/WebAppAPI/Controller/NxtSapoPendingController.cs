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

        [RequirePermission("sales.nxt.edit")]
        [HttpPost]
        public async Task<ResponseValue<object>> Create([FromBody] NxtSapoPendingCreateDto dto)
        {
            var record = new NxtSapoPending
            {
                CloseDate = dto.CloseDate,
                Branch = dto.Branch,
                ItemCode = dto.ItemCode,
                Qty = dto.Qty,
                Reason = string.IsNullOrWhiteSpace(dto.Reason) ? "Đã lấy - chờ Sapo" : dto.Reason,
                Note = dto.Note,
                Status = "pending",
                CreatedBy = dto.LoginCode,
                CreatedByName = dto.DisplayName,
                CreatedAt = DateTime.UtcNow,
            };
            _db.NxtSapoPendings.Add(record);
            await _db.SaveChangesAsync();
            return new ResponseValue<object>(ToDto(record), "Đã tạo mục treo Sapo", StatusReponse.Success);
        }

        [RequirePermission("sales.nxt.edit")]
        [HttpPost("{id:int}/complete")]
        public async Task<ResponseValue<object>> Complete(int id, [FromBody] NxtSapoPendingCompleteDto dto)
        {
            var record = await _db.NxtSapoPendings.FindAsync(id);
            if (record == null)
                return new ResponseValue<object>(null, "Không tìm thấy mục treo", StatusReponse.Error);
            if (record.Status == "completed")
                return new ResponseValue<object>(null, "Mục này đã hoàn thành rồi", StatusReponse.Error);

            record.Status = "completed";
            record.SapoDate = dto.SapoDate;
            record.SapoOrderCode = dto.SapoOrderCode;
            record.CompletedBy = dto.LoginCode;
            record.CompletedByName = dto.DisplayName;
            record.CompletedAt = DateTime.UtcNow;
            record.CompletionNote = dto.CompletionNote;
            record.PositiveAdjDate = dto.SapoDate;
            record.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return new ResponseValue<object>(ToDto(record), "Đã hoàn thành", StatusReponse.Success);
        }

        [RequirePermission("sales.nxt.edit")]
        [HttpDelete("{id:int}")]
        public async Task<ResponseValue<object>> Delete(int id)
        {
            var record = await _db.NxtSapoPendings.FindAsync(id);
            if (record == null)
                return new ResponseValue<object>(null, "Không tìm thấy", StatusReponse.Error);
            if (record.Status == "completed")
                return new ResponseValue<object>(null, "Không thể xóa mục đã hoàn thành", StatusReponse.Error);

            _db.NxtSapoPendings.Remove(record);
            await _db.SaveChangesAsync();
            return new ResponseValue<object>(new { success = true }, "Đã hủy treo", StatusReponse.Success);
        }

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

    public class NxtSapoPendingCreateDto
    {
        public string CloseDate { get; set; } = null!;
        public string Branch { get; set; } = null!;
        public string ItemCode { get; set; } = null!;
        public decimal Qty { get; set; }
        public string? Reason { get; set; }
        public string? Note { get; set; }
        public string LoginCode { get; set; } = null!;
        public string? DisplayName { get; set; }
    }

    public class NxtSapoPendingCompleteDto
    {
        public string? SapoDate { get; set; }
        public string? SapoOrderCode { get; set; }
        public string? CompletionNote { get; set; }
        public string LoginCode { get; set; } = null!;
        public string? DisplayName { get; set; }
    }
}
