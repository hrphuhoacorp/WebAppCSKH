using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class GiftBasketController : ControllerBase
    {
        private readonly IGiftBasketService _service;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IActivityService _activityService;
        private readonly IHubContext<GiftBasketHub> _hub;

        public GiftBasketController(
            IGiftBasketService service,
            IHttpContextAccessor httpContextAccessor,
            IActivityService activityService,
            IHubContext<GiftBasketHub> hub
        )
        {
            _service = service;
            _httpContextAccessor = httpContextAccessor;
            _activityService = activityService;
            _hub = hub;
        }

        private int GetCurrentUserId()
        {
            var claim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                c.Type == "Id"
            );
            return int.Parse(claim!.Value);
        }

        private string GetCurrentStaffCode() =>
            _httpContextAccessor
                .HttpContext?.User.Claims.FirstOrDefault(c => c.Type == "StaffCode")
                ?.Value ?? "";

        // ─── BASKETS ──────────────────────────────────────────────────────────

        [RequirePermission("gift.basket.view")]
        [HttpGet("List")]
        public async Task<ResponseValue<PagedResult<GiftBasketDTO>>> GetList(
            [FromQuery] GiftBasketFilterDTO filter
        )
        {
            var result = await _service.GetBasketsAsync(filter);
            return new ResponseValue<PagedResult<GiftBasketDTO>>(
                result,
                "Lấy danh sách thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("gift.basket.create")]
        [HttpPost("Create")]
        public async Task<ResponseValue<GiftBasketDTO>> Create([FromBody] CreateGiftBasketDTO dto)
        {
            var userId = GetCurrentUserId();
            var result = await _service.CreateBasketAsync(dto, userId);
            await _activityService.SaveLogAsync(
                userId,
                GetCurrentStaffCode(),
                "CREATE_BASKET",
                "gift_baskets",
                result.Id,
                null,
                JsonSerializer.Serialize(result)
            );
            await _hub.Clients.All.SendAsync(
                "GiftBasketChanged",
                new { table = "change_requests" }
            );
            return new ResponseValue<GiftBasketDTO>(
                result,
                "Tạo thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("gift.basket.edit")]
        [HttpPut("Update")]
        public async Task<ResponseValue<GiftBasketDTO>> Update([FromBody] UpdateGiftBasketDTO dto)
        {
            var userId = GetCurrentUserId();
            var result = await _service.UpdateBasketAsync(dto, userId);
            await _activityService.SaveLogAsync(
                userId,
                GetCurrentStaffCode(),
                "UPDATE_BASKET",
                "gift_baskets",
                result.Id,
                JsonSerializer.Serialize(new { dto.Id }),
                JsonSerializer.Serialize(result)
            );
            await _hub.Clients.All.SendAsync(
                "GiftBasketChanged",
                new { table = "change_requests" }
            );

            return new ResponseValue<GiftBasketDTO>(
                result,
                "Cập nhật thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("gift.basket.upload_image")]
        [HttpPost("UploadImage")]
        [Consumes("multipart/form-data")]
        public async Task<ResponseValue<string>> UploadImage(IFormFile file)
        {
            var userId = GetCurrentUserId();
            var url = await _service.UploadBasketImageAsync(file, userId);
            await _activityService.SaveLogAsync(
                userId,
                GetCurrentStaffCode(),
                "UPLOAD_IMAGE",
                "gift_baskets",
                0,
                null,
                JsonSerializer.Serialize(new { url, fileName = file.FileName })
            );
            return new ResponseValue<string>(url, "Tải ảnh thành công", StatusReponse.Success);
        }

        // ─── CODE CHANGE REQUESTS ─────────────────────────────────────────────

        [RequirePermission("gift.change_request.view")]
        [HttpGet("ChangeRequests")]
        public async Task<ResponseValue<PagedResult<GiftCodeChangeRequestDTO>>> GetChangeRequests(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? status = null,
            [FromQuery] int? branchId = null,
            [FromQuery] bool? isActive = null
        )
        {
            var result = await _service.GetCodeChangeRequestsAsync(
                page,
                pageSize,
                status,
                branchId,
                isActive
            );
            return new ResponseValue<PagedResult<GiftCodeChangeRequestDTO>>(
                result,
                "Lấy danh sách thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("gift.change_request.create")]
        [HttpPost("ChangeRequest/Create")]
        public async Task<ResponseValue<GiftCodeChangeRequestDTO>> CreateChangeRequest(
            [FromBody] CreateCodeChangeRequestDTO dto
        )
        {
            var userId = GetCurrentUserId();
            var result = await _service.CreateCodeChangeRequestAsync(dto, userId);
            await _activityService.SaveLogAsync(
                userId,
                GetCurrentStaffCode(),
                "CREATE_CHANGE_REQUEST",
                "gift_code_change_requests",
                result.Id,
                null,
                JsonSerializer.Serialize(result)
            );
            await _hub.Clients.All.SendAsync(
                "GiftBasketChanged",
                new
                {
                    action = "created",
                    table = "change_requests",
                    data = result,
                }
            );
            return new ResponseValue<GiftCodeChangeRequestDTO>(
                result,
                "Tạo yêu cầu thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("gift.change_request.handle")]
        [HttpPut("ChangeRequest/Handle")]
        public async Task<ResponseValue<GiftCodeChangeRequestDTO>> HandleChangeRequest(
            [FromBody] HandleCodeChangeRequestDTO dto
        )
        {
            var userId = GetCurrentUserId();
            var before = await _service.GetCodeChangeRequestByIdAsync(dto.Id);
            var result = await _service.HandleCodeChangeRequestAsync(dto, userId);
            var action =
                dto.Status?.ToUpper() == "DONE"
                    ? "APPROVE_CHANGE_REQUEST"
                    : "REJECT_CHANGE_REQUEST";
            await _activityService.SaveLogAsync(
                userId,
                GetCurrentStaffCode(),
                action,
                "gift_code_change_requests",
                result.Id,
                before != null ? JsonSerializer.Serialize(before) : null,
                JsonSerializer.Serialize(result)
            );
            await _hub.Clients.All.SendAsync(
                "GiftBasketChanged",
                new
                {
                    action = "handled",
                    table = "change_requests",
                    data = result,
                }
            );
            return new ResponseValue<GiftCodeChangeRequestDTO>(
                result,
                "Xử lý yêu cầu thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("gift.change_request.toggle_active")]
        [HttpPut("ChangeRequest/{id}/Active")]
        public async Task<ResponseValue<bool>> SetChangeRequestActive(
            int id,
            [FromBody] bool isActive
        )
        {
            var userId = GetCurrentUserId();
            var before = await _service.GetCodeChangeRequestByIdAsync(id);
            await _service.SetChangeRequestActiveAsync(id, isActive);
            await _activityService.SaveLogAsync(
                userId,
                GetCurrentStaffCode(),
                isActive ? "ACTIVATE_CHANGE_REQUEST" : "DEACTIVATE_CHANGE_REQUEST",
                "gift_code_change_requests",
                id,
                before != null ? JsonSerializer.Serialize(before) : null,
                null
            );
            await _hub.Clients.All.SendAsync(
                "GiftBasketChanged",
                new
                {
                    action = "activeChanged",
                    table = "change_requests",
                    id,
                    isActive,
                }
            );
            return new ResponseValue<bool>(
                true,
                isActive ? "Kích hoạt thành công" : "Vô hiệu hóa thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("gift.change_request.toggle_active")]
        [HttpPut("ChangeRequest/{id}/Activate")]
        public async Task<ResponseValue<bool>> ActivateChangeRequest(
            int id,
            [FromBody] ActivateCodeChangeRequestDTO dto
        )
        {
            var userId = GetCurrentUserId();
            var before = await _service.GetCodeChangeRequestByIdAsync(id);
            var result = await _service.UpdateAndActivateAsync(id, dto);
            await _activityService.SaveLogAsync(
                userId,
                GetCurrentStaffCode(),
                dto.IsActive ? "ACTIVATE_CHANGE_REQUEST" : "DEACTIVATE_CHANGE_REQUEST",
                "gift_code_change_requests",
                id,
                before != null ? JsonSerializer.Serialize(before) : null,
                JsonSerializer.Serialize(result)
            );
            await _hub.Clients.All.SendAsync(
                "GiftBasketChanged",
                new
                {
                    action = "activeChanged",
                    table = "change_requests",
                    id,
                    isActive = dto.IsActive,
                }
            );
            return new ResponseValue<bool>(
                true,
                dto.IsActive ? "Kích hoạt thành công" : "Vô hiệu hóa thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("gift.change_request.delete")]
        [HttpDelete("ChangeRequest/{id}")]
        public async Task<ResponseValue<bool>> DeleteChangeRequest(int id)
        {
            var userId = GetCurrentUserId();
            await _service.DeleteChangeRequestAsync(id);
            await _activityService.SaveLogAsync(
                userId,
                GetCurrentStaffCode(),
                "DELETE_CHANGE_REQUEST",
                "gift_code_change_requests",
                id,
                null,
                null
            );
            await _hub.Clients.All.SendAsync(
                "GiftBasketChanged",
                new
                {
                    action = "deleted",
                    table = "change_requests",
                    id,
                }
            );
            return new ResponseValue<bool>(true, "Xóa thành công", StatusReponse.Success);
        }

        [RequirePermission("gift.change_request.export")]
        [HttpGet("ChangeRequests/Export")]
        public async Task<IActionResult> ExportChangeRequests(
            [FromQuery] string? month,
            [FromQuery] bool? isActive
        )
        {
            var bytes = await _service.ExportChangeRequestsCsvAsync(month, isActive);
            var suffix = string.IsNullOrWhiteSpace(month)
                ? DateTime.Now.ToString("yyyyMM")
                : month.Replace("-", "");
            var fileName = $"doi-ma-gio-{suffix}.csv";
            return File(bytes, "text/csv", fileName);
        }
    }
}
