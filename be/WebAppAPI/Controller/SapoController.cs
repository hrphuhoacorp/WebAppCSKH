using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;
using WebAppAPI.Services;

namespace WebAppAPI.Controllers;

[Route("api/sapo")]
[ApiController]
[Authorize]
public class SapoController : ControllerBase
{
    private readonly SapoService _sapo;

    public SapoController(SapoService sapo)
    {
        _sapo = sapo;
    }

    [RequirePermission("sales.sapo.view")]
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(
        [FromQuery] string filter = "last7",
        [FromQuery] string? branchName = null
    )
    {
        var result = await _sapo.GetDashboardAsync(filter, branchName);
        return Ok(result);
    }

    [RequirePermission("sales.sapo.view")]
    [HttpGet("dashboard/range")]
    public async Task<IActionResult> GetDashboardRange(
        [FromQuery] string fromDate,
        [FromQuery] string toDate,
        [FromQuery] string? branchName = null
    )
    {
        var result = await _sapo.GetDashboardByRangeAsync(fromDate, toDate, branchName);
        return Ok(result);
    }

    [RequirePermission("sales.sapo.view")]
    [HttpGet("dashboard/month")]
    public async Task<IActionResult> GetDashboardMonth(
        [FromQuery] string month,
        [FromQuery] string? branchName = null
    )
    {
        var result = await _sapo.GetDashboardByMonthAsync(month, branchName);
        return Ok(result);
    }

    [RequirePermission("sales.sapo.view")]
    [HttpPost("rebuild-sales-rows")]
    public async Task<IActionResult> RebuildSalesRows()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
        var count = await _sapo.RebuildSapoSalesRowsAsync(userId);
        return Ok(new { ok = true, message = $"Đã tạo lại {count} dòng từ dữ liệu đơn hàng." });
    }
}
