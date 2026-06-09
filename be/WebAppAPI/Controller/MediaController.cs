using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
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
    public class MediaController : ControllerBase
    {
        private readonly IMediaService _mediaService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public MediaController(IMediaService mediaService, IHttpContextAccessor httpContextAccessor)
        {
            _mediaService = mediaService;
            _httpContextAccessor = httpContextAccessor;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                c.Type == "Id"
            );

            int userId = int.Parse(userIdClaim.Value);

            return userId;
        }

        [Authorize(Roles = "Super_Admin,Admin_Media,Online")]
        [HttpGet("GetFolder")]
        public async Task<ResponseValue<List<MediaFolderDto>>> GetFolderAsync()
        {
            var result = await _mediaService.GetFolderAsync();
            return new ResponseValue<List<MediaFolderDto>>(
                result,
                "Lấy danh sách thư mục thành công",
                StatusReponse.Success
            );
        }

        [Authorize(Roles = "Super_Admin,Admin_Media")]
        [HttpPost("CreateFolder")]
        public async Task<ResponseValue<MediaFolderDto>> CreateFolder(
            [FromBody] CreateFolderRequest request
        )
        {
            try
            {
                var userIdClaim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                    c.Type == "Id"
                );

                int userId = int.Parse(userIdClaim.Value);

                var result = await _mediaService.CreateFolderAsync(
                    request.Name,
                    request.ParentId,
                    userId
                );

                return new ResponseValue<MediaFolderDto>(
                    result,
                    "Tạo thư mục thành công",
                    StatusReponse.Success
                );
            }
            catch
            {
                throw new ForbiddenException("Bạn không có quyền tạo thư mục");
            }
        }

        [Authorize(Roles = "Super_Admin,Admin_Media")]
        [HttpPut("RestoreFolder/{id}")]
        public async Task<ResponseValue<bool>> RestoreFolderAsync(int id)
        {
            var userId = GetCurrentUserId();
            var result = await _mediaService.RestoreFolderAsync(id, userId);
            return new ResponseValue<bool>(
                result,
                "Khôi phục thư mục thành công",
                StatusReponse.Success
            );
        }

        [Authorize(Roles = "Super_Admin,Admin_Media")]
        [HttpDelete("DeleteFolder/{id}")]
        public async Task<ResponseValue<bool>> DeleteFolderAsync(int id)
        {
            var userId = GetCurrentUserId();
            var result = await _mediaService.DeleteFolderAsync(id, userId);
            return new ResponseValue<bool>(result, "Xóa thư mục thành công", StatusReponse.Success);
        }

        [Authorize(Roles = "Super_Admin,Admin_Media,Online")]
        [HttpGet("GetFiles")]
        public async Task<ResponseValue<List<MediaFileDto>>> GetFiles(
            [FromQuery] int? folderId,
            [FromQuery] string? search
        )
        {
            var result = await _mediaService.GetFilesAsync(folderId, search);
            return new ResponseValue<List<MediaFileDto>>(
                result,
                "Lấy danh sách file thành công",
                StatusReponse.Success
            );
        }

        [Authorize(Roles = "Super_Admin,Admin_Media,Online")]
        [HttpPost("Upload")]
        public async Task<ResponseValue<List<MediaUploadResultDto>>> UploadAsync(
            [FromForm] int folderId,
            [FromForm] List<IFormFile> files
        )
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                c.Type == "Id"
            );

            int userId = int.Parse(userIdClaim.Value);

            var result = await _mediaService.UploadAsync(folderId, files, userId);
            return new ResponseValue<List<MediaUploadResultDto>>(
                result,
                "Upload file thành công",
                StatusReponse.Success
            );
        }

        [Authorize(Roles = "Super_Admin,Admin_Media,Online")]
        [HttpPut("MoveFile")]
        public async Task<ResponseValue<bool>> MoveFileAsync(
            int id,
            [FromBody] MoveFileRequest request
        )
        {
            var userId = GetCurrentUserId();
            var result = await _mediaService.MoveFileAsync(id, request.FolderId, userId);
            return new ResponseValue<bool>(
                result,
                "Di chuyển file thành công",
                StatusReponse.Success
            );
        }

        [Authorize(Roles = "Super_Admin,Admin_Media,Online")]
        [HttpPost("DeleteFiles")]
        public async Task<ResponseValue<bool>> DeleteFiles([FromBody] List<int> ids)
        {
            var userId = GetCurrentUserId();
            var result = await _mediaService.DeleteFilesAsync(ids, userId);
            return new ResponseValue<bool>(result, "Xóa file thành công", StatusReponse.Success);
        }

        [Authorize(Roles = "Super_Admin,Admin_Media,Online")]
        [HttpPut("RestoreFile/{id}")]
        public async Task<ResponseValue<bool>> RestoreFileAsync(int id)
        {
            var userId = GetCurrentUserId();
            var result = await _mediaService.RestoreFileAsync(id, userId);
            return new ResponseValue<bool>(
                result,
                "Khôi phục file thành công",
                StatusReponse.Success
            );
        }

        [Authorize(Roles = "Super_Admin,Admin_Media,Online")]
        [HttpGet("RecycleBin")]
        public async Task<ResponseValue<List<RecycleItemDto>>> GetRecycleBin()
        {
            var userId = GetCurrentUserId();
            var result = await _mediaService.GetRecycleBinAsync(userId);

            return new ResponseValue<List<RecycleItemDto>>(
                result,
                "Lấy danh sách thùng rác thành công",
                StatusReponse.Success
            );
        }

        [Authorize(Roles = "Super_Admin,Admin_Media")]
        [HttpPut("RenameFolder/{id}")]
        public async Task<ResponseValue<bool>> RenameFolderAsync(int id, [FromBody] string newName)
        {
            var userId = GetCurrentUserId();
            var result = await _mediaService.RenameFolderAsync(id, newName, userId);
            return new ResponseValue<bool>(
                result,
                "Đổi tên thư mục thành công",
                StatusReponse.Success
            );
        }
    }
}
