using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using WebAppInfractor.Models;

public interface IUserService
{
    Task<List<RoleDTO>> GetAllRoleAsync();
    Task<PagedResult<UserGetAllDTO>> GetAllAsync(
        string? search,
        string? role,
        int? branchId,
        int page,
        int pageSize,
        List<string>? currentUserRoles
    );

    Task<UserDTO> GetByIdAsync(int id);
    Task<UserDTO> UpdateAsync(UserUpdateDTO dto, int id);

    // Task UpdateAsync(User entity);
    // Task DeleteAsync(int id);
}

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IUserRoleRepository _userRoleRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IBranchRepository _branchRepository;
    private readonly IRoleRepository _roleRepository;

    public UserService(
        IUserRepository userRepository,
        IUserRoleRepository userRoleRepository,
        IUnitOfWork unitOfWork,
        IBranchRepository branchRepository,
        IRoleRepository roleRepository
    )
    {
        _userRepository = userRepository;
        _userRoleRepository = userRoleRepository;
        _unitOfWork = unitOfWork;
        _branchRepository = branchRepository;
        _roleRepository = roleRepository;
    }

    public async Task<PagedResult<UserGetAllDTO>> GetAllAsync(
        string? search,
        string? role,
        int? branchId,
        int page,
        int pageSize,
        List<string>? currentUserRoles
    )
    {
        if (page <= 0)
            page = 1;
        if (pageSize <= 0)
            pageSize = 10;

        bool isAdmin =
            currentUserRoles != null && currentUserRoles.Any(r => r.Trim().ToLower() == "admin");

        var query = _userRepository
            .GetAll()
            .AsNoTracking()
            .Select(u => new
            {
                User = u,
                Roles = _userRoleRepository
                    .GetAll()
                    .Where(ur => ur.UserId == u.Id)
                    .Select(ur => ur.Role.Name)
                    .ToList(),
            });

        if (!isAdmin)
        {
            query = query.Where(u => u.User.DeletedAt == null);
        }

        if (!string.IsNullOrEmpty(branchId.ToString()))
        {
            query = query.Where(u => u.User.BranchesId == branchId);
        }

        if (!string.IsNullOrEmpty(role))
        {
            query = query.Where(u => u.Roles.Contains(role));
        }

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(u =>
                (u.User.Name != null && EF.Functions.Like(u.User.Name, $"%{search}%"))
                || (u.User.Email != null && EF.Functions.Like(u.User.Email, $"%{search}%"))
                || (u.User.Phone != null && EF.Functions.Like(u.User.Phone, $"%{search}%"))
            );
        }

        var totalIems = await query.CountAsync();
        var users = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserGetAllDTO
            {
                Id = u.User.Id,
                StaffCode = u.User.StaffCode,
                Name = u.User.Name,
                Email = u.User.Email,
                CreatedAt = u.User.CreatedAt,
                UpdatedAt = u.User.UpdatedAt,
                DeletedAt = u.User.DeletedAt,
                Phone = u.User.Phone,
                BranchesName = u.User.Branches.Name,
                DayOfBirth = u.User.DayOfBirth,
                Roles = u.Roles,
            })
            .ToListAsync();

        return new PagedResult<UserGetAllDTO>
        {
            TotalItems = totalIems,
            Page = page,
            PageSize = pageSize,
            Items = users,
        };
    }

    public async Task<UserDTO> GetByIdAsync(int id)
    {
        var user = await _userRepository
            .GetAll()
            .Include(u => u.Branches)
            .Include(u => u.ImportsHistoryUsers)
            .FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null);

        if (user == null)
        {
            throw new NotFoundException("Không tìm thấy người dùng");
        }

        var roles = await _userRoleRepository
            .GetAll()
            .Where(ur => ur.UserId == id)
            .Select(ur => new RoleDTO { Id = ur.Role.Id, Name = ur.Role.Name })
            .ToListAsync();
        var importHistories = user.ImportsHistoryUsers.Select(ih => ih.ImportDate).ToList();

        return new UserDTO
        {
            Id = user.Id,
            StaffCode = user.StaffCode,
            Name = user.Name,
            Email = user.Email,
            Phone = user.Phone,
            BranchesId = user.BranchesId,
            BranchesName = user.Branches?.Name,
            DayOfBirth = user.DayOfBirth,
            Roles = roles,

            ImportHistories = user
                .ImportsHistoryUsers.OrderByDescending(ih => ih.ImportDate)
                .Select(ih => new ImportHistoryDTO
                {
                    Id = ih.Id,
                    FileName = ih.FileName,
                    SuccessCount = ih.SuccessCount,
                    ErrorCount = ih.ErrorCount,
                    ImportDate = ih.ImportDate,
                })
                .ToList(),

            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            DeletedAt = user.DeletedAt,
        };
    }

    public async Task<UserDTO> UpdateAsync(UserUpdateDTO dto, int id)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var user = await _userRepository
                .GetAll()
                .AsSplitQuery()
                .Include(u => u.Branches)
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .Include(u => u.ImportsHistoryUsers)
                .FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null);

            if (user == null)
            {
                throw new NotFoundException("Không tìm thấy người dùng");
            }

            if (user.UpdatedAt != dto.UpdatedAt)
            {
                throw new ConflictException(
                    "Dữ liệu đã được cập nhật bởi người dùng khác. Vui lòng tải lại trang và thử lại."
                );
            }
            if (dto.DayOfBirth.HasValue)
            {
                var dob = dto.DayOfBirth.Value;

                if (dob > DateOnly.FromDateTime(DateTime.Now))
                {
                    throw new BadRequestException("Ngày sinh không hợp lệ");
                }

                if (dob > DateOnly.FromDateTime(DateTime.Today.AddYears(-18)))
                {
                    throw new BadRequestException("Người dùng phải đủ 18 tuổi");
                }
            }
            if (dto.RoleIds == null || !dto.RoleIds.Any())
            {
                throw new BadRequestException("Vui lòng chọn ít nhất 1 vai trò");
            }

            var validRoleCount = await _roleRepository
                .GetAll()
                .CountAsync(r => dto.RoleIds.Contains(r.Id));

            if (validRoleCount != dto.RoleIds.Distinct().Count())
            {
                throw new NotFoundException("Vai trò không tồn tại");
            }

            var branchExists = await _branchRepository
                .GetAll()
                .AnyAsync(b => b.Id == dto.BranchesId);

            if (!branchExists)
            {
                throw new NotFoundException("Chi nhánh không tồn tại");
            }
            if (user.Email != dto.Email)
            {
                var existingEmail = await _userRepository
                    .GetAll()
                    .AnyAsync(u => u.Email == dto.Email && u.Id != id);

                if (existingEmail)
                {
                    throw new ConflictException("Email đã tồn tại");
                }
            }

            if (user.Phone != dto.Phone)
            {
                var existingPhone = await _userRepository
                    .GetAll()
                    .AnyAsync(u => u.Phone == dto.Phone && u.Id != id);
                if (existingPhone)
                {
                    throw new ConflictException("Số điện thoại đã tồn tại");
                }
            }

            user.Name = dto.Name;
            user.Email = dto.Email;
            user.Phone = dto.Phone;
            user.BranchesId = dto.BranchesId;
            user.DayOfBirth = dto.DayOfBirth;
            //đổi role
            var currentRoles = await _userRoleRepository
                .GetAll()
                .Where(x => x.UserId == id)
                .ToListAsync();

            var rolesToRemove = currentRoles.Where(x => !dto.RoleIds.Contains(x.RoleId)).ToList();

            var existingRoleIds = currentRoles.Select(x => x.RoleId).ToList();

            var rolesToAdd = dto
                .RoleIds.Where(roleId => !existingRoleIds.Contains(roleId))
                .Select(roleId => new UserRole { UserId = id, RoleId = roleId })
                .ToList();

            _userRoleRepository.RemoveRange(rolesToRemove);

            foreach (var role in rolesToAdd)
            {
                await _userRoleRepository.AddAsync(role);
            }

            await _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return new UserDTO
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Phone = user.Phone,
                BranchesName = user.Branches.Name,
                // TodoTasks = user.TodoTasks.ToList(),
                ImportHistories = user
                    .ImportsHistoryUsers.Select(ih => new ImportHistoryDTO
                    {
                        Id = ih.Id,
                        FileName = ih.FileName,
                        SuccessCount = ih.SuccessCount,
                        ErrorCount = ih.ErrorCount,
                        ImportDate = ih.ImportDate,
                    })
                    .ToList(),

                CreatedAt = user.CreatedAt,
            };
        }
        catch
        {
            if (transaction.GetDbTransaction().Connection != null)
            {
                await transaction.RollbackAsync();
            }

            throw;
        }
    }

    public async Task<List<RoleDTO>> GetAllRoleAsync()
    {
        var roles = await _roleRepository
            .GetAll()
            .Select(r => new RoleDTO { Id = r.Id, Name = r.Name })
            .ToListAsync();

        return roles;
    }
}
