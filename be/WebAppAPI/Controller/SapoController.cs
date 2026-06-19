using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Services;

namespace WebAppAPI.Controllers;

[Route("api/sapo")]
[ApiController]
[AllowAnonymous]
public class SapoController : ControllerBase
{
    private readonly SapoService _sapo;
    private readonly IActivityService _activity;
    private const string ADMIN_CODE = "phf2025";

    public SapoController(SapoService sapo, IActivityService activity)
    {
        _sapo = sapo;
        _activity = activity;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] string filter = "last7")
    {
        var result = await _sapo.GetDashboardAsync(filter);
        return Ok(result);
    }

    [HttpGet("dashboard/range")]
    public async Task<IActionResult> GetDashboardRange([FromQuery] string fromDate, [FromQuery] string toDate)
    {
        try
        {
            var result = await _sapo.GetDashboardByRangeAsync(fromDate, toDate);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { ok = false, message = ex.Message });
        }
    }

    [HttpGet("dashboard/month")]
    public async Task<IActionResult> GetDashboardMonth([FromQuery] string month)
    {
        try
        {
            var result = await _sapo.GetDashboardByMonthAsync(month);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { ok = false, message = ex.Message });
        }
    }

    [HttpPost("import")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Import([FromForm] ImportFormDto form)
    {
        if (form.SapoFile == null || form.SapoFile.Length == 0)
            return BadRequest(new { ok = false, message = "Chưa có file Sapo." });

        using var sapoMs = new MemoryStream();
        await form.SapoFile.CopyToAsync(sapoMs);
        var sapoBytes = sapoMs.ToArray();

        byte[]? mappingBytes = null;
        string? mappingFileName = null;
        if (form.MappingFile != null && form.MappingFile.Length > 0)
        {
            using var mMs = new MemoryStream();
            await form.MappingFile.CopyToAsync(mMs);
            mappingBytes = mMs.ToArray();
            mappingFileName = form.MappingFile.FileName;
        }

        var result = await _sapo.ImportDashboardFilesAsync(
            sapoBytes, form.SapoFile.FileName,
            mappingBytes, mappingFileName,
            form.UploadedBy ?? "webapp.user");

        await _activity.SaveLogAsync(null, null, "SAPO_IMPORT", "sapo_import_batches", null,
            newData: new { fileName = form.SapoFile.FileName, uploadedBy = form.UploadedBy, message = result.Message });

        return Ok(result);
    }

    public class ImportFormDto
    {
        public IFormFile SapoFile { get; set; } = null!;
        public IFormFile? MappingFile { get; set; }
        public string? UploadedBy { get; set; }
    }

    [HttpPost("admin/verify")]
    public IActionResult VerifyAdmin([FromBody] AdminCodeDto dto)
    {
        if (dto?.AdminCode == ADMIN_CODE)
            return Ok(new { ok = true });
        return Ok(new { ok = false, message = "Sai mã xác nhận." });
    }

    [HttpGet("import/{importId}/download")]
    public async Task<IActionResult> DownloadImport(int importId)
    {
        try
        {
            var result = await _sapo.ExportImportDataAsync(importId);
            if (result.fileBytes == null || result.fileBytes.Length == 0)
                return NotFound(new { ok = false, message = "Dữ liệu không tìm thấy" });

            return File(result.fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", result.fileName);
        }
        catch (Exception ex)
        {
            return BadRequest(new { ok = false, message = ex.Message });
        }
    }

    [HttpPost("admin/delete-latest")]
    public async Task<IActionResult> DeleteLatest([FromBody] AdminCodeDto dto)
    {
        if (dto?.AdminCode != ADMIN_CODE)
            return Ok(new { ok = false, message = "Sai mã xác nhận." });
        try
        {
            var result = await _sapo.DeleteLatestUploadAsync();
            await _activity.SaveLogAsync(null, null, "SAPO_DELETE_LATEST", "sapo_import_batches", null);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Ok(new { ok = false, message = ex.Message });
        }
    }

    public class AdminCodeDto
    {
        [JsonPropertyName("adminCode")]
        public string? AdminCode { get; set; }
    }
}
