using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers
{
    [Route("api/recruitment/settings")]
    [ApiController]
    [Authorize]
    public class RecruitmentSettingsController : ControllerBase
    {
        private readonly IRecruitmentSettingsService _service;

        public RecruitmentSettingsController(IRecruitmentSettingsService service) =>
            _service = service;

        [RequirePermission("recruitment.view")]
        [HttpGet]
        public async Task<ResponseValue<RecruitmentSettingsDto>> Get()
        {
            var result = await _service.GetSettingsAsync();
            return new ResponseValue<RecruitmentSettingsDto>(result, "OK", StatusReponse.Success);
        }

        [RequirePermission("recruitment.settings")]
        [HttpPut]
        public async Task<ResponseValue<RecruitmentSettingsDto>> Update(
            [FromBody] RecruitmentSettingsUpsertDto dto
        )
        {
            var result = await _service.UpsertSettingsAsync(dto);
            return new ResponseValue<RecruitmentSettingsDto>(
                result,
                "Lưu Cài Đặt Thành Công",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.view")]
        [HttpGet("categories")]
        public async Task<ResponseValue<Dictionary<string, List<CategoryItemDto>>>> GetCategories()
        {
            var result = await _service.GetCategoriesAsync();
            return new ResponseValue<Dictionary<string, List<CategoryItemDto>>>(
                result,
                "OK",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.view")]
        [HttpGet("mail-templates")]
        public async Task<ResponseValue<IEnumerable<MailTemplateDto>>> GetMailTemplates()
        {
            var result = await _service.GetMailTemplatesAsync();
            return new ResponseValue<IEnumerable<MailTemplateDto>>(
                result,
                "OK",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.settings")]
        [HttpPut("mail-templates/{id:int}")]
        public async Task<ResponseValue<MailTemplateDto>> UpdateMailTemplate(
            int id,
            [FromBody] MailTemplateUpsertDto dto
        )
        {
            var result = await _service.UpdateMailTemplateAsync(id, dto);
            return new ResponseValue<MailTemplateDto>(
                result,
                "Cập Nhật Temple Thành Công",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.settings")]
        [HttpPost("categories")]
        public async Task<ResponseValue<CategoryItemDto>> CreateCategory([FromBody] CategoryUpsertDto dto)
        {
            var result = await _service.CreateCategoryAsync(dto);
            return new ResponseValue<CategoryItemDto>(result, "Thêm danh mục thành công", StatusReponse.Success);
        }

        [RequirePermission("recruitment.settings")]
        [HttpPut("categories/{id:int}")]
        public async Task<ResponseValue<CategoryItemDto>> UpdateCategory(int id, [FromBody] CategoryUpsertDto dto)
        {
            var result = await _service.UpdateCategoryAsync(id, dto);
            return new ResponseValue<CategoryItemDto>(result, "Cập nhật thành công", StatusReponse.Success);
        }

        [RequirePermission("recruitment.settings")]
        [HttpDelete("categories/{id:int}")]
        public async Task<ResponseValue<object>> DeleteCategory(int id)
        {
            await _service.DeleteCategoryAsync(id);
            return new ResponseValue<object>(new { success = true }, "Đã xóa danh mục", StatusReponse.Success);
        }

        [RequirePermission("recruitment.settings")]
        [HttpPost("mail-templates")]
        public async Task<ResponseValue<MailTemplateDto>> CreateMailTemplate([FromBody] MailTemplateCreateDto dto)
        {
            var result = await _service.CreateMailTemplateAsync(dto);
            return new ResponseValue<MailTemplateDto>(result, "Thêm template thành công", StatusReponse.Success);
        }
    }
}
