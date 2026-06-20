using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MessageReportController : ControllerBase
    {
        private readonly IMessageReportService _service;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public MessageReportController(IMessageReportService service, IHttpContextAccessor httpContextAccessor)
        {
            _service = service;
            _httpContextAccessor = httpContextAccessor;
        }

        private int GetCurrentUserId()
        {
            var claim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c => c.Type == "Id");
            return int.Parse(claim!.Value);
        }

        [RequirePermission("cskh.message_report.view")]
        [HttpGet("GetList")]
        public async Task<ResponseValue<List<MessageReportDTO>>> GetList([FromQuery] MessageReportFilter filter)
        {
            var result = await _service.GetListAsync(filter);
            return new ResponseValue<List<MessageReportDTO>>(result, "Lấy danh sách thành công", StatusReponse.Success);
        }

        [RequirePermission("cskh.message_report.create")]
        [HttpPost("Create")]
        public async Task<ResponseValue<MessageReportDTO>> Create([FromBody] MessageReportCreateDTO dto)
        {
            var result = await _service.CreateAsync(dto, GetCurrentUserId());
            return new ResponseValue<MessageReportDTO>(result, "Thêm bản ghi thành công", StatusReponse.Success);
        }

        [RequirePermission("cskh.message_report.delete")]
        [HttpDelete("Delete/{id}")]
        public async Task<ResponseValue<object>> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return new ResponseValue<object>(null, "Xóa thành công", StatusReponse.Success);
        }
    }
}
