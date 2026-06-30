using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers;

[Route("api/vpp/requests")]
[ApiController]
[Authorize]
public class VppRequestController : ControllerBase
{
    private readonly IVppRequestService _service;
    public VppRequestController(IVppRequestService service) => _service = service;

    [RequirePermission("vpp.manage")]
    [HttpGet]
    public async Task<ResponseValue<PagedResult<VppRequestDto>>> GetAll([FromQuery] VppRequestFilter filter)
    {
        var result = await _service.GetAllAsync(filter);
        return new ResponseValue<PagedResult<VppRequestDto>>(result, "OK", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpGet("{id:int}")]
    public async Task<ResponseValue<VppRequestDetailDto>> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy đề nghị");
        return new ResponseValue<VppRequestDetailDto>(result, "OK", StatusReponse.Success);
    }

    [RequirePermission("vpp.request.create")]
    [HttpPost]
    public async Task<ResponseValue<VppRequestDto>> Create([FromBody] VppRequestCreateDto dto)
    {
        var userId = int.Parse(User.FindFirstValue("Id")!);
        var result = await _service.CreateAsync(dto, userId);
        return new ResponseValue<VppRequestDto>(result, "Gửi đề nghị thành công", StatusReponse.Success);
    }

    [RequirePermission("vpp.request.approve")]
    [HttpPost("{id:int}/approve")]
    public async Task<ResponseValue<VppRequestDto>> Approve(int id, [FromBody] VppApproveDto dto)
    {
        var name = User.FindFirstValue("name") ?? "";
        var result = await _service.ApproveAsync(id, name, dto.AdminNote, dto.Lines);
        return new ResponseValue<VppRequestDto>(result, "Đã duyệt và tạo phiếu xuất", StatusReponse.Success);
    }

    [RequirePermission("vpp.request.approve")]
    [HttpPost("{id:int}/reject")]
    public async Task<ResponseValue<object>> Reject(int id, [FromBody] VppRejectDto dto)
    {
        await _service.RejectAsync(id, dto.AdminNote);
        return new ResponseValue<object>(new { success = true }, "Đã từ chối đề nghị", StatusReponse.Success);
    }
}

public class VppApproveDto
{
    public string? AdminNote { get; set; }
    public List<VppApproveLineDto>? Lines { get; set; }
}

public class VppRejectDto
{
    public string AdminNote { get; set; } = "";
}
