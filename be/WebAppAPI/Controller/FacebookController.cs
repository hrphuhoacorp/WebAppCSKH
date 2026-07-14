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

        /// <summary>
        /// Kéo insights theo ngày. level: campaign | adset | ad
        /// </summary>
        [HttpGet("insights")]
        public async Task<IActionResult> GetInsights(
            [FromQuery] string since,
            [FromQuery] string until,
            [FromQuery] string level = "campaign")
        {
            if (string.IsNullOrEmpty(since) || string.IsNullOrEmpty(until))
                return BadRequest("Thiếu tham số since hoặc until (yyyy-MM-dd)");

            var data = await _fb.GetInsightsAsync(since, until, level);
            return Ok(new { content = data });
        }

        /// <summary>
        /// Breakdown theo nhân khẩu học / địa lý / thiết bị.
        /// breakdown: age | gender | region | device_platform | publisher_platform
        /// </summary>
        [HttpGet("insights/breakdown")]
        public async Task<IActionResult> GetInsightsBreakdown(
            [FromQuery] string since,
            [FromQuery] string until,
            [FromQuery] string breakdown,
            [FromQuery] string level = "campaign")
        {
            if (string.IsNullOrEmpty(since) || string.IsNullOrEmpty(until))
                return BadRequest("Thiếu tham số since hoặc until (yyyy-MM-dd)");

            var allowed = new[] { "age", "gender", "region", "device_platform", "publisher_platform" };
            if (!allowed.Contains(breakdown))
                return BadRequest($"breakdown phải là một trong: {string.Join(", ", allowed)}");

            var data = await _fb.GetInsightsWithBreakdownAsync(since, until, breakdown, level);
            return Ok(new { content = data });
        }
    }
}
