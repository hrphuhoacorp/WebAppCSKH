using System.Text.Json;
using System.Transactions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using WebAppInfractor.Models;

public interface IAuthService
{
    Task<string> Login(AuthLoginDTO loginDTO);
    Task SendForgotPasswordOtpAsync(string email);
    Task<string> ResetPasswordByOtpAsync(string email, string otp);
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
    Task<string> RestoreAccount(int userId, int currentId);
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
    private readonly IEmailService _emailService;
    private readonly IMemoryCache _memoryCache;

    public AuthService(
        IUserRepository userRepository,
        IUnitOfWork unitOfWork,
        JwtAuthService jwtAuthService,
        IUserRoleRepository userRoleRepository,
        IRoleRepository roleRepository,
        IBranchRepository branchRepository,
        IActivityService auditLogService,
        IEmailService emailService,
        IMemoryCache memoryCache
    )
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _jwtAuthService = jwtAuthService;
        _userRoleRepository = userRoleRepository;
        _branchRepository = branchRepository;
        _roleRepository = roleRepository;
        _auditLogService = auditLogService;
        _emailService = emailService;
        _memoryCache = memoryCache;
    }

    public async Task SendForgotPasswordOtpAsync(string email)
    {
        var checkEmail = await _userRepository
            .GetAll()
            .SingleOrDefaultAsync(u => u.Email == email && u.DeletedAt == null);

        if (checkEmail == null)
            throw new NotFoundException("Email không tồn tại trong hệ thống!");

        var otp = Random.Shared.Next(100000, 999999).ToString();
        _memoryCache.Set($"forgot_otp_{email}", otp, TimeSpan.FromMinutes(10));
        var content = BuildOtpEmail(checkEmail.Name, otp);
        await _emailService.SendEmaiLAsync(
            email,
            "[PHF] Mã OTP xác thực đặt lại mật khẩu",
            content
        );
    }

    public async Task<string> ResetPasswordByOtpAsync(string email, string otp)
    {
        var cacheKey = $"forgot_otp_{email}";

        if (!_memoryCache.TryGetValue(cacheKey, out string? cachedOtp) || cachedOtp != otp)
        {
            throw new BadRequestException("Mã OTP không hợp lệ hoặc đã hết hạn");
        }
        var user =
            await _userRepository
                .GetAll()
                .FirstOrDefaultAsync(u => u.Email == email && u.DeletedAt == null)
            ?? throw new NotFoundException("Không tìm thấy người dùng");

        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        var newPassword = new string(
            Enumerable.Range(0, 8).Select(_ => chars[Random.Shared.Next(chars.Length)]).ToArray()
        );

        user.Password = PasswordHelper.HashPassword(newPassword);
        await _userRepository.Update(user);
        await _unitOfWork.SaveChangesAsync();

        _memoryCache.Remove(cacheKey);

        var content = BuildNewPasswordEmail(user.Name, newPassword);
        await _emailService.SendEmaiLAsync(email, "[PHF] Mật khẩu mới của bạn", content);

        return "Mật khẩu mới đã được gửi về email của bạn";
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

        var token = await _jwtAuthService.GenerateTokenAsync(user);

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
            .Include(u => u.ImportsHistoryUsers)
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
        var importHistories = user.ImportsHistoryUsers.Select(ih => ih.ImportDate).ToList();

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
                .ImportsHistoryUsers.OrderByDescending(ih => ih.ImportDate)
                .Select(ih => new ImportHistoryDTO
                {
                    Id = ih.Id,
                    FileName = ih.FileName,
                    Status = ih.Status,
                    SuccessCount = ih.SuccessCount,
                    ErrorCount = ih.ErrorCount,
                    ImportDate = ih.ImportDate,
                    RollbackAt = ih.RollbackAt,
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

            var existingStaffCode = await _userRepository.SingleOrDefaultAsync(u =>
                u.StaffCode == createDTO.StaffCode && u.DeletedAt == null
            );
            if (existingStaffCode != null)
            {
                throw new ConflictException("Mã nhân viên đã tồn tại");
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

                if (dob > DateOnly.FromDateTime(DateTime.UtcNow))
                {
                    throw new BadRequestException("Ngày sinh không hợp lệ");
                }

                if (dob > DateOnly.FromDateTime(DateTime.Today.AddYears(-18)))
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
                DeletedAt = null,
            };

            await _userRepository.AddAsync(newUser);
            await _unitOfWork.SaveChangesAsync();
            var userRole = new UserRole { UserId = newUser.Id, RoleId = role.Id };

            await _userRoleRepository.AddAsync(userRole);

            await _auditLogService.SaveLogAsync(
                userId: author.Id,
                staffCode: author.StaffCode,
                action: "Create_Account",
                tableName: "users",
                recordId: newUser.Id,
                oldData: null,
                newData: JsonSerializer.Serialize(newUser.Name)
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

            user.DeletedAt = DateTime.UtcNow;

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

    public async Task<string> RestoreAccount(int userId, int currentId)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var user = await _userRepository
                .GetAll()
                .FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt != null);

            if (user == null)
            {
                throw new NotFoundException("Không tìm thấy tài khoản này trong danh sách đã xóa.");
            }

            user.DeletedAt = null;
            await _userRepository.Update(user);

            var currentUser = await _userRepository
                .GetAll()
                .FirstOrDefaultAsync(u => u.Id == currentId);
            await _auditLogService.SaveLogAsync(
                userId: currentId,
                staffCode: currentUser?.StaffCode,
                action: "Restore_Account",
                tableName: "users",
                recordId: userId,
                oldData: null,
                newData: null
            );

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return "Khôi phục tài khoản thành công";
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private static string BuildOtpEmail(string name, string otp) =>
        $@"
<!DOCTYPE html>
<html lang='vi'>
<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
<body style='margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Arial,sans-serif'>
  <table width='100%' cellpadding='0' cellspacing='0' style='background:#f4f6f8;padding:32px 0'>
    <tr><td align='center'>
      <table width='520' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>

      

        <!-- Body -->
        <tr><td style='padding:36px 40px'>
          <p style='margin:0 0 8px;font-size:15px;color:#1a1a1a'>Xin chào, <strong>{name}</strong></p>
          <p style='margin:0 0 28px;font-size:14px;color:#555;line-height:1.6'>
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.<br>
            Sử dụng mã OTP dưới đây để xác thực:
          </p>

          <!-- OTP Box -->
          <div style='background:#f0faf4;border:2px dashed #086839;border-radius:10px;padding:24px;text-align:center;margin:0 0 28px'>
            <p style='margin:0 0 6px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1.5px'>Mã OTP của bạn</p>
            <p style='margin:0;font-size:42px;font-weight:800;letter-spacing:16px;color:#086839;font-family:monospace'>{otp}</p>
            <p style='margin:10px 0 0;font-size:12px;color:#e05d00'>⏱ Hiệu lực trong <strong>10 phút</strong></p>
          </div>

          <p style='margin:0;font-size:13px;color:#888;line-height:1.6'>
            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.<br>
            Tuyệt đối <strong>không chia sẻ</strong> mã này với bất kỳ ai.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style='background:#f8fafb;border-top:1px solid #eee;padding:18px 40px;text-align:center'>
          <p style='margin:0;font-size:12px;color:#aaa'>© {DateTime.Now.Year} PhuHoa Fresh &nbsp;|&nbsp; Email tự động, vui lòng không phản hồi</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>";

    private static string BuildNewPasswordEmail(string name, string password) =>
        $@"
<!DOCTYPE html>
<html lang='vi'>
<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
<body style='margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Arial,sans-serif'>
  <table width='100%' cellpadding='0' cellspacing='0' style='background:#f4f6f8;padding:32px 0'>
    <tr><td align='center'>
      <table width='520' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>

      

        <!-- Body -->
        <tr><td style='padding:36px 40px'>
          <p style='margin:0 0 8px;font-size:15px;color:#1a1a1a'>Xin chào, <strong>{name}</strong></p>
          <p style='margin:0 0 28px;font-size:14px;color:#555;line-height:1.6'>
            Mật khẩu của bạn đã được đặt lại thành công.<br>
            Dưới đây là mật khẩu mới để đăng nhập:
          </p>

          <!-- Password Box -->
          <div style='background:#f0faf4;border:2px solid #086839;border-radius:10px;padding:24px;text-align:center;margin:0 0 28px'>
            <p style='margin:0 0 6px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1.5px'>Mật khẩu mới</p>
            <p style='margin:0;font-size:32px;font-weight:800;letter-spacing:6px;color:#086839;font-family:monospace'>{password}</p>
          </div>

          <div style='background:#fff8e1;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px;margin:0 0 20px'>
            <p style='margin:0;font-size:13px;color:#92400e;line-height:1.6'>
              ⚠ Vui lòng <strong>đổi mật khẩu ngay sau khi đăng nhập</strong> để đảm bảo bảo mật tài khoản.
            </p>
          </div>

          <p style='margin:0;font-size:13px;color:#888;line-height:1.6'>
            Nếu bạn không thực hiện yêu cầu này, hãy liên hệ ngay với bộ phận IT để được hỗ trợ.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style='background:#f8fafb;border-top:1px solid #eee;padding:18px 40px;text-align:center'>
          <p style='margin:0;font-size:12px;color:#aaa'>© {DateTime.Now.Year} PhuHoa Fresh &nbsp;|&nbsp; Email tự động, vui lòng không phản hồi</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>";
}
