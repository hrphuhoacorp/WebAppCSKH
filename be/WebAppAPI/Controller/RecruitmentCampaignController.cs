using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers
{
    [Route("api/recruitment/campaigns")]
    [ApiController]
    [Authorize]
    public class RecruitmentCampaignController : ControllerBase
    {
        private readonly IRecruitmentCampaignService _service;

        public RecruitmentCampaignController(IRecruitmentCampaignService service) =>
            _service = service;

        [RequirePermission("recruitment.view")]
        [HttpGet]
        public async Task<ResponseValue<IEnumerable<RecruitmentCampaignDto>>> GetAll(
            [FromQuery] bool includeDeleted = false
        )
        {
            var result = await _service.GetAllAsync(includeDeleted);
            return new ResponseValue<IEnumerable<RecruitmentCampaignDto>>(
                result,
                "OK",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.view")]
        [HttpGet("{id:int}")]
        public async Task<ResponseValue<RecruitmentCampaignDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null)
                return new ResponseValue<RecruitmentCampaignDto>(
                    null,
                    "Không tìm thấy chiến dịch",
                    StatusReponse.Error
                );
            return new ResponseValue<RecruitmentCampaignDto>(result, "OK", StatusReponse.Success);
        }

        [RequirePermission("recruitment.edit")]
        [HttpPost]
        public async Task<ResponseValue<RecruitmentCampaignDto>> Create(
            [FromBody] CampaignUpsertDto dto
        )
        {
            var result = await _service.CreateAsync(dto);
            return new ResponseValue<RecruitmentCampaignDto>(
                result,
                "Tạo chiến dịch thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.edit")]
        [HttpPut("{id:int}")]
        public async Task<ResponseValue<RecruitmentCampaignDto>> Update(
            int id,
            [FromBody] CampaignUpsertDto dto
        )
        {
            var result = await _service.UpdateAsync(id, dto);
            return new ResponseValue<RecruitmentCampaignDto>(
                result,
                "Cập nhật thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.edit")]
        [HttpDelete("{id:int}")]
        public async Task<ResponseValue<object>> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return new ResponseValue<object>(
                new { success = true },
                "Đã xóa chiến dịch",
                StatusReponse.Success
            );
        }
    }
}
