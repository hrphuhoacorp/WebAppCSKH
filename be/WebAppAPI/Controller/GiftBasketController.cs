using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

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

        [HttpGet("List")]
        public async Task<ResponseValue<PagedResult<GiftBasketDTO>>> GetList(
            [FromQuery] GiftBasketFilterDTO filter
        )
        {
            try
            {
                var result = await _service.GetBasketsAsync(filter);
                return new ResponseValue<PagedResult<GiftBasketDTO>>
                {
                    StatusCode = 200,
                    Data = result,
                };
            }
            catch (Exception ex)
            {
                return new ResponseValue<PagedResult<GiftBasketDTO>>
                {
                    StatusCode = 500,
                    Message = ex.Message,
                };
            }
        }

        [Authorize(Roles = "Super_Admin,Admin_Gift")]
        [HttpPost("Create")]
        public async Task<ResponseValue<GiftBasketDTO>> Create([FromBody] CreateGiftBasketDTO dto)
        {
            try
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
                return new ResponseValue<GiftBasketDTO> { StatusCode = 200, Data = result };
            }
            catch (Exception ex)
            {
                return new ResponseValue<GiftBasketDTO> { StatusCode = 500, Message = ex.Message };
            }
        }

        [Authorize(Roles = "Super_Admin,Admin_Gift")]
        [HttpPut("Update")]
        public async Task<ResponseValue<GiftBasketDTO>> Update([FromBody] UpdateGiftBasketDTO dto)
        {
            try
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

                return new ResponseValue<GiftBasketDTO> { StatusCode = 200, Data = result };
            }
            catch (NotFoundException ex)
            {
                return new ResponseValue<GiftBasketDTO> { StatusCode = 404, Message = ex.Message };
            }
            catch (Exception ex)
            {
                return new ResponseValue<GiftBasketDTO> { StatusCode = 500, Message = ex.Message };
            }
        }

        [HttpPost("UploadImage")]
        [Consumes("multipart/form-data")]
        public async Task<ResponseValue<string>> UploadImage(IFormFile file)
        {
            try
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
                return new ResponseValue<string> { StatusCode = 200, Data = url };
            }
            catch (BadRequestException ex)
            {
                return new ResponseValue<string> { StatusCode = 400, Message = ex.Message };
            }
            catch (Exception ex)
            {
                return new ResponseValue<string> { StatusCode = 500, Message = ex.Message };
            }
        }

        // ─── CODE CHANGE REQUESTS ─────────────────────────────────────────────

        [HttpGet("ChangeRequests")]
        public async Task<ResponseValue<PagedResult<GiftCodeChangeRequestDTO>>> GetChangeRequests(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? status = null,
            [FromQuery] int? branchId = null,
            [FromQuery] bool? isActive = null
        )
        {
            try
            {
                var result = await _service.GetCodeChangeRequestsAsync(
                    page,
                    pageSize,
                    status,
                    branchId,
                    isActive
                );
                return new ResponseValue<PagedResult<GiftCodeChangeRequestDTO>>
                {
                    StatusCode = 200,
                    Data = result,
                };
            }
            catch (Exception ex)
            {
                return new ResponseValue<PagedResult<GiftCodeChangeRequestDTO>>
                {
                    StatusCode = 500,
                    Message = ex.Message,
                };
            }
        }

        [Authorize(Roles = "Super_Admin,Admin_Gift,Gói Quà,Nhân Viên")]
        [HttpPost("ChangeRequest/Create")]
        public async Task<ResponseValue<GiftCodeChangeRequestDTO>> CreateChangeRequest(
            [FromBody] CreateCodeChangeRequestDTO dto
        )
        {
            try
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
                return new ResponseValue<GiftCodeChangeRequestDTO>
                {
                    StatusCode = 200,
                    Data = result,
                };
            }
            catch (Exception ex)
            {
                return new ResponseValue<GiftCodeChangeRequestDTO>
                {
                    StatusCode = 500,
                    Message = ex.Message,
                };
            }
        }

        [Authorize(Roles = "Super_Admin,Admin_Gift")]
        [HttpPut("ChangeRequest/Handle")]
        public async Task<ResponseValue<GiftCodeChangeRequestDTO>> HandleChangeRequest(
            [FromBody] HandleCodeChangeRequestDTO dto
        )
        {
            try
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
                return new ResponseValue<GiftCodeChangeRequestDTO>
                {
                    StatusCode = 200,
                    Data = result,
                };
            }
            catch (NotFoundException ex)
            {
                return new ResponseValue<GiftCodeChangeRequestDTO>
                {
                    StatusCode = 404,
                    Message = ex.Message,
                };
            }
            catch (Exception ex)
            {
                return new ResponseValue<GiftCodeChangeRequestDTO>
                {
                    StatusCode = 500,
                    Message = ex.Message,
                };
            }
        }

        [Authorize(Roles = "Super_Admin,Admin_Gift")]
        [HttpPut("ChangeRequest/{id}/Active")]
        public async Task<ResponseValue<bool>> SetChangeRequestActive(
            int id,
            [FromBody] bool isActive
        )
        {
            try
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
                return new ResponseValue<bool> { StatusCode = 200, Data = true };
            }
            catch (NotFoundException ex)
            {
                return new ResponseValue<bool> { StatusCode = 404, Message = ex.Message };
            }
            catch (Exception ex)
            {
                return new ResponseValue<bool> { StatusCode = 500, Message = ex.Message };
            }
        }

        [Authorize(Roles = "Super_Admin,Admin_Gift")]
        [HttpPut("ChangeRequest/{id}/Activate")]
        public async Task<ResponseValue<bool>> ActivateChangeRequest(
            int id,
            [FromBody] ActivateCodeChangeRequestDTO dto
        )
        {
            try
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
                return new ResponseValue<bool> { StatusCode = 200, Data = true };
            }
            catch (NotFoundException ex)
            {
                return new ResponseValue<bool> { StatusCode = 404, Message = ex.Message };
            }
            catch (Exception ex)
            {
                return new ResponseValue<bool> { StatusCode = 500, Message = ex.Message };
            }
        }

        [Authorize(Roles = "Super_Admin,Admin_Gift")]
        [HttpDelete("ChangeRequest/{id}")]
        public async Task<ResponseValue<bool>> DeleteChangeRequest(int id)
        {
            try
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
                return new ResponseValue<bool> { StatusCode = 200, Data = true };
            }
            catch (NotFoundException ex)
            {
                return new ResponseValue<bool> { StatusCode = 404, Message = ex.Message };
            }
            catch (Exception ex)
            {
                return new ResponseValue<bool> { StatusCode = 500, Message = ex.Message };
            }
        }

        [Authorize(Roles = "Super_Admin,Admin_Gift")]
        [HttpGet("ChangeRequests/Export")]
        public async Task<IActionResult> ExportChangeRequests(
            [FromQuery] string? month,
            [FromQuery] bool? isActive
        )
        {
            var bytes = await _service.ExportChangeRequestsExcelAsync(month, isActive);
            var suffix = string.IsNullOrWhiteSpace(month)
                ? DateTime.Now.ToString("yyyyMM")
                : month.Replace("-", "");
            var fileName = $"doi-ma-gio-{suffix}.xlsx";
            return File(
                bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName
            );
        }
    }
}
