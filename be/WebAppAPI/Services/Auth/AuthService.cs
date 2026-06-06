using System.Text.Json;
using System.Transactions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models;

public interface IAuthService
{
    Task<string> Login(AuthLoginDTO loginDTO);
    Task<UserDTO> GetProfile(int userId);
    Task<string> CreateAccount(int authorId, AuthCreateDTO createDTO);
    Task<string> ChangePassword(
        int userId,
        string currentPassword,
        string newPassword,
        string confirmPassword
    );
    Task<string> ResetPassword(int userId);
    Task<string> DeleteAccount(int userId, DateTime updatedAt, int currentId);
}

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly JwtAuthService _jwtAuthService;
    private readonly IUserRoleRepository _userRoleRepository;
    private readonly IBranchRepository _branchRepository;
    private readonly IRoleRepository _roleRepository;
    private readonly IActivityService _auditLogService;

    public AuthService(
        IUserRepository userRepository,
        IUnitOfWork unitOfWork,
        JwtAuthService jwtAuthService,
        IUserRoleRepository userRoleRepository,
        IRoleRepository roleRepository,
        IBranchRepository branchRepository,
        IActivityService auditLogService
    )
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _jwtAuthService = jwtAuthService;
        _userRoleRepository = userRoleRepository;
        _branchRepository = branchRepository;
        _roleRepository = roleRepository;
        _auditLogService = auditLogService;
    }

    public async Task<string> Login(AuthLoginDTO loginDTO)
    {
        var email = loginDTO.Email.Trim().ToLower();
        var user = await _userRepository
            .GetAll()
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .Include(u => u.Branches)
            .AsNoTracking()
            .SingleOrDefaultAsync(u => u.Email == email);

        if (user == null)
        {
            throw new NotFoundException("Người dùng không tồn tại");
        }

        if (user.DeletedAt.HasValue)
        {
            throw new BadRequestException("Tài khoản đã bị xóa");
        }

        if (!PasswordHelper.VerifyPassword(loginDTO.Password, user.Password))
        {
            throw new BadRequestException("Mật khẩu không đúng");
        }

        var token = _jwtAuthService.GenerateToken(user);

        await _auditLogService.SaveLogAsync(
            userId: user.Id,
            staffCode: user.StaffCode,
            action: "LOGIN",
            tableName: "users",
            recordId: user.Id,
            oldData: null,
            newData: null
        );

        return token;
    }

    public async Task<UserDTO> GetProfile(int userId)
    {
        var user = await _userRepository
            .GetAll()
            .Include(u => u.Branches)
            .Include(u => u.ImportsHistories)
            .Include(u => u.TodoTasks)
            .FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null);

        if (user == null)
        {
            throw new NotFoundException("Không tìm thấy người dùng");
        }

        var roles = await _userRoleRepository
            .GetAll()
            .Where(ur => ur.UserId == userId)
            .Select(ur => new RoleDTO { Id = ur.Role.Id, Name = ur.Role.Name })
            .ToListAsync();
        var importHistories = user.ImportsHistories.Select(ih => ih.ImportDate).ToList();

        var profile = new UserDTO
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
                .ImportsHistories.OrderByDescending(ih => ih.ImportDate)
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

        return profile;
    }

    public async Task<string> CreateAccount(int authorId, AuthCreateDTO createDTO)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var author = _userRepository.GetAll().FirstOrDefault(u => u.Id == authorId);

            var branchExists = await _branchRepository
                .GetAll()
                .AnyAsync(b => b.Id == createDTO.BranchesId);

            if (!branchExists)
            {
                throw new NotFoundException("Chi nhánh không tồn tại");
            }

            var existingEmail = await _userRepository.SingleOrDefaultAsync(u =>
                u.Email == createDTO.Email && u.DeletedAt == null
            );
            if (existingEmail != null)
            {
                throw new ConflictException("Email đã tồn tại");
            }

            var existingPhone = await _userRepository.SingleOrDefaultAsync(u =>
                u.Phone == createDTO.Phone && u.DeletedAt == null
            );
            if (existingPhone != null)
            {
                throw new ConflictException("Số điện thoại đã tồn tại");
            }
            var role = await _roleRepository.GetByIdAsync(createDTO.RoleId);

            if (role == null)
            {
                throw new NotFoundException("Vai trò không hợp lệ");
            }

            if (createDTO.DayOfBirth.HasValue)
            {
                var dob = createDTO.DayOfBirth.Value;

                if (dob > DateTime.Now)
                {
                    throw new BadRequestException("Ngày sinh không hợp lệ");
                }

                if (dob > DateTime.Today.AddYears(-18))
                {
                    throw new BadRequestException("Người dùng phải đủ 18 tuổi");
                }
            }

            var newUser = new User
            {
                Name = createDTO.Name,
                Email = createDTO.Email.Trim().ToLower(),
                Phone = createDTO.Phone.Trim(),
                BranchesId = createDTO.BranchesId,
                DayOfBirth = createDTO.DayOfBirth,
                StaffCode = createDTO.StaffCode,
                Password = PasswordHelper.HashPassword(createDTO.Phone), // Mật khẩu mặc định, nên yêu cầu người dùng đổi sau khi đăng nhập
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                DeletedAt = null,
            };

            await _userRepository.AddAsync(newUser);
            await _unitOfWork.SaveChangesAsync();
            var userRole = new UserRole
            {
                UserId = newUser.Id,
                RoleId = role.Id,
                CreatedAt = DateTime.Now,
            };

            await _userRoleRepository.AddAsync(userRole);

            await _auditLogService.SaveLogAsync(
                userId: author.Id,
                staffCode: author.StaffCode,
                action: "Create_Account",
                tableName: "users",
                recordId: newUser.Id,
                oldData: null,
                newData: JsonSerializer.Serialize(newUser)
            );

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return "Tạo tài khoản thành công";
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<string> ChangePassword(
        int userId,
        string currentPassword,
        string newPassword,
        string confirmPassword
    )
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var user = await _userRepository
                .GetAll()
                .FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null);
            if (user == null)
            {
                throw new NotFoundException("Người dùng không tồn tại");
            }

            if (!PasswordHelper.VerifyPassword(currentPassword, user.Password))
            {
                throw new BadRequestException("Mật khẩu hiện tại không đúng");
            }
            if (newPassword != confirmPassword)
            {
                throw new BadRequestException("Mật khẩu mới và xác nhận mật khẩu không khớp");
            }

            user.Password = PasswordHelper.HashPassword(newPassword);
            user.UpdatedAt = DateTime.Now;

            await _userRepository.Update(user);

            await _auditLogService.SaveLogAsync(
                userId: user.Id,
                staffCode: user.StaffCode,
                action: "Chang_Password",
                tableName: "users",
                recordId: user.Id,
                oldData: JsonSerializer.Serialize(new { Password = currentPassword }),
                newData: JsonSerializer.Serialize(new { Password = newPassword })
            );

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return "Đổi mật khẩu thành công";
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<string> ResetPassword(int userId)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var user = await _userRepository
                .GetAll()
                .FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null);
            if (user == null)
            {
                throw new NotFoundException("Người dùng không tồn tại");
            }

            user.Password = PasswordHelper.HashPassword(user.Phone); // Đặt lại mật khẩu về số điện thoại
            user.UpdatedAt = DateTime.Now.AddHours(7);
            await _userRepository.Update(user);

            await _auditLogService.SaveLogAsync(
                userId: user.Id,
                staffCode: user.StaffCode,
                action: "Reset_Password",
                tableName: "users",
                recordId: user.Id,
                oldData: null,
                newData: JsonSerializer.Serialize(new { Password = user.Phone })
            );

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return "Đặt lại mật khẩu thành công.";
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<string> DeleteAccount(int userId, DateTime updatedAt, int currentId)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var user = await _userRepository
                .GetAll()
                .FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null);

            if (user == null)
            {
                throw new NotFoundException("Người dùng không tồn tại");
            }

            if (user.Id == currentId)
            {
                throw new BadRequestException("Không thể xóa tài khoản hiện tại");
            }

            if (user.UpdatedAt != updatedAt)
            {
                throw new ConflictException(
                    "Dữ liệu đã được cập nhật bởi người dùng khác. Vui lòng tải lại trang và thử lại."
                );
            }

            user.DeletedAt = DateTime.Now;
            user.UpdatedAt = DateTime.Now;

            await _userRepository.Update(user);

            await _auditLogService.SaveLogAsync(
                userId: user.Id,
                staffCode: user.StaffCode,
                action: "Delete_Account",
                tableName: "users",
                recordId: user.Id,
                oldData: null,
                newData: null
            );

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return "Xóa tài khoản thành công";
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
