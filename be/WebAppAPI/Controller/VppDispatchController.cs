using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers;

[Route("api/vpp/dispatches")]
[ApiController]
[Authorize]
public class VppDispatchController : ControllerBase
{
    private readonly IVppDispatchService _service;
    public VppDispatchController(IVppDispatchService service) => _service = service;

    [RequirePermission("vpp.manage")]
    [HttpGet]
    public async Task<ResponseValue<PagedResult<VppDispatchDto>>> GetAll(
        [FromQuery] int? month, [FromQuery] int? year, [FromQuery] string? department,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _service.GetAllAsync(month, year, department, page, pageSize);
        return new ResponseValue<PagedResult<VppDispatchDto>>(result, "OK", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpGet("{id:int}")]
    public async Task<ResponseValue<VppDispatchDetailDto>> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy phiếu xuất");
        return new ResponseValue<VppDispatchDetailDto>(result, "OK", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpPost]
    public async Task<ResponseValue<VppDispatchDetailDto>> Create([FromBody] VppDispatchCreateDto dto)
    {
        var name = User.FindFirstValue("name") ?? "";
        var result = await _service.CreateAsync(dto, name);
        return new ResponseValue<VppDispatchDetailDto>(result, "Tạo phiếu xuất thành công", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpGet("stats")]
    public async Task<ResponseValue<List<VppDispatchDeptStatsDto>>> GetStats(
        [FromQuery] int? month, [FromQuery] int? year)
    {
        var y = year ?? DateTime.Now.Year;
        var result = await _service.GetStatsAsync(month, y);
        return new ResponseValue<List<VppDispatchDeptStatsDto>>(result, "OK", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpDelete("{id:int}")]
    public async Task<ResponseValue<object>> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return new ResponseValue<object>(new { success = true }, "Đã xóa phiếu xuất", StatusReponse.Success);
    }
}
