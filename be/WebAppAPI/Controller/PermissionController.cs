using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppAPI.Authorization;
using WebAppInfractor.Data;
using WebAppInfractor.Models;

namespace WebAppAPI.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PermissionController : ControllerBase
{
    private readonly MemBerContext _context;
    private readonly IActivityService _activityService;

    public PermissionController(MemBerContext context, IActivityService activityService)
    {
        _context = context;
        _activityService = activityService;
    }

    [RequirePermission("staff.manage_permissions")]
    [HttpGet("All")]
    public async Task<ResponseValue<List<PermissionGroupDTO>>> GetAll()
    {
        var perms = await _context
            .Permissions.AsNoTracking()
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Code)
            .ToListAsync();

        var groups = perms
            .GroupBy(p => p.Module)
            .Select(g => new PermissionGroupDTO
            {
                Module = g.Key,
                Permissions = g.Select(p => new PermissionDTO
                    {
                        Id = p.Id,
                        Code = p.Code,
                        Name = p.Name,
                    })
                    .ToList(),
            })
            .ToList();

        return new ResponseValue<List<PermissionGroupDTO>>(
            groups,
            "Lấy danh sách quyền thành công",
            StatusReponse.Success
        );
    }

    [RequirePermission("staff.manage_permissions")]
    [HttpGet("User/{userId}")]
    public async Task<ResponseValue<UserPermissionDetailDTO>> GetUserPermissions(int userId)
    {
        var user =
            await _context
                .Users.Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .ThenInclude(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .Include(u => u.UserPermissions)
                .ThenInclude(up => up.Permission)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null)
            ?? throw new NotFoundException("Không tìm thấy người dùng");

        var rolePermCodes = user
            .UserRoles.SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .ToHashSet();

        var extraPermIds = user.UserPermissions.Select(up => up.PermissionId).ToHashSet();

        var result = new UserPermissionDetailDTO
        {
            UserId = user.Id,
            UserName = user.Name,
            RolePermissionCodes = rolePermCodes.ToList(),
            ExtraPermissionIds = extraPermIds.ToList(),
        };

        return new ResponseValue<UserPermissionDetailDTO>(
            result,
            "Lấy quyền người dùng thành công",
            StatusReponse.Success
        );
    }

    [RequirePermission("staff.manage_permissions")]
    [HttpPut("User/{userId}")]
    public async Task<ResponseValue<string>> UpdateUserPermissions(
        int userId,
        [FromBody] UpdateUserPermissionsDTO dto
    )
    {
        var user =
            await _context
                .Users.Include(u => u.UserPermissions)
                .FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null)
            ?? throw new NotFoundException("Không tìm thấy người dùng");

        // Xóa tất cả user_permissions hiện tại
        _context.UserPermissions.RemoveRange(user.UserPermissions);

        // Thêm lại các permission mới (chỉ extra, không gồm role defaults)
        foreach (var permId in dto.ExtraPermissionIds.Distinct())
        {
            _context.UserPermissions.Add(
                new UserPermission { UserId = userId, PermissionId = permId }
            );

        }
     
        await _context.SaveChangesAsync();

        return new ResponseValue<string>("OK", "Cập nhật quyền thành công", StatusReponse.Success);
    }
}

public class PermissionGroupDTO
{
    public string Module { get; set; } = null!;
    public List<PermissionDTO> Permissions { get; set; } = new();
}

public class PermissionDTO
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
}

public class UserPermissionDetailDTO
{
    public int UserId { get; set; }
    public string UserName { get; set; } = null!;
    public List<string> RolePermissionCodes { get; set; } = new();
    public List<int> ExtraPermissionIds { get; set; } = new();
}

public class UpdateUserPermissionsDTO
{
    public List<int> ExtraPermissionIds { get; set; } = new();
}
