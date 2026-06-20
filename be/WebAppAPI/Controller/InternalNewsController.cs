using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
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

            return int.Parse(userIdClaim!.Value);
        }

        [RequirePermission("news.view")]
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

        [RequirePermission("news.view")]
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

        [RequirePermission("news.create")]
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

        [RequirePermission("news.edit")]
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

        [RequirePermission("news.delete")]
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

        [RequirePermission("news.toggle_pin")]
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

        [RequirePermission("news.publish")]
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

        [RequirePermission("news.publish")]
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

        [RequirePermission("news.upload_media")]
        [HttpPost("UploadImage")]
        public async Task<ResponseValue<string>> UploadImage(IFormFile file)
        {
            var url = await _internalNewsService.UploadImageAsync(file);
            return new ResponseValue<string>(url, "Upload ảnh thành công", StatusReponse.Success);
        }

        [RequirePermission("news.upload_media")]
        [HttpPost("UploadVideo")]
        public async Task<ResponseValue<string>> UploadVideo(IFormFile file)
        {
            var url = await _internalNewsService.UploadVideoAsync(file);
            return new ResponseValue<string>(url, "Upload video thành công", StatusReponse.Success);
        }
    }
}
