using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAppAPI.Controllers
{
    [Route("api/promo-template-layouts")]
    [ApiController]
    [Authorize]
    public class PromoTemplateLayoutController : ControllerBase
    {
        private readonly IPromoTemplateLayoutService _service;

        public PromoTemplateLayoutController(IPromoTemplateLayoutService service) =>
            _service = service;

        [HttpGet]
        public async Task<ResponseValue<List<PromoTemplateLayoutDTO>>> GetAll()
        {
            var result = await _service.GetAllAsync();
            return new ResponseValue<List<PromoTemplateLayoutDTO>>(result, "OK", StatusReponse.Success);
        }

        [HttpPut("{templateKind}")]
        public async Task<ResponseValue<PromoTemplateLayoutDTO>> Upsert(
            string templateKind,
            [FromBody] PromoTemplateLayoutUpsertDTO dto
        )
        {
            var result = await _service.UpsertAsync(templateKind, dto);
            return new ResponseValue<PromoTemplateLayoutDTO>(result, "Lưu mẫu thành công", StatusReponse.Success);
        }

        [HttpDelete("{templateKind}")]
        public async Task<ResponseValue<string>> Delete(string templateKind)
        {
            await _service.DeleteAsync(templateKind);
            return new ResponseValue<string>(templateKind, "Đã xóa loại bảng giá", StatusReponse.Success);
        }
    }
}
