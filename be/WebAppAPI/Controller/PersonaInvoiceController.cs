using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PersonaInvoiceController : ControllerBase
    {
        private readonly IPersonaInvoiceService _personaInvoiceService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public PersonaInvoiceController(IPersonaInvoiceService personaInvoiceService, IHttpContextAccessor httpContextAccessor)
        {
            _personaInvoiceService = personaInvoiceService;
            _httpContextAccessor = httpContextAccessor;
        }

        private int CurrentUserId()
        {
            var claim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c => c.Type == "Id");
            return int.Parse(claim!.Value);
        }

        [RequirePermission("persona.dashboard.view")]
        [HttpPost("Import")]
        public async Task<ResponseValue<PersonaInvoiceImportResultDTO>> ImportInvoicesAsync(IFormFile file)
        {
            var result = await _personaInvoiceService.ImportInvoicesAsync(file, CurrentUserId());
            return new ResponseValue<PersonaInvoiceImportResultDTO>(result,
                $"Đã nạp xong — khớp {result.MatchedRows}, không khớp {result.UnmatchedRows}", StatusReponse.Success);
        }

        [RequirePermission("persona.dashboard.view")]
        [HttpGet("Imports")]
        public async Task<ResponseValue<PagedResult<PersonaInvoiceImportDTO>>> GetImportsAsync(
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var result = await _personaInvoiceService.GetImportsAsync(page, pageSize);
            return new ResponseValue<PagedResult<PersonaInvoiceImportDTO>>(result, "Lấy lịch sử nạp hóa đơn thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.dashboard.view")]
        [HttpGet("BusinessCustomers")]
        public async Task<ResponseValue<PagedResult<BusinessCustomerDTO>>> GetBusinessCustomersAsync(
            [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
        {
            var result = await _personaInvoiceService.GetBusinessCustomersAsync(search, page, pageSize);
            return new ResponseValue<PagedResult<BusinessCustomerDTO>>(result, "Lấy danh sách khách hàng doanh nghiệp thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.dashboard.view")]
        [HttpDelete("BusinessCustomers/{customerId}")]
        public async Task<ResponseValue<bool>> RemoveBusinessFlagAsync(int customerId)
        {
            await _personaInvoiceService.RemoveBusinessFlagAsync(CurrentUserId(), customerId);
            return new ResponseValue<bool>(true, "Đã gỡ nhãn khách hàng doanh nghiệp", StatusReponse.Success);
        }
    }
}
