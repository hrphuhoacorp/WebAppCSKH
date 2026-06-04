using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

//using WebAppAPI.Models;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IHttpContextAccessor httpContextAccessor;

        public AuthController(IAuthService authService, IHttpContextAccessor httpContextAccessor)
        {
            _authService = authService;
            this.httpContextAccessor = httpContextAccessor;
        }

        [HttpPost("Login")]
        public async Task<IActionResult> Login(AuthLoginDTO dto)
        {
            var token = await _authService.Login(dto);

            Response.Cookies.Append(
                "token",
                token,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true, // localhost
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTimeOffset.UtcNow.AddHours(1),
                    Path = "/",
                }
            );

            return Ok(new { Status = "Success", Message = "Đăng nhập thành công" });
        }

        [Authorize]
        [HttpGet("Profile")]
        public async Task<ResponseValue<AuthProfile>> GetProfile()
        {
            var userIdClaim = httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                c.Type == "Id"
            );

            int userId = int.Parse(userIdClaim.Value);
            var profile = await _authService.GetProfile(userId);

            return new ResponseValue<AuthProfile>(
                profile,
                "Lấy thông tin người dùng thành công",
                StatusReponse.Success
            );
        }

        [Authorize]
        [HttpPost("Logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("token");

            return Ok(new { Status = "Success", Message = "Đăng xuất thành công" });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("CreateAccount")]
        public async Task<ResponseValue<string>> CreateAccount(AuthCreateDTO createDTO)
        {
            var result = await _authService.CreateAccount(createDTO);
            return new ResponseValue<string>(
                result,
                "Tạo tài khoản thành công",
                StatusReponse.Success
            );
        }

        [Authorize]
        [HttpPost("ChangePassword")]
        public async Task<ResponseValue<string>> ChangePassword(
            string currentPassword,
            string newPassword,
            string confirmPassword
        )
        {
            var userIdClaim = httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                c.Type == "Id"
            );

            if (userIdClaim == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy thông tin người dùng");
            }

            int userId = int.Parse(userIdClaim.Value);
            var result = await _authService.ChangePassword(
                userId,
                currentPassword,
                newPassword,
                confirmPassword
            );
            return new ResponseValue<string>(
                result,
                "Đổi mật khẩu thành công",
                StatusReponse.Success
            );
        }

        [Authorize]
        [HttpPost("ResetPassword")]
        public async Task<ResponseValue<string>> ResetPassword(int userId)
        {
            var result = await _authService.ResetPassword(userId);
            return new ResponseValue<string>(
                result,
                "Đặt lại mật khẩu thành công",
                StatusReponse.Success
            );
        }

        [Authorize]
        [HttpDelete("DeleteAccount")]
        public async Task<ResponseValue<string>> DeleteAccount(
            int userId,
            [FromQuery] DateTime updatedAt
        )
        {
            var result = await _authService.DeleteAccount(userId, updatedAt);
            return new ResponseValue<string>(
                result,
                "Xóa tài khoản thành công",
                StatusReponse.Success
            );
        }
    }
}
