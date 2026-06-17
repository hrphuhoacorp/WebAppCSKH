using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using WebAppInfractor.Data;
using WebAppInfractor.Models;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class NxtController : ControllerBase
    {
        private readonly MemBerContext _db;

        public NxtController(MemBerContext db)
        {
            _db = db;
        }

        // ─── ROWS ─────────────────────────────────────────────────────────────

        [HttpGet("rows")]
        public async Task<IActionResult> GetRows()
        {
            var rows = await _db.NxtRows.OrderBy(r => r.CloseDate).ThenBy(r => r.Branch).ThenBy(r => r.ItemCode).ToListAsync();
            var result = rows.Select(r => ToDto(r));
            return Ok(result);
        }

        [HttpPost("rows/upsert")]
        public async Task<IActionResult> UpsertRow([FromBody] NxtRowDto dto)
        {
            var existing = await _db.NxtRows.FirstOrDefaultAsync(r =>
                r.CloseDate == dto.CloseDate && r.Branch == dto.Branch && r.ItemCode == dto.ItemCode);

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
                existing.Revenue = dto.Revenue;
                existing.OrderCount = dto.OrderCount;
                existing.TransferNotes = dto.TransferNotes != null ? JsonSerializer.Serialize(dto.TransferNotes) : null;
                existing.Inactive = dto.Inactive;
                existing.UpdatedAt = DateTime.UtcNow.AddHours(7);
            }

            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPost("rows/batch")]
        public async Task<IActionResult> BatchRows([FromBody] List<NxtRowDto> dtos)
        {
            var incoming = dtos.Select(d => (d.CloseDate, d.Branch, d.ItemCode)).ToHashSet();

            var existing = await _db.NxtRows.ToListAsync();

            foreach (var row in existing)
            {
                if (!incoming.Contains((row.CloseDate, row.Branch, row.ItemCode)))
                    _db.NxtRows.Remove(row);
            }

            foreach (var dto in dtos)
            {
                var ex = existing.FirstOrDefault(r => r.CloseDate == dto.CloseDate && r.Branch == dto.Branch && r.ItemCode == dto.ItemCode);
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
                    ex.Revenue = dto.Revenue;
                    ex.OrderCount = dto.OrderCount;
                    ex.TransferNotes = dto.TransferNotes != null ? JsonSerializer.Serialize(dto.TransferNotes) : null;
                    ex.Inactive = dto.Inactive;
                    ex.UpdatedAt = DateTime.UtcNow.AddHours(7);
                }
            }

            await _db.SaveChangesAsync();
            return Ok(new { success = true, count = dtos.Count });
        }

        // ─── LOGS (dùng activity_logs) ────────────────────────────────────────

        [HttpGet("logs")]
        public async Task<IActionResult> GetLogs()
        {
            var logs = await _db.ActivityLogs
                .Where(l => l.TableName == "nxt_rows")
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();

            return Ok(logs.Select(l =>
            {
                var d = l.NewData != null
                    ? JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(l.NewData)
                    : null;
                return new
                {
                    id = l.Id,
                    createdAt = l.CreatedAt?.ToString("dd/MM/yyyy HH:mm:ss"),
                    closeDate = d?.GetValueOrDefault("closeDate").GetString() ?? "",
                    branch = d?.GetValueOrDefault("branch").GetString() ?? "",
                    type = l.Action,
                    source = d?.GetValueOrDefault("source").GetString() ?? "",
                    wrongCode = d?.GetValueOrDefault("wrongCode").GetString() ?? "",
                    rightCode = d?.GetValueOrDefault("rightCode").GetString() ?? "",
                    qty = d?.GetValueOrDefault("qty").GetDecimal() ?? 0,
                    note = d?.GetValueOrDefault("note").GetString() ?? "",
                    user = l.StaffCode ?? "",
                    status = d?.GetValueOrDefault("status").GetString() ?? "",
                    detail = d?.GetValueOrDefault("detail").GetString() ?? ""
                };
            }));
        }

        [HttpPost("logs")]
        public async Task<IActionResult> AddLog([FromBody] NxtLogDto dto)
        {
            var log = new ActivityLog
            {
                Action = dto.Type,
                TableName = "nxt_rows",
                StaffCode = dto.User,
                NewData = JsonSerializer.Serialize(new
                {
                    closeDate = dto.CloseDate,
                    branch = dto.Branch,
                    source = dto.Source ?? "",
                    wrongCode = dto.WrongCode,
                    rightCode = dto.RightCode,
                    qty = dto.Qty,
                    note = dto.Note ?? "",
                    status = dto.Status,
                    detail = dto.Detail ?? ""
                }),
                CreatedAt = DateTime.UtcNow.AddHours(7)
            };
            _db.ActivityLogs.Add(log);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, id = log.Id });
        }

        [HttpDelete("logs")]
        public async Task<IActionResult> ClearLogs()
        {
            var logs = _db.ActivityLogs.Where(l => l.TableName == "nxt_rows");
            _db.ActivityLogs.RemoveRange(logs);
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // ─── HELPERS ──────────────────────────────────────────────────────────

        private static object ToDto(NxtRow r) => new
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
            revenue = r.Revenue,
            orderCount = r.OrderCount,
            transferNotes = r.TransferNotes != null
                ? JsonSerializer.Deserialize<object>(r.TransferNotes)
                : new object[0],
            inactive = r.Inactive
        };

        private static NxtRow FromDto(NxtRowDto dto) => new NxtRow
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
            Revenue = dto.Revenue,
            OrderCount = dto.OrderCount,
            TransferNotes = dto.TransferNotes != null ? JsonSerializer.Serialize(dto.TransferNotes) : null,
            Inactive = dto.Inactive
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
        public string User { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string? Detail { get; set; }
    }
}
