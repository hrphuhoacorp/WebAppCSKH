using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAppAPI.Controllers
{
    // Không gắn [RequirePermission] ở bất kỳ endpoint nào — cố ý theo yêu cầu, vì mỗi
    // người dùng chỉ thao tác được trên dữ liệu của chính mình (lọc OwnerId trong service),
    // không cần thêm lớp quyền hạn.
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PersonalFileController : ControllerBase
    {
        private readonly IPersonalFileService _service;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public PersonalFileController(IPersonalFileService service, IHttpContextAccessor httpContextAccessor)
        {
            _service = service;
            _httpContextAccessor = httpContextAccessor;
        }

        private int CurrentUserId()
        {
            var claim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c => c.Type == "Id");
            return int.Parse(claim!.Value);
        }

        [HttpGet("Folders")]
        public async Task<ResponseValue<List<PersonalFolderDTO>>> GetFoldersAsync()
        {
            var result = await _service.GetFoldersAsync(CurrentUserId());
            return new ResponseValue<List<PersonalFolderDTO>>(result, "Lấy danh sách thư mục thành công", StatusReponse.Success);
        }

        [HttpGet("Items")]
        public async Task<ResponseValue<PersonalItemsDTO>> GetItemsAsync([FromQuery] int? folderId, [FromQuery] string? search)
        {
            var result = await _service.GetItemsAsync(CurrentUserId(), folderId, search);
            return new ResponseValue<PersonalItemsDTO>(result, "Lấy danh sách file/thư mục thành công", StatusReponse.Success);
        }

        [HttpPost("Folders")]
        public async Task<ResponseValue<PersonalFolderDTO>> CreateFolderAsync([FromBody] CreatePersonalFolderRequestDTO body)
        {
            var result = await _service.CreateFolderAsync(CurrentUserId(), body.Name, body.ParentId);
            return new ResponseValue<PersonalFolderDTO>(result, "Đã tạo thư mục", StatusReponse.Success);
        }

        [HttpPut("Folders/{id}/Rename")]
        public async Task<ResponseValue<PersonalFolderDTO>> RenameFolderAsync(int id, [FromBody] RenamePersonalItemRequestDTO body)
        {
            var result = await _service.RenameFolderAsync(CurrentUserId(), id, body.NewName);
            return new ResponseValue<PersonalFolderDTO>(result, "Đã đổi tên thư mục", StatusReponse.Success);
        }

        [HttpPut("Files/{id}/Rename")]
        public async Task<ResponseValue<PersonalFileDTO>> RenameFileAsync(int id, [FromBody] RenamePersonalItemRequestDTO body)
        {
            var result = await _service.RenameFileAsync(CurrentUserId(), id, body.NewName);
            return new ResponseValue<PersonalFileDTO>(result, "Đã đổi tên file", StatusReponse.Success);
        }

        [HttpPost("Upload")]
        [RequestSizeLimit(500 * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 500 * 1024 * 1024)]
        public async Task<ResponseValue<List<PersonalFileDTO>>> UploadAsync([FromForm] int? folderId, List<IFormFile> files)
        {
            var result = await _service.UploadFilesAsync(CurrentUserId(), folderId, files);
            return new ResponseValue<List<PersonalFileDTO>>(result, $"Đã tải lên {result.Count} file", StatusReponse.Success);
        }

        [HttpPost("Move")]
        public async Task<ResponseValue<bool>> MoveAsync([FromBody] PersonalMoveOrCopyRequestDTO body)
        {
            var result = await _service.MoveItemsAsync(CurrentUserId(), body.FolderIds, body.FileIds, body.TargetFolderId);
            return new ResponseValue<bool>(result, "Đã di chuyển", StatusReponse.Success);
        }

        [HttpPost("Copy")]
        public async Task<ResponseValue<bool>> CopyAsync([FromBody] PersonalMoveOrCopyRequestDTO body)
        {
            var result = await _service.CopyItemsAsync(CurrentUserId(), body.FolderIds, body.FileIds, body.TargetFolderId);
            return new ResponseValue<bool>(result, "Đã sao chép", StatusReponse.Success);
        }

        [HttpPost("Delete")]
        public async Task<ResponseValue<bool>> DeleteAsync([FromBody] PersonalItemsRequestDTO body)
        {
            var result = await _service.DeleteItemsAsync(CurrentUserId(), body.FolderIds, body.FileIds);
            return new ResponseValue<bool>(result, "Đã chuyển vào thùng rác", StatusReponse.Success);
        }

        [HttpGet("Trash")]
        public async Task<ResponseValue<List<PersonalRecycleItemDTO>>> GetTrashAsync()
        {
            var result = await _service.GetTrashAsync(CurrentUserId());
            return new ResponseValue<List<PersonalRecycleItemDTO>>(result, "Lấy thùng rác thành công", StatusReponse.Success);
        }

        [HttpPost("Trash/Restore")]
        public async Task<ResponseValue<bool>> RestoreAsync([FromBody] PersonalItemsRequestDTO body)
        {
            var result = await _service.RestoreItemsAsync(CurrentUserId(), body.FolderIds, body.FileIds);
            return new ResponseValue<bool>(result, "Đã khôi phục", StatusReponse.Success);
        }

        [HttpPost("Trash/PermanentDelete")]
        public async Task<ResponseValue<bool>> PermanentDeleteAsync([FromBody] PersonalItemsRequestDTO body)
        {
            var result = await _service.PermanentDeleteAsync(CurrentUserId(), body.FolderIds, body.FileIds);
            return new ResponseValue<bool>(result, "Đã xóa vĩnh viễn", StatusReponse.Success);
        }

        [HttpGet("Files/{id}/Download")]
        public async Task<IActionResult> DownloadAsync(int id)
        {
            var (stream, fileName, mimeType) = await _service.GetFileStreamAsync(CurrentUserId(), id);
            return File(stream, mimeType, fileName);
        }

        [HttpGet("Files/{id}/Content")]
        public async Task<IActionResult> ContentAsync(int id)
        {
            var (stream, _, mimeType) = await _service.GetFileStreamAsync(CurrentUserId(), id);
            return File(stream, mimeType);
        }
    }
}
