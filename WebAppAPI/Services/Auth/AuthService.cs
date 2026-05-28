using System.Transactions;
using Microsoft.AspNetCore.Identity;
using WebAppInfractor.Models;

public interface IAuthService
{
    Task<string> Login(AuthLoginDTO loginDTO);
    Task<string> CreateAccount(AuthCreateDTO createDTO);
    Task<string> ChangePassword(
        int userId,
        string currentPassword,
        string newPassword,
        string confirmPassword
    );
    Task<string> ResetPassword(int userId);
    Task<string> DeleteAccount(int userId);
}

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly JwtAuthService _jwtAuthService;
    private readonly IUserRoleRepository _userRoleRepository;
    private readonly IRoleRepository _roleRepository;

    public AuthService(
        IUserRepository userRepository,
        IUnitOfWork unitOfWork,
        JwtAuthService jwtAuthService,
        IUserRoleRepository userRoleRepository,
        IRoleRepository roleRepository
    )
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _jwtAuthService = jwtAuthService;
        _userRoleRepository = userRoleRepository;
        _roleRepository = roleRepository;
    }

    public async Task<string> Login(AuthLoginDTO loginDTO)
    {
        var email = loginDTO.Email.Trim().ToLower();
        var user = await _userRepository.SingleOrDefaultAsync(u => u.Email == email);

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
        return token;
    }

    public async Task<string> CreateAccount(AuthCreateDTO createDTO)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var existingEmail = await _userRepository.SingleOrDefaultAsync(u =>
                u.Email == createDTO.Email
            );
            if (existingEmail != null)
            {
                throw new ConflictException("Email đã tồn tại");
            }

            var existingPhone = await _userRepository.SingleOrDefaultAsync(u =>
                u.Phone == createDTO.Phone
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

            var newUser = new User
            {
                Name = createDTO.Name,
                Email = createDTO.Email.Trim().ToLower(),
                Phone = createDTO.Phone.Trim(),
                BranchesId = createDTO.BranchesId,
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
            var user = await _userRepository.GetByIdAsync(userId);
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

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            await _userRepository.Update(user);
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
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new NotFoundException("Người dùng không tồn tại");
            }

            user.Password = PasswordHelper.HashPassword(user.Phone); // Đặt lại mật khẩu về số điện thoại
            user.UpdatedAt = DateTime.Now.AddHours(7);
            await _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return "Đặt lại mật khẩu thành công. Mật khẩu mới là số điện thoại của bạn.";
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<string> DeleteAccount(int userId)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new NotFoundException("Người dùng không tồn tại");
            }

            user.DeletedAt = DateTime.Now;
            user.UpdatedAt = DateTime.Now;

            await _userRepository.Update(user);

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
