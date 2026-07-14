using Microsoft.AspNetCore.Mvc;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FacebookController : ControllerBase
    {
        private readonly IFacebookService _fb;

        public FacebookController(IFacebookService fb)
        {
            _fb = fb;
        }

        [HttpGet("campaigns")]
        public async Task<IActionResult> GetCampaigns()
        {
            var data = await _fb.GetCampaignsAsync();
            return Ok(new { content = data });
        }

        [HttpGet("insights")]
        public async Task<IActionResult> GetInsights(
            [FromQuery] string since,
            [FromQuery] string until,
            [FromQuery] string level = "campaign")
        {
            if (string.IsNullOrEmpty(since) || string.IsNullOrEmpty(until))
                return BadRequest("Thiếu tham số since hoặc until (định dạng: yyyy-MM-dd)");

            var data = await _fb.GetInsightsAsync(since, until, level);
            return Ok(new { content = data });
        }
    }
}
