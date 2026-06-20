using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Services;

namespace WebAppAPI.Controllers;

[Route("api/sapo")]
[ApiController]
[Authorize]
public class SapoController : ControllerBase
{
    private readonly SapoService _sapo;
    private readonly IActivityService _activity;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SapoController(
        SapoService sapo,
        IActivityService activity,
        IHttpContextAccessor httpContextAccessor
    )
    {
        _sapo = sapo;
        _activity = activity;
        _httpContextAccessor = httpContextAccessor;
    }

    private int? GetCurrentUserId()
    {
        var val = _httpContextAccessor
            .HttpContext?.User.Claims.FirstOrDefault(c => c.Type == "Id")
            ?.Value;
        return int.TryParse(val, out var id) ? id : null;
    }

    private string GetCurrentStaffCode() =>
        _httpContextAccessor
            .HttpContext?.User.Claims.FirstOrDefault(c => c.Type == "StaffCode")
            ?.Value ?? "";

    private string GetCurrentUserName() =>
        _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c => c.Type == "name")?.Value
        ?? "Unknown";

    [AllowAnonymous]
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] string filter = "last7")
    {
        var result = await _sapo.GetDashboardAsync(filter);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("dashboard/range")]
    public async Task<IActionResult> GetDashboardRange(
        [FromQuery] string fromDate,
        [FromQuery] string toDate
    )
    {
        var result = await _sapo.GetDashboardByRangeAsync(fromDate, toDate);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("dashboard/month")]
    public async Task<IActionResult> GetDashboardMonth([FromQuery] string month)
    {
        var result = await _sapo.GetDashboardByMonthAsync(month);
        return Ok(result);
    }

    [HttpPost("import")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Import([FromForm] ImportFormDto form)
    {
        if (form.SapoFile == null || form.SapoFile.Length == 0)
            throw new BadRequestException("Chưa có file Sapo.");

        var userId = GetCurrentUserId();
        var staffCode = GetCurrentStaffCode();
        var uploadedBy = GetCurrentUserName();

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
            sapoBytes,
            form.SapoFile.FileName,
            mappingBytes,
            mappingFileName,
            uploadedBy
        );

        await _activity.SaveLogAsync(
            userId,
            staffCode,
            "SAPO_IMPORT",
            "sapo_import_batches",
            null,
            newData: new
            {
                fileName = form.SapoFile.FileName,
                uploadedBy,
                message = result.Message,
            }
        );

        return Ok(result);
    }

    public class ImportFormDto
    {
        public IFormFile SapoFile { get; set; } = null!;
        public IFormFile? MappingFile { get; set; }
    }

    [AllowAnonymous]
    [HttpGet("import/{importId}/download")]
    public async Task<IActionResult> DownloadImport(int importId)
    {
        var result = await _sapo.ExportImportDataAsync(importId);
        if (result.fileBytes == null || result.fileBytes.Length == 0)
            throw new NotFoundException("Dữ liệu không tìm thấy");

        return File(
            result.fileBytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            result.fileName
        );
    }
}
