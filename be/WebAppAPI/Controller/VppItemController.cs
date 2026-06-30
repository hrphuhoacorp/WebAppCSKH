using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers;

[Route("api/vpp/items")]
[ApiController]
[Authorize]
public class VppItemController : ControllerBase
{
    private readonly IVppItemService _service;
    public VppItemController(IVppItemService service) => _service = service;

    [RequirePermission("vpp.view")]
    [HttpGet]
    public async Task<ResponseValue<PagedResult<VppItemDto>>> GetAll(
        [FromQuery] string? group, [FromQuery] string? search,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _service.GetAllAsync(group, search, page, pageSize);
        return new ResponseValue<PagedResult<VppItemDto>>(result, "OK", StatusReponse.Success);
    }

    [RequirePermission("vpp.view")]
    [HttpGet("{id:int}")]
    public async Task<ResponseValue<VppItemDto>> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy vật tư");
        return new ResponseValue<VppItemDto>(result, "OK", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpPost]
    public async Task<ResponseValue<VppItemDto>> Create([FromBody] VppItemUpsertDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return new ResponseValue<VppItemDto>(result, "Tạo vật tư thành công", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpPut("{id:int}")]
    public async Task<ResponseValue<VppItemDto>> Update(int id, [FromBody] VppItemUpsertDto dto)
    {
        var result = await _service.UpdateAsync(id, dto);
        return new ResponseValue<VppItemDto>(result, "Cập nhật thành công", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpDelete("{id:int}")]
    public async Task<ResponseValue<object>> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return new ResponseValue<object>(new { success = true }, "Đã xóa vật tư", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpPatch("{id:int}/toggle-active")]
    public async Task<ResponseValue<VppItemDto>> ToggleActive(int id)
    {
        var result = await _service.ToggleActiveAsync(id);
        return new ResponseValue<VppItemDto>(result, "Đã cập nhật trạng thái", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpPost("{id:int}/uniform-returns")]
    public async Task<ResponseValue<VppItemDto>> AppendUniformReturn(int id, [FromBody] UniformReturnRecordDto dto)
    {
        var result = await _service.AppendUniformReturnAsync(id, dto);
        return new ResponseValue<VppItemDto>(result, "Đã ghi nhận hoàn trả", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpDelete("{id:int}/uniform-returns/{index:int}")]
    public async Task<ResponseValue<VppItemDto>> DeleteUniformReturn(int id, int index)
    {
        var result = await _service.DeleteUniformReturnAsync(id, index);
        return new ResponseValue<VppItemDto>(result, "Đã xóa bản ghi hoàn trả", StatusReponse.Success);
    }
}
