using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers;

[Route("api/vpp/inventory")]
[ApiController]
[Authorize]
public class VppInventoryController : ControllerBase
{
    private readonly IVppInventoryService _service;
    public VppInventoryController(IVppInventoryService service) => _service = service;

    [RequirePermission("vpp.manage")]
    [HttpGet]
    public async Task<ResponseValue<VppInventorySummaryDto>> Get(
        [FromQuery] int? month, [FromQuery] int? year)
    {
        var now = DateTime.UtcNow.AddHours(7);
        var m = month ?? now.Month;
        var y = year ?? now.Year;
        var result = await _service.GetByPeriodAsync(m, y);
        return new ResponseValue<VppInventorySummaryDto>(result, "OK", StatusReponse.Success);
    }
}
