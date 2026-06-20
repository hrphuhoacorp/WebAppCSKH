using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebAppAPI.Authorization;
using WebAppInfractor.Data;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ImportHistoryController : ControllerBase
    {
        private readonly IImportHistoryService _importHistoryService;
        private readonly MemBerContext _context;
        private readonly MediaSettings _mediaSettings;

        public ImportHistoryController(
            IImportHistoryService importHistoryService,
            MemBerContext context,
            IOptions<MediaSettings> mediaOptions
        )
        {
            _importHistoryService = importHistoryService;
            _context = context;
            _mediaSettings = mediaOptions.Value;
        }

        [RequirePermission("staff.import_history.view")]
        [HttpGet("GetAllImportHistoryAsync")]
        public async Task<ResponseValue<PagedResult<ImportHistoryDTO>>> GetAllImportHistoryAsync(
            [FromQuery] ImportHistoryFilterDTO filter
        )
        {
            var result = await _importHistoryService.GetAllImportHistoryAsync(filter);
            return new ResponseValue<PagedResult<ImportHistoryDTO>>(
                result,
                "Lấy danh sách lịch sử nhập khẩu thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("staff.import_history.download")]
        [HttpGet("{id}/Download")]
        public async Task<IActionResult> DownloadFile(int id)
        {
            var history = await _context
                .Set<WebAppInfractor.Models.ImportsHistory>()
                .AsNoTracking()
                .FirstOrDefaultAsync(h => h.Id == id);

            if (history == null || string.IsNullOrEmpty(history.FilePath))
                throw new NotFoundException("File không tồn tại hoặc chưa được lưu.");

            var fullPath = Path.Combine(_mediaSettings.RootPath, history.FilePath);
            if (!System.IO.File.Exists(fullPath))
                throw new NotFoundException("File đã bị xóa khỏi server.");

            var fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
            var mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            return File(fileBytes, mimeType, history.FileName);
        }
    }
}
