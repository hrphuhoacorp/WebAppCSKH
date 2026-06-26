using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAppAPI.Controllers;

[Route("api/vpp/items")]
[ApiController]
[Authorize]
public class VppItemController : ControllerBase
{
    private readonly IVppItemService _service;
    public VppItemController(IVppItemService service) => _service = service;

    [HttpGet]
    public async Task<ResponseValue<IEnumerable<VppItemDto>>> GetAll(
        [FromQuery] string? group, [FromQuery] string? search)
    {
        var result = await _service.GetAllAsync(group, search);
        return new ResponseValue<IEnumerable<VppItemDto>>(result, "OK", StatusReponse.Success);
    }

    [HttpGet("{id:int}")]
    public async Task<ResponseValue<VppItemDto>> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null)
            return new ResponseValue<VppItemDto>(null, "Không tìm thấy vật tư", StatusReponse.Error);
        return new ResponseValue<VppItemDto>(result, "OK", StatusReponse.Success);
    }

    [HttpPost]
    public async Task<ResponseValue<VppItemDto>> Create([FromBody] VppItemUpsertDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return new ResponseValue<VppItemDto>(result, "Tạo vật tư thành công", StatusReponse.Success);
    }

    [HttpPut("{id:int}")]
    public async Task<ResponseValue<VppItemDto>> Update(int id, [FromBody] VppItemUpsertDto dto)
    {
        var result = await _service.UpdateAsync(id, dto);
        return new ResponseValue<VppItemDto>(result, "Cập nhật thành công", StatusReponse.Success);
    }

    [HttpDelete("{id:int}")]
    public async Task<ResponseValue<object>> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return new ResponseValue<object>(new { success = true }, "Đã xóa vật tư", StatusReponse.Success);
    }
}
