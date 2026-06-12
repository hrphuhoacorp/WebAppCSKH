using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppInfractor.Models;

//using WebAppAPI.Models;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IActivityService _activityService;

        public UserController(
            IUserService userService,
            IHttpContextAccessor httpContextAccessor,
            IActivityService activityService
        )
        {
            _userService = userService;
            _httpContextAccessor = httpContextAccessor;
            _activityService = activityService;
        }

        [Authorize(Roles = "Super_Admin")]
        [HttpGet("GetAllUsersAsync")]
        public async Task<ResponseValue<PagedResult<UserGetAllDTO>>> GetAllUsersAsync(
            [FromQuery] string? search,
            [FromQuery] string? role,
            [FromQuery] int? branchId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10
        )
        {
            var userRolesClaim = _httpContextAccessor
                .HttpContext?.User.Claims.Where(c =>
                    c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role
                )
                .Select(c => c.Value)
                .ToList();

            var result = await _userService.GetAllAsync(
                search,
                role,
                branchId,
                page,
                pageSize,
                userRolesClaim
            );
            return new ResponseValue<PagedResult<UserGetAllDTO>>(
                result,
                "Lấy danh sách người dùng thành công",
                StatusReponse.Success
            );
        }

        [HttpGet("GetUserByIdAsync/{id}")]
        public async Task<ResponseValue<UserDTO>> GetUserByIdAsync(int id)
        {
            var result = await _userService.GetByIdAsync(id);

            return new ResponseValue<UserDTO>(
                result,
                "Lấy thông tin người dùng thành công",
                StatusReponse.Success
            );
        }

        [HttpPut("UpdateUserAsync/{id}")]
        public async Task<ResponseValue<UserDTO>> UpdateUserAsync(int id, UserUpdateDTO dto)
        {
            var result = await _userService.UpdateAsync(dto, id);

            return new ResponseValue<UserDTO>(
                result,
                "Cập nhật thông tin người dùng thành công",
                StatusReponse.Success
            );
        }

        [HttpGet("GetAllRolesAsync")]
        public async Task<ResponseValue<List<RoleDTO>>> GetAllRolesAsync()
        {
            var result = await _userService.GetAllRoleAsync();

            return new ResponseValue<List<RoleDTO>>(
                result,
                "Lấy danh sách vai trò thành công",
                StatusReponse.Success
            );
        }

        [HttpGet("GetAllActivityLogAsync")]
        public async Task<ResponseValue<PagedResult<ActivityLogDTO>>> GetAllActivityLogAsync(
            [FromQuery] ActivityFilter filter
        )
        {
            var result = await _activityService.GetAllActivityLog(filter);

            return new ResponseValue<PagedResult<ActivityLogDTO>>(
                result,
                "Lấy danh sách hoạt động thành công",
                StatusReponse.Success
            );
        }

        [Authorize(Roles = "Super_Admin")]
        [HttpPost("ImportStaff")]
        [Consumes("multipart/form-data")]
        public async Task<ResponseValue<ImportStaffResultDTO>> ImportStaff(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return new ResponseValue<ImportStaffResultDTO> { StatusCode = 400, Message = "File không hợp lệ" };

            var ext = Path.GetExtension(file.FileName).ToLower();
            if (ext != ".xlsx" && ext != ".xls")
                return new ResponseValue<ImportStaffResultDTO> { StatusCode = 400, Message = "Chỉ chấp nhận file Excel (.xlsx, .xls)" };

            var userIdClaim = _httpContextAccessor.HttpContext?.User.Claims
                .FirstOrDefault(c => c.Type == "Id");
            var importerUserId = int.Parse(userIdClaim!.Value);

            var result = await _userService.ImportStaffAsync(file, importerUserId);
            return new ResponseValue<ImportStaffResultDTO>(result, "Import hoàn tất", StatusReponse.Success);
        }

        [Authorize(Roles = "Super_Admin")]
        [HttpGet("ImportStaffTemplate")]
        public IActionResult DownloadImportTemplate()
        {
            var bytes = _userService.GenerateImportTemplate();
            return File(bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "mau-import-nhan-su.xlsx");
        }
    }
}
