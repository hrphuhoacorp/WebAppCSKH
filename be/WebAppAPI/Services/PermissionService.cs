using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models;

public interface IPermissionService
{
    Task<List<PermissionGroupDTO>> GetAllAsync();
    Task<UserPermissionDetailDTO> GetUserPermissionsAsync(int userId);
    Task UpdateUserPermissionsAsync(int userId, UpdateUserPermissionsDTO dto, int? actorId);
}

public class PermissionService : IPermissionService
{
    private readonly IPermissionRepository _permRepo;
    private readonly IUserPermissionRepository _userPermRepo;
    private readonly IUserRepository _userRepo;
    private readonly IActivityService _activityService;
    private readonly IUnitOfWork _unitOfWork;

    public PermissionService(
        IPermissionRepository permRepo,
        IUserPermissionRepository userPermRepo,
        IUserRepository userRepo,
        IActivityService activityService,
        IUnitOfWork unitOfWork
    )
    {
        _permRepo = permRepo;
        _userPermRepo = userPermRepo;
        _userRepo = userRepo;
        _activityService = activityService;
        _unitOfWork = unitOfWork;
    }

    public async Task<List<PermissionGroupDTO>> GetAllAsync()
    {
        var perms = await _permRepo.GetAll()
            .AsNoTracking()
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Code)
            .ToListAsync();

        return perms
            .GroupBy(p => p.Module)
            .Select(g => new PermissionGroupDTO
            {
                Module = g.Key,
                Permissions = g.Select(p => new PermissionDTO
                {
                    Id = p.Id,
                    Code = p.Code,
                    Name = p.Name,
                }).ToList(),
            })
            .ToList();
    }

    public async Task<UserPermissionDetailDTO> GetUserPermissionsAsync(int userId)
    {
        var user = await _userRepo.GetAll()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .ThenInclude(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .Include(u => u.UserPermissions)
                .ThenInclude(up => up.Permission)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null)
            ?? throw new NotFoundException("Khong tim thay nguoi dung");

        var rolePermCodes = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .ToHashSet();

        var extraPermIds = user.UserPermissions
            .Select(up => up.PermissionId)
            .ToHashSet();

        return new UserPermissionDetailDTO
        {
            UserId = user.Id,
            UserName = user.Name,
            RolePermissionCodes = rolePermCodes.ToList(),
            ExtraPermissionIds = extraPermIds.ToList(),
        };
    }

    public async Task UpdateUserPermissionsAsync(int userId, UpdateUserPermissionsDTO dto, int? actorId)
    {
        var user = await _userRepo.GetAll()
            .Include(u => u.UserPermissions)
            .FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null)
            ?? throw new NotFoundException("Khong tim thay nguoi dung");

        // Capture old state for audit
        var oldPermIds = user.UserPermissions.Select(up => up.PermissionId).ToList();
        var oldPerms = await _permRepo.GetAll()
            .Where(p => oldPermIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Code, p.Name })
            .ToListAsync();

        // Replace extra permissions
        _userPermRepo.RemoveRange(user.UserPermissions);
        foreach (var permId in dto.ExtraPermissionIds.Distinct())
        {
            await _userPermRepo.AddAsync(new UserPermission { UserId = userId, PermissionId = permId });
        }
        await _unitOfWork.SaveChangesAsync();

        // Capture new state for audit
        var newPerms = await _permRepo.GetAll()
            .Where(p => dto.ExtraPermissionIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Code, p.Name })
            .ToListAsync();

        await _activityService.SaveLogAsync(
            actorId,
            null,
            "UPDATE_PERMISSIONS",
            "users",
            userId,
            new { targetUserId = userId, targetUserName = user.Name, permissions = oldPerms },
            new { targetUserId = userId, targetUserName = user.Name, permissions = newPerms }
        );
    }
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

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
