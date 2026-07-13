using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PersonaTagController : ControllerBase
    {
        private readonly IPersonaTagService _personaTagService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public PersonaTagController(IPersonaTagService personaTagService, IHttpContextAccessor httpContextAccessor)
        {
            _personaTagService = personaTagService;
            _httpContextAccessor = httpContextAccessor;
        }

        private int CurrentUserId()
        {
            var claim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c => c.Type == "Id");
            return int.Parse(claim!.Value);
        }

        [RequirePermission("persona.tag.view")]
        [HttpGet("Tags")]
        public async Task<ResponseValue<List<PersonaTagDTO>>> GetTagsAsync()
        {
            var result = await _personaTagService.GetTagsAsync();
            return new ResponseValue<List<PersonaTagDTO>>(result, "Lấy danh sách tag thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.tag.manage")]
        [HttpPost("Tags")]
        public async Task<ResponseValue<PersonaTagDTO>> CreateTagAsync([FromBody] CreatePersonaTagDTO body)
        {
            var result = await _personaTagService.CreateTagAsync(CurrentUserId(), body);
            return new ResponseValue<PersonaTagDTO>(result, "Đã tạo tag", StatusReponse.Success);
        }

        [RequirePermission("persona.tag.manage")]
        [HttpPut("Tags/{id}")]
        public async Task<ResponseValue<PersonaTagDTO>> UpdateTagAsync(int id, [FromBody] UpdatePersonaTagDTO body)
        {
            var result = await _personaTagService.UpdateTagAsync(CurrentUserId(), id, body);
            return new ResponseValue<PersonaTagDTO>(result, "Đã cập nhật tag", StatusReponse.Success);
        }

        [RequirePermission("persona.tag.manage")]
        [HttpDelete("Tags/{id}")]
        public async Task<ResponseValue<bool>> DeleteTagAsync(int id)
        {
            await _personaTagService.DeleteTagAsync(CurrentUserId(), id);
            return new ResponseValue<bool>(true, "Đã xóa tag", StatusReponse.Success);
        }

        [RequirePermission("persona.assignment.manual")]
        [HttpPost("Assignments")]
        public async Task<ResponseValue<PersonaTagAssignmentDTO>> AssignTagAsync([FromBody] AssignPersonaTagRequestDTO body)
        {
            var result = await _personaTagService.AssignTagAsync(CurrentUserId(), body);
            return new ResponseValue<PersonaTagAssignmentDTO>(result, "Đã gắn tag", StatusReponse.Success);
        }

        [RequirePermission("persona.assignment.manual")]
        [HttpDelete("Assignments/{id}")]
        public async Task<ResponseValue<bool>> RemoveAssignmentAsync(int id)
        {
            await _personaTagService.RemoveAssignmentAsync(CurrentUserId(), id);
            return new ResponseValue<bool>(true, "Đã gỡ tag", StatusReponse.Success);
        }

        [RequirePermission("persona.tag.view")]
        [HttpGet("Customers/{customerId}/Tags")]
        public async Task<ResponseValue<List<PersonaTagAssignmentDTO>>> GetCustomerTagsAsync(int customerId)
        {
            var result = await _personaTagService.GetCustomerTagsAsync(customerId);
            return new ResponseValue<List<PersonaTagAssignmentDTO>>(result, "Lấy tag của khách hàng thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.assignment.manual")]
        [HttpGet("CustomersWithTags")]
        public async Task<ResponseValue<PagedResult<CustomerWithTagsDTO>>> GetCustomersWithTagsAsync(
            [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
        {
            var result = await _personaTagService.GetCustomersWithTagsAsync(search, page, pageSize);
            return new ResponseValue<PagedResult<CustomerWithTagsDTO>>(result, "Lấy danh sách khách hàng thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.tag.view")]
        [HttpGet("Categories/Distinct")]
        public async Task<ResponseValue<List<string>>> GetDistinctCategoriesAsync([FromQuery] string? search)
        {
            var result = await _personaTagService.GetDistinctCategoriesAsync(search);
            return new ResponseValue<List<string>>(result, "Lấy danh sách nhóm hàng thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.tag.view")]
        [HttpGet("Tags/{id}/Rule")]
        public async Task<ResponseValue<PersonaRuleConfigDTO?>> GetTagRuleAsync(int id)
        {
            var result = await _personaTagService.GetTagRuleAsync(id);
            return new ResponseValue<PersonaRuleConfigDTO?>(result, "Lấy luật phân loại thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.tag.manage")]
        [HttpPut("Tags/{id}/Rule")]
        public async Task<ResponseValue<bool>> SetTagRuleAsync(int id, [FromBody] PersonaRuleConfigDTO? body)
        {
            await _personaTagService.SetTagRuleAsync(CurrentUserId(), id, body);
            return new ResponseValue<bool>(true, body == null ? "Đã gỡ luật tự động" : "Đã lưu luật tự động", StatusReponse.Success);
        }

        [RequirePermission("persona.classification.run")]
        [HttpPost("Tags/{id}/Preview")]
        public async Task<ResponseValue<PersonaRulePreviewDTO>> PreviewRuleAsync(int id, [FromBody] PersonaRuleConfigDTO body)
        {
            var result = await _personaTagService.PreviewRuleAsync(body);
            return new ResponseValue<PersonaRulePreviewDTO>(result, $"Khớp {result.MatchedCount} khách hàng", StatusReponse.Success);
        }

        [RequirePermission("persona.classification.run")]
        [HttpPost("Tags/{id}/Run")]
        public async Task<ResponseValue<PersonaClassificationRunDTO>> RunClassificationAsync(int id)
        {
            var result = await _personaTagService.RunClassificationAsync(CurrentUserId(), id);
            return new ResponseValue<PersonaClassificationRunDTO>(result,
                $"Đã chạy xong — thêm {result.NewlyAddedCount}, gỡ {result.RemovedCount}, giữ nguyên {result.UnchangedCount}", StatusReponse.Success);
        }

        [RequirePermission("persona.classification.view")]
        [HttpGet("Runs")]
        public async Task<ResponseValue<PagedResult<PersonaClassificationRunDTO>>> GetRunsAsync(
            [FromQuery] int? tagId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var result = await _personaTagService.GetRunsAsync(tagId, page, pageSize);
            return new ResponseValue<PagedResult<PersonaClassificationRunDTO>>(result, "Lấy lịch sử chạy thành công", StatusReponse.Success);
        }

        [RequirePermission("persona.classification.view")]
        [HttpGet("Runs/{id}")]
        public async Task<ResponseValue<PersonaClassificationRunDetailDTO>> GetRunDetailAsync(int id)
        {
            var result = await _personaTagService.GetRunDetailAsync(id);
            return new ResponseValue<PersonaClassificationRunDetailDTO>(result, "Lấy chi tiết lần chạy thành công", StatusReponse.Success);
        }
    }
}
