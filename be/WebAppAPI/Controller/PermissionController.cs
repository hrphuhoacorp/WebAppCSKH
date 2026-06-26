using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class PermissionController : ControllerBase
{
    private readonly IPermissionService _service;

    public PermissionController(IPermissionService service)
    {
        _service = service;
    }

    [RequirePermission("staff.manage_permissions")]
    [HttpGet("All")]
    public async Task<ResponseValue<List<PermissionGroupDTO>>> GetAll()
    {
        var result = await _service.GetAllAsync();
        return new ResponseValue<List<PermissionGroupDTO>>(result, "Lấy danh sách quyền thành công", StatusReponse.Success);
    }

    [RequirePermission("staff.manage_permissions")]
    [HttpGet("User/{userId}")]
    public async Task<ResponseValue<UserPermissionDetailDTO>> GetUserPermissions(int userId)
    {
        var result = await _service.GetUserPermissionsAsync(userId);
        return new ResponseValue<UserPermissionDetailDTO>(result, "Lấy quyền người dùng thành công", StatusReponse.Success);
    }

    [RequirePermission("staff.manage_permissions")]
    [HttpPut("User/{userId}")]
    public async Task<ResponseValue<string>> UpdateUserPermissions(
        int userId,
        [FromBody] UpdateUserPermissionsDTO dto
    )
    {
        var actorId = int.TryParse(User.FindFirst("Id")?.Value, out var aid) ? (int?)aid : null;
        await _service.UpdateUserPermissionsAsync(userId, dto, actorId);
        return new ResponseValue<string>("OK", "Cập nhật quyền thành công", StatusReponse.Success);
    }
}
