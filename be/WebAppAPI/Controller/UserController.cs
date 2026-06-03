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

        public UserController(IUserService userService, IHttpContextAccessor httpContextAccessor)
        {
            _userService = userService;
            _httpContextAccessor = httpContextAccessor;
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("GetAllUsersAsync")]
        public async Task<ResponseValue<PagedResult<UserGetAllDTO>>> GetAllUsersAsync(
            [FromQuery] string? search,
            [FromQuery] string? role,
            [FromQuery] int? branchId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10
        )
        {
            var result = await _userService.GetAllAsync(search, role, branchId, page, pageSize);
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
    }
}
