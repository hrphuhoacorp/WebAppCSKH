using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Services;

namespace WebAppAPI.Controller;

[ApiController]
[Route("api/nxt")]
[Authorize]
public class NxtController(NxtService svc) : ControllerBase
{
    private string UserName() =>
        User.FindFirstValue("username") ?? User.FindFirstValue(ClaimTypes.Name) ?? "unknown";

    [HttpGet("bootstrap")]
    public IActionResult Bootstrap() => Ok(svc.GetBootstrap());

    // ─── Dashboard ────────────────────────────────────────────────────────────

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard(
        [FromQuery] string? dateFrom, [FromQuery] string? dateTo,
        [FromQuery] string? branch, [FromQuery] string? rowFilter)
    {
        var today = DateTime.UtcNow.AddHours(7).ToString("yyyy-MM-dd");
        return Ok(await svc.GetDashboard(dateFrom ?? today, dateTo ?? today, branch, rowFilter ?? "ALL"));
    }

    // ─── Gói ra ──────────────────────────────────────────────────────────────

    [HttpPost("gift-out/parse")]
    public IActionResult ParseGiftOut([FromBody] NxtParseTextReq req)
    {
        if (string.IsNullOrWhiteSpace(req.Text)) return BadRequest("Thiếu text.");
        return Ok(svc.ParseGiftText(req.Text, req.Branch ?? "", req.Date ?? "", req.Note));
    }

    [HttpPost("gift-out")]
    public async Task<IActionResult> SaveGiftOut([FromBody] NxtSaveGiftReq req)
    {
        if (req.Rows == null || !req.Rows.Any()) return BadRequest("Không có dòng nào.");
        return Ok(await svc.SaveGiftRows(req.Rows, req.Date ?? "", req.Branch ?? "", req.CodeType, req.Note, UserName()));
    }

    // ─── Tồn CN ──────────────────────────────────────────────────────────────

    [HttpPost("stock/parse")]
    public IActionResult ParseStock([FromBody] NxtParseTextReq req)
    {
        if (string.IsNullOrWhiteSpace(req.Text)) return BadRequest("Thiếu text.");
        return Ok(svc.ParseStockText(req.Text, req.Branch ?? "", req.Date ?? ""));
    }

    [HttpPost("stock")]
    public async Task<IActionResult> SaveStock([FromBody] NxtSaveStockReq req)
    {
        if (req.Rows == null || !req.Rows.Any()) return BadRequest("Không có dòng nào.");
        return Ok(await svc.SaveStockRows(req.Rows, req.SourceText, UserName()));
    }

    [HttpGet("stock")]
    public async Task<IActionResult> GetStock([FromQuery] string? date, [FromQuery] string? branch)
    {
        var today = DateTime.UtcNow.AddHours(7).ToString("yyyy-MM-dd");
        return Ok(await svc.GetStockRowsForDate(date ?? today, branch ?? ""));
    }

    // ─── Hủy giỏ ─────────────────────────────────────────────────────────────

    [HttpPost("cancel/parse")]
    public IActionResult ParseCancel([FromBody] NxtParseTextReq req)
    {
        if (string.IsNullOrWhiteSpace(req.Text)) return BadRequest("Thiếu text.");
        return Ok(svc.ParseGiftText(req.Text, req.Branch ?? "", req.Date ?? "", req.Note));
    }

    [HttpPost("cancel")]
    public async Task<IActionResult> SaveCancel([FromBody] NxtSaveCancelReq req)
    {
        if (req.Rows == null || !req.Rows.Any()) return BadRequest("Không có dòng nào.");
        return Ok(await svc.SaveCancelRows(req.Rows, req.Date ?? "", req.Branch ?? "", req.Reason ?? "Hủy giỏ", req.Note, UserName()));
    }

    // ─── Điều chỉnh mã ───────────────────────────────────────────────────────

    [HttpPost("adjustment")]
    public async Task<IActionResult> SaveAdjustment([FromBody] NxtAdjInputDto req)
    {
        if (string.IsNullOrWhiteSpace(req.WrongCode)) return BadRequest("Thiếu mã gốc.");
        return Ok(new { importId = await svc.SaveAdjustment(req, UserName()) });
    }

    [HttpGet("adjustments")]
    public async Task<IActionResult> GetAdjustments([FromQuery] string? dateFrom, [FromQuery] string? dateTo, [FromQuery] string? branch)
        => Ok(await svc.GetAdjustments(dateFrom, dateTo, branch));

    // ─── Nạp Sapo ────────────────────────────────────────────────────────────

    [HttpPost("sapo/preview")]
    public async Task<IActionResult> PreviewSapo(IFormFile file, [FromForm] string? date)
    {
        if (file == null || file.Length == 0) return BadRequest("Chưa chọn file.");
        return Ok(await svc.PreviewSapoFile(file, date));
    }

    [HttpPost("sapo/import")]
    public async Task<IActionResult> ImportSapo(IFormFile file, [FromForm] string? date)
    {
        if (file == null || file.Length == 0) return BadRequest("Chưa chọn file.");
        return Ok(await svc.ImportSapoFile(file, date, UserName()));
    }

    [HttpPost("sapo/undo/{importId}")]
    public async Task<IActionResult> UndoSapo(string importId)
    {
        if (string.IsNullOrWhiteSpace(importId)) return BadRequest("Thiếu importId.");
        return Ok(new { message = await svc.UndoSapoImport(importId) });
    }

    [HttpGet("sapo/imports")]
    public async Task<IActionResult> GetSapoImports() => Ok(await svc.GetSapoImports());

    // ─── Kiểm tra mã ─────────────────────────────────────────────────────────

    [HttpGet("check-code")]
    public async Task<IActionResult> CheckCode([FromQuery] string? date, [FromQuery] string? branch, [FromQuery] string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return BadRequest("Thiếu mã.");
        return Ok(await svc.CheckCode(date ?? "", branch ?? "", code));
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

public record NxtParseTextReq(string? Text, string? Branch, string? Date, string? Note);
public record NxtSaveGiftReq(List<NxtGiftRowDto>? Rows, string? Date, string? Branch, string? CodeType, string? Note);
public record NxtSaveStockReq(List<NxtStockRowDto>? Rows, string? SourceText);
public record NxtSaveCancelReq(List<NxtGiftRowDto>? Rows, string? Date, string? Branch, string? Reason, string? Note);
