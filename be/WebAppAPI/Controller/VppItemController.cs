using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers;

[Route("api/vpp/items")]
[ApiController]
[Authorize]
public class VppItemController : ControllerBase
{
    private readonly IVppItemService _service;
    private readonly IActivityService _activity;
    private readonly IHttpContextAccessor _ctx;
    private readonly IUserRepository _userRepo;

    public VppItemController(IVppItemService service, IActivityService activity, IHttpContextAccessor ctx, IUserRepository userRepo)
    {
        _service = service;
        _activity = activity;
        _ctx = ctx;
        _userRepo = userRepo;
    }

    private int ActorId => int.Parse(
        _ctx.HttpContext!.User.Claims.First(c => c.Type == "Id").Value);

    private async Task<string?> GetStaffCodeAsync() =>
        await _userRepo.GetAll().Where(u => u.Id == ActorId).Select(u => u.StaffCode).FirstOrDefaultAsync();

    [RequirePermission("vpp.request.create")]
    [HttpGet]
    public async Task<ResponseValue<PagedResult<VppItemDto>>> GetAll(
        [FromQuery] string? group, [FromQuery] string? search,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _service.GetAllAsync(group, search, page, pageSize);
        return new ResponseValue<PagedResult<VppItemDto>>(result, "OK", StatusReponse.Success);
    }

    [RequirePermission("vpp.request.create")]
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
        await _activity.SaveLogAsync(
            userId: ActorId, staffCode: await GetStaffCodeAsync(),
            action: "Vpp_Create_Item", tableName: "vpp_items", recordId: result.Id,
            oldData: null,
            newData: JsonSerializer.Serialize(new { result.Code, result.Name, result.Group, result.Unit })
        );
        return new ResponseValue<VppItemDto>(result, "Tạo vật tư thành công", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpPut("{id:int}")]
    public async Task<ResponseValue<VppItemDto>> Update(int id, [FromBody] VppItemUpsertDto dto)
    {
        var before = await _service.GetByIdAsync(id);
        var result = await _service.UpdateAsync(id, dto);
        await _activity.SaveLogAsync(
            userId: ActorId, staffCode: await GetStaffCodeAsync(),
            action: "Vpp_Update_Item", tableName: "vpp_items", recordId: id,
            oldData: before == null ? null : JsonSerializer.Serialize(new { before.Name, before.Unit, before.UnitPrice, before.MinStock, before.MaxStock, before.Note }),
            newData: JsonSerializer.Serialize(new { dto.Name, dto.Unit, dto.UnitPrice, dto.MinStock, dto.MaxStock, dto.Note })
        );
        return new ResponseValue<VppItemDto>(result, "Cập nhật thành công", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpDelete("{id:int}")]
    public async Task<ResponseValue<object>> Delete(int id)
    {
        var before = await _service.GetByIdAsync(id);
        await _service.DeleteAsync(id);
        await _activity.SaveLogAsync(
            userId: ActorId, staffCode: await GetStaffCodeAsync(),
            action: "Vpp_Delete_Item", tableName: "vpp_items", recordId: id,
            oldData: before == null ? null : JsonSerializer.Serialize(new { before.Code, before.Name, before.Group }),
            newData: null
        );
        return new ResponseValue<object>(new { success = true }, "Đã xóa vật tư", StatusReponse.Success);
    }

    [RequirePermission("vpp.manage")]
    [HttpPatch("{id:int}/toggle-active")]
    public async Task<ResponseValue<VppItemDto>> ToggleActive(int id)
    {
        var before = await _service.GetByIdAsync(id);
        var result = await _service.ToggleActiveAsync(id);
        await _activity.SaveLogAsync(
            userId: ActorId, staffCode: await GetStaffCodeAsync(),
            action: "Vpp_Toggle_Item", tableName: "vpp_items", recordId: id,
            oldData: JsonSerializer.Serialize(new { IsActive = before?.IsActive }),
            newData: JsonSerializer.Serialize(new { result.IsActive })
        );
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
