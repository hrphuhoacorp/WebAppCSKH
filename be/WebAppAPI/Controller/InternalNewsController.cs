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
    public class InternalNewsController : ControllerBase
    {
        private readonly IInternalNewsService _internalNewsService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public InternalNewsController(
            IInternalNewsService internalNewsService,
            IHttpContextAccessor httpContextAccessor
        )
        {
            _internalNewsService = internalNewsService;
            _httpContextAccessor = httpContextAccessor;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                c.Type == "Id"
            );

            return int.Parse(userIdClaim.Value);
        }

        // Lấy danh sách - tất cả role đều xem được
        // [Authorize(Roles = "Super_Admin,Admin_Media,Online,Staff")]
        [HttpGet("GetPaged")]
        public async Task<ResponseValue<PagedResult<InternalNewsDTO>>> GetPaged(
            [FromQuery] InternalNewsFilter filter
        )
        {
            var result = await _internalNewsService.GetPagedAsync(filter);
            return new ResponseValue<PagedResult<InternalNewsDTO>>(
                result,
                "Lấy danh sách thành công",
                StatusReponse.Success
            );
        }

        // Xem chi tiết - tất cả role
        // [Authorize(Roles = "Super_Admin,Admin_Media,Online,Staff")]
        [HttpGet("GetById/{id}")]
        public async Task<ResponseValue<InternalNewsDTO>> GetById(int id)
        {
            var result = await _internalNewsService.GetByIdAsync(id);
            return new ResponseValue<InternalNewsDTO>(
                result,
                "Lấy chi tiết thành công",
                StatusReponse.Success
            );
        }

        // Tạo mới - chỉ Admin
        [Authorize(Roles = "Super_Admin,Admin_Online")]
        [HttpPost("Create")]
        public async Task<ResponseValue<InternalNewsDTO>> Create(
            [FromBody] InternalNewsCreateDTO dto
        )
        {
            var userId = GetCurrentUserId();
            var result = await _internalNewsService.CreateAsync(dto, userId);
            return new ResponseValue<InternalNewsDTO>(
                result,
                "Tạo bài viết thành công",
                StatusReponse.Success
            );
        }

        // Cập nhật - chỉ Admin
        [Authorize(Roles = "Super_Admin,Admin_Online")]
        [HttpPut("Update/{id}")]
        public async Task<ResponseValue<InternalNewsDTO>> Update(
            int id,
            [FromBody] InternalNewsCreateDTO dto
        )
        {
            var result = await _internalNewsService.UpdateAsync(id, dto);
            return new ResponseValue<InternalNewsDTO>(
                result,
                "Cập nhật thành công",
                StatusReponse.Success
            );
        }

        // Xóa - chỉ Admin
        [Authorize(Roles = "Super_Admin,Admin_Online")]
        [HttpDelete("Delete/{id}")]
        public async Task<ResponseValue<object>> Delete(int id)
        {
            await _internalNewsService.DeleteAsync(id);
            return new ResponseValue<object>(
                null,
                "Xóa bài viết thành công",
                StatusReponse.Success
            );
        }

        // Ghim / bỏ ghim
        [Authorize(Roles = "Super_Admin,Admin_Online")]
        [HttpPatch("TogglePin/{id}")]
        public async Task<ResponseValue<InternalNewsDTO>> TogglePin(int id)
        {
            var result = await _internalNewsService.TogglePinAsync(id);
            return new ResponseValue<InternalNewsDTO>(
                result,
                "Cập nhật ghim thành công",
                StatusReponse.Success
            );
        }

        // Đăng bài
        [Authorize(Roles = "Super_Admin,Admin_Online")]
        [HttpPatch("Publish/{id}")]
        public async Task<ResponseValue<InternalNewsDTO>> Publish(int id)
        {
            var result = await _internalNewsService.PublishAsync(id);
            return new ResponseValue<InternalNewsDTO>(
                result,
                "Đăng bài thành công",
                StatusReponse.Success
            );
        }

        // Hủy đăng
        [Authorize(Roles = "Super_Admin,Admin_Online")]
        [HttpPatch("Unpublish/{id}")]
        public async Task<ResponseValue<InternalNewsDTO>> Unpublish(int id)
        {
            var result = await _internalNewsService.UnpublishAsync(id);
            return new ResponseValue<InternalNewsDTO>(
                result,
                "Hủy đăng thành công",
                StatusReponse.Success
            );
        }

        // Upload ảnh cho editor
        [Authorize(Roles = "Super_Admin,Admin_Online")]
        [HttpPost("UploadImage")]
        public async Task<ResponseValue<string>> UploadImage(IFormFile file)
        {
            var url = await _internalNewsService.UploadImageAsync(file);
            return new ResponseValue<string>(url, "Upload ảnh thành công", StatusReponse.Success);
        }

        // Upload video cho editor
        [Authorize(Roles = "Super_Admin,Admin_Online")]
        [HttpPost("UploadVideo")]
        public async Task<ResponseValue<string>> UploadVideo(IFormFile file)
        {
            var url = await _internalNewsService.UploadVideoAsync(file);
            return new ResponseValue<string>(url, "Upload video thành công", StatusReponse.Success);
        }
    }
}
