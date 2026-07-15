using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FbCampaignTagController : ControllerBase
    {
        private readonly IFbCampaignTagService _service;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public FbCampaignTagController(IFbCampaignTagService service, IHttpContextAccessor httpContextAccessor)
        {
            _service = service;
            _httpContextAccessor = httpContextAccessor;
        }

        private int CurrentUserId()
        {
            var claim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c => c.Type == "Id");
            return int.Parse(claim!.Value);
        }

        [RequirePermission("facebook.campaign_tag.view")]
        [HttpGet("Tags")]
        public async Task<ResponseValue<List<FbCampaignTagDTO>>> GetTagsAsync([FromQuery] string? campaignId)
        {
            var result = await _service.GetTagsAsync(campaignId);
            return new ResponseValue<List<FbCampaignTagDTO>>(result, "Lấy danh sách nhãn chiến dịch thành công", StatusReponse.Success);
        }

        [RequirePermission("facebook.campaign_tag.manage")]
        [HttpPost("Tags")]
        public async Task<ResponseValue<FbCampaignTagDTO>> CreateTagAsync([FromBody] CreateFbCampaignTagDTO body)
        {
            var result = await _service.CreateTagAsync(CurrentUserId(), body);
            return new ResponseValue<FbCampaignTagDTO>(result, "Đã gắn nhãn chiến dịch", StatusReponse.Success);
        }

        [RequirePermission("facebook.campaign_tag.manage")]
        [HttpPut("Tags/{id}")]
        public async Task<ResponseValue<FbCampaignTagDTO>> UpdateTagAsync(int id, [FromBody] UpdateFbCampaignTagDTO body)
        {
            var result = await _service.UpdateTagAsync(CurrentUserId(), id, body);
            return new ResponseValue<FbCampaignTagDTO>(result, "Đã cập nhật nhãn chiến dịch", StatusReponse.Success);
        }

        [RequirePermission("facebook.campaign_tag.manage")]
        [HttpDelete("Tags/{id}")]
        public async Task<ResponseValue<bool>> DeleteTagAsync(int id)
        {
            await _service.DeleteTagAsync(CurrentUserId(), id);
            return new ResponseValue<bool>(true, "Đã gỡ nhãn chiến dịch", StatusReponse.Success);
        }

        [RequirePermission("facebook.campaign_tag.view")]
        [HttpGet("Tags/{id}/Performance")]
        public async Task<ResponseValue<FbCampaignPerformanceDTO>> GetPerformanceAsync(int id)
        {
            var result = await _service.GetPerformanceAsync(id);
            return new ResponseValue<FbCampaignPerformanceDTO>(result, "Lấy hiệu suất chiến dịch thành công", StatusReponse.Success);
        }

        [RequirePermission("facebook.campaign_tag.view")]
        [HttpGet("Tags/{id}/MatchedCustomers")]
        public async Task<ResponseValue<PagedResult<CustomerWithTagsDTO>>> GetMatchedCustomersAsync(
            int id, [FromQuery] int? personaTagId, [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
        {
            var result = await _service.GetMatchedCustomersAsync(id, personaTagId, page, pageSize);
            return new ResponseValue<PagedResult<CustomerWithTagsDTO>>(result, "Lấy danh sách khách hàng phù hợp thành công", StatusReponse.Success);
        }

        [RequirePermission("facebook.campaign_tag.view")]
        [HttpGet("Tags/{id}/TagCounts")]
        public async Task<ResponseValue<CampaignTagCountsDTO>> GetTagCountsAsync(int id)
        {
            var result = await _service.GetTagCountsAsync(id);
            return new ResponseValue<CampaignTagCountsDTO>(result, "Lấy số lượng tag thành công", StatusReponse.Success);
        }

        [RequirePermission("facebook.campaign_tag.view")]
        [HttpGet("Tags/{id}/CareOpportunities")]
        public async Task<ResponseValue<PagedResult<CareOpportunityCustomerDTO>>> GetCareOpportunitiesAsync(
            int id, [FromQuery] int? personaTagId, [FromQuery] int? minDays, [FromQuery] int? maxDays,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
        {
            var result = await _service.GetCareOpportunitiesAsync(id, personaTagId, page, pageSize, minDays, maxDays);
            return new ResponseValue<PagedResult<CareOpportunityCustomerDTO>>(result, "Lấy cơ hội chăm sóc thành công", StatusReponse.Success);
        }
    }
}
