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
    public async Task<IActionResult> GetDashboard([FromQuery] string filter = "last7")
    {
        var result = await _sapo.GetDashboardAsync(filter);
        return Ok(result);
    }

    [RequirePermission("sales.sapo.view")]
    [HttpGet("dashboard/range")]
    public async Task<IActionResult> GetDashboardRange(
        [FromQuery] string fromDate,
        [FromQuery] string toDate
    )
    {
        var result = await _sapo.GetDashboardByRangeAsync(fromDate, toDate);
        return Ok(result);
    }

    [RequirePermission("sales.sapo.view")]
    [HttpGet("dashboard/month")]
    public async Task<IActionResult> GetDashboardMonth([FromQuery] string month)
    {
        var result = await _sapo.GetDashboardByMonthAsync(month);
        return Ok(result);
    }
}
