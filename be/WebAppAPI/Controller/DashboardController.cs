using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

//using WebAppAPI.Models;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("GetDashboardAsync")]
        public async Task<ResponseValue<DashboardDTO>> GetDashboardAsync(
            [FromQuery] DashboardFilter filter
        )
        {
            var result = await _dashboardService.GetDashboardAsync(filter);
            return new ResponseValue<DashboardDTO>(
                result,
                "Lấy thông tin thống kê thành công",
                StatusReponse.Success
            );
        }
    }
}
