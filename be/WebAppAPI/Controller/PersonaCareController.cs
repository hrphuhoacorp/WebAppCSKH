using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PersonaCareController : ControllerBase
    {
        private readonly IPersonaCareService _personaCareService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public PersonaCareController(IPersonaCareService personaCareService, IHttpContextAccessor httpContextAccessor)
        {
            _personaCareService = personaCareService;
            _httpContextAccessor = httpContextAccessor;
        }

        private int CurrentUserId()
        {
            var claim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c => c.Type == "Id");
            return int.Parse(claim!.Value);
        }

        [RequirePermission("persona.interaction.view")]
        [HttpGet("Interactions")]
        public async Task<ResponseValue<PagedResult<PersonaInteractionDTO>>> GetInteractionsAsync(
            [FromQuery] int? customerId, [FromQuery] string? type, [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
        {
            var result = await _personaCareService.GetInteractionsAsync(customerId, type, page, pageSize);
            return new ResponseValue<PagedResult<PersonaInteractionDTO>>(result, "Lấy lịch sử chăm sóc thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.interaction.manage")]
        [HttpPost("Interactions")]
        public async Task<ResponseValue<PersonaInteractionDTO>> CreateInteractionAsync([FromBody] CreatePersonaInteractionDTO body)
        {
            var result = await _personaCareService.CreateInteractionAsync(CurrentUserId(), body);
            return new ResponseValue<PersonaInteractionDTO>(result, "Đã ghi nhận", StatusReponse.Success);
        }

        [RequirePermission("persona.interaction.manage")]
        [HttpPut("Interactions/{id}")]
        public async Task<ResponseValue<PersonaInteractionDTO>> UpdateInteractionAsync(int id, [FromBody] UpdatePersonaInteractionDTO body)
        {
            var result = await _personaCareService.UpdateInteractionAsync(CurrentUserId(), id, body);
            return new ResponseValue<PersonaInteractionDTO>(result, "Đã cập nhật", StatusReponse.Success);
        }

        [RequirePermission("persona.interaction.manage")]
        [HttpDelete("Interactions/{id}")]
        public async Task<ResponseValue<bool>> DeleteInteractionAsync(int id)
        {
            await _personaCareService.DeleteInteractionAsync(CurrentUserId(), id);
            return new ResponseValue<bool>(true, "Đã xóa", StatusReponse.Success);
        }

        [RequirePermission("persona.interaction.view")]
        [HttpGet("Customers/Search")]
        public async Task<ResponseValue<List<PersonaCustomerSampleDTO>>> SearchCustomersAsync([FromQuery] string? search)
        {
            var result = await _personaCareService.SearchCustomersAsync(search);
            return new ResponseValue<List<PersonaCustomerSampleDTO>>(result, "Tìm khách hàng thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.reminder.view")]
        [HttpGet("Schedules")]
        public async Task<ResponseValue<List<PersonaCareScheduleDTO>>> GetSchedulesAsync()
        {
            var result = await _personaCareService.GetSchedulesAsync();
            return new ResponseValue<List<PersonaCareScheduleDTO>>(result, "Lấy cấu hình nhắc lịch thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.reminder.manage")]
        [HttpPost("Schedules")]
        public async Task<ResponseValue<PersonaCareScheduleDTO>> CreateScheduleAsync([FromBody] CreatePersonaCareScheduleDTO body)
        {
            var result = await _personaCareService.CreateScheduleAsync(CurrentUserId(), body);
            return new ResponseValue<PersonaCareScheduleDTO>(result, "Đã tạo cấu hình nhắc lịch", StatusReponse.Success);
        }

        [RequirePermission("persona.reminder.manage")]
        [HttpPut("Schedules/{id}")]
        public async Task<ResponseValue<PersonaCareScheduleDTO>> UpdateScheduleAsync(int id, [FromBody] UpdatePersonaCareScheduleDTO body)
        {
            var result = await _personaCareService.UpdateScheduleAsync(CurrentUserId(), id, body);
            return new ResponseValue<PersonaCareScheduleDTO>(result, "Đã cập nhật cấu hình nhắc lịch", StatusReponse.Success);
        }

        [RequirePermission("persona.reminder.manage")]
        [HttpDelete("Schedules/{id}")]
        public async Task<ResponseValue<bool>> DeleteScheduleAsync(int id)
        {
            await _personaCareService.DeleteScheduleAsync(CurrentUserId(), id);
            return new ResponseValue<bool>(true, "Đã xóa cấu hình nhắc lịch", StatusReponse.Success);
        }

        [RequirePermission("persona.reminder.view")]
        [HttpGet("Reminders")]
        public async Task<ResponseValue<List<PersonaReminderDTO>>> GetRemindersAsync([FromQuery] int daysAhead = 30)
        {
            var result = await _personaCareService.GetRemindersAsync(daysAhead);
            return new ResponseValue<List<PersonaReminderDTO>>(result, $"Có {result.Count} nhắc lịch trong {daysAhead} ngày tới", StatusReponse.Success);
        }

        [RequirePermission("persona.dashboard.view")]
        [HttpGet("Overview")]
        public async Task<ResponseValue<PersonaOverviewDTO>> GetOverviewAsync()
        {
            var result = await _personaCareService.GetOverviewAsync();
            return new ResponseValue<PersonaOverviewDTO>(result, "Lấy tổng quan thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.dashboard.view")]
        [HttpGet("Dashboard")]
        public async Task<ResponseValue<PersonaDashboardDTO>> GetDashboardAsync()
        {
            var result = await _personaCareService.GetDashboardAsync();
            return new ResponseValue<PersonaDashboardDTO>(result, "Lấy thống kê thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.dashboard.view")]
        [HttpGet("Retention")]
        public async Task<ResponseValue<PersonaRetentionDTO>> GetRetentionStatsAsync()
        {
            var result = await _personaCareService.GetRetentionStatsAsync();
            return new ResponseValue<PersonaRetentionDTO>(result, "Lấy thống kê quay lại thành công", StatusReponse.Success);
        }
    }
}
