using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
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
    Task<ImportStaffResultDTO> ImportStaffAsync(IFormFile file, int importerUserId);
    byte[] GenerateImportTemplate();
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
            currentUserRoles != null
            && currentUserRoles.Any(r => r.Trim() == "Super_Admin");

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

                if (dob > DateOnly.FromDateTime(DateTime.UtcNow))
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

    public async Task<ImportStaffResultDTO> ImportStaffAsync(IFormFile file, int importerUserId)
    {
        var result = new ImportStaffResultDTO();

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        stream.Position = 0;

        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        // Load lookup data once
        var allBranches = await _branchRepository
            .GetAll()
            .Select(b => new { b.Id, Name = b.Name.ToLower() })
            .ToListAsync();
        var allRoles = await _roleRepository
            .GetAll()
            .Select(r => new { r.Id, Name = r.Name.ToLower() })
            .ToListAsync();
        var existingStaffCodes = await _userRepository
            .GetAll()
            .Where(u => u.DeletedAt == null)
            .Select(u => u.StaffCode)
            .ToHashSetAsync();
        var existingEmails = await _userRepository
            .GetAll()
            .Where(u => u.DeletedAt == null)
            .Select(u => u.Email)
            .ToHashSetAsync();
        var existingPhones = await _userRepository
            .GetAll()
            .Where(u => u.DeletedAt == null)
            .Select(u => u.Phone)
            .ToHashSetAsync();

        // Row 1 is header, data starts from row 2
        for (int row = 2; row <= lastRow; row++)
        {
            var staffCode = ws.Cell(row, 1).GetString().Trim();
            var name = ws.Cell(row, 2).GetString().Trim();
            var email = ws.Cell(row, 3).GetString().Trim().ToLower();
            var phone = ws.Cell(row, 4).GetString().Trim();
            var branchName = ws.Cell(row, 5).GetString().Trim();
            var roleName = ws.Cell(row, 6).GetString().Trim();
            var dobRaw = ws.Cell(row, 7).GetString().Trim();

            // Skip empty rows
            if (string.IsNullOrEmpty(staffCode) && string.IsNullOrEmpty(name))
                continue;

            // Validate required fields
            if (string.IsNullOrEmpty(staffCode))
            {
                result.Errors.Add(
                    new ImportStaffRowErrorDTO
                    {
                        Row = row,
                        StaffCode = staffCode,
                        Error = "Thiếu mã nhân viên",
                    }
                );
                result.ErrorCount++;
                continue;
            }
            if (string.IsNullOrEmpty(name))
            {
                result.Errors.Add(
                    new ImportStaffRowErrorDTO
                    {
                        Row = row,
                        StaffCode = staffCode,
                        Error = "Thiếu họ tên",
                    }
                );
                result.ErrorCount++;
                continue;
            }
            if (string.IsNullOrEmpty(email))
            {
                result.Errors.Add(
                    new ImportStaffRowErrorDTO
                    {
                        Row = row,
                        StaffCode = staffCode,
                        Error = "Thiếu email",
                    }
                );
                result.ErrorCount++;
                continue;
            }
            if (string.IsNullOrEmpty(phone))
            {
                result.Errors.Add(
                    new ImportStaffRowErrorDTO
                    {
                        Row = row,
                        StaffCode = staffCode,
                        Error = "Thiếu số điện thoại",
                    }
                );
                result.ErrorCount++;
                continue;
            }
            if (string.IsNullOrEmpty(branchName))
            {
                result.Errors.Add(
                    new ImportStaffRowErrorDTO
                    {
                        Row = row,
                        StaffCode = staffCode,
                        Error = "Thiếu chi nhánh",
                    }
                );
                result.ErrorCount++;
                continue;
            }
            if (string.IsNullOrEmpty(roleName))
            {
                result.Errors.Add(
                    new ImportStaffRowErrorDTO
                    {
                        Row = row,
                        StaffCode = staffCode,
                        Error = "Thiếu vai trò",
                    }
                );
                result.ErrorCount++;
                continue;
            }

            // Lookup branch
            var branch = allBranches.FirstOrDefault(b => b.Name == branchName.ToLower());
            if (branch == null)
            {
                result.Errors.Add(
                    new ImportStaffRowErrorDTO
                    {
                        Row = row,
                        StaffCode = staffCode,
                        Error = $"Chi nhánh '{branchName}' không tồn tại",
                    }
                );
                result.ErrorCount++;
                continue;
            }

            // Lookup role
            var role = allRoles.FirstOrDefault(r => r.Name == roleName.ToLower());
            if (role == null)
            {
                result.Errors.Add(
                    new ImportStaffRowErrorDTO
                    {
                        Row = row,
                        StaffCode = staffCode,
                        Error = $"Vai trò '{roleName}' không tồn tại",
                    }
                );
                result.ErrorCount++;
                continue;
            }

            // Uniqueness checks
            if (existingStaffCodes.Contains(staffCode))
            {
                result.Errors.Add(
                    new ImportStaffRowErrorDTO
                    {
                        Row = row,
                        StaffCode = staffCode,
                        Error = "Mã nhân viên đã tồn tại",
                    }
                );
                result.ErrorCount++;
                continue;
            }
            if (existingEmails.Contains(email))
            {
                result.Errors.Add(
                    new ImportStaffRowErrorDTO
                    {
                        Row = row,
                        StaffCode = staffCode,
                        Error = "Email đã tồn tại",
                    }
                );
                result.ErrorCount++;
                continue;
            }
            if (existingPhones.Contains(phone))
            {
                result.Errors.Add(
                    new ImportStaffRowErrorDTO
                    {
                        Row = row,
                        StaffCode = staffCode,
                        Error = "Số điện thoại đã tồn tại",
                    }
                );
                result.ErrorCount++;
                continue;
            }

            // Parse date of birth (optional)
            DateOnly? dob = null;
            if (!string.IsNullOrEmpty(dobRaw))
            {
                if (
                    DateOnly.TryParseExact(
                        dobRaw,
                        new[] { "dd/MM/yyyy", "yyyy-MM-dd", "d/M/yyyy" },
                        System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None,
                        out var parsed
                    )
                )
                {
                    if (parsed > DateOnly.FromDateTime(DateTime.Today.AddYears(-18)))
                    {
                        result.Errors.Add(
                            new ImportStaffRowErrorDTO
                            {
                                Row = row,
                                StaffCode = staffCode,
                                Error = "Chưa đủ 18 tuổi",
                            }
                        );
                        result.ErrorCount++;
                        continue;
                    }
                    dob = parsed;
                }
                else
                {
                    result.Errors.Add(
                        new ImportStaffRowErrorDTO
                        {
                            Row = row,
                            StaffCode = staffCode,
                            Error = "Ngày sinh không đúng định dạng (dd/MM/yyyy)",
                        }
                    );
                    result.ErrorCount++;
                    continue;
                }
            }

            try
            {
                var newUser = new User
                {
                    StaffCode = staffCode,
                    Name = name,
                    Email = email,
                    Phone = phone,
                    BranchesId = branch.Id,
                    DayOfBirth = dob,
                    Password = PasswordHelper.HashPassword(phone),
                    DeletedAt = null,
                };
                await _userRepository.AddAsync(newUser);
                await _unitOfWork.SaveChangesAsync();

                await _userRoleRepository.AddAsync(
                    new UserRole { UserId = newUser.Id, RoleId = role.Id }
                );
                await _unitOfWork.SaveChangesAsync();

                // Update local sets to detect duplicates within the file
                existingStaffCodes.Add(staffCode);
                existingEmails.Add(email);
                existingPhones.Add(phone);

                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.Errors.Add(
                    new ImportStaffRowErrorDTO
                    {
                        Row = row,
                        StaffCode = staffCode,
                        Error = ex.Message,
                    }
                );
                result.ErrorCount++;
            }
        }

        return result;
    }

    public byte[] GenerateImportTemplate()
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Danh Sách Nhân Sự");

        // Header style
        var headers = new[]
        {
            "Mã nhân viên *",
            "Họ tên *",
            "Email *",
            "Số điện thoại *",
            "Chi nhánh *",
            "Vai trò *",
            "Ngày sinh (dd/MM/yyyy)",
        };
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#086839");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        // Sample rows
        var samples = new[]
        {
            new[]
            {
                "NV001",
                "Nguyễn Văn A",
                "nva@example.com",
                "0901234567",
                "Chi nhánh 1",
                "Online",
                "01/01/1995",
            },
            new[]
            {
                "NV002",
                "Trần Thị B",
                "ttb@example.com",
                "0912345678",
                "Chi nhánh 2",
                "Staff",
                "15/06/1998",
            },
        };
        for (int r = 0; r < samples.Length; r++)
        for (int c = 0; c < samples[r].Length; c++)
            ws.Cell(r + 2, c + 1).Value = samples[r][c];

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        return stream.ToArray();
    }
}
