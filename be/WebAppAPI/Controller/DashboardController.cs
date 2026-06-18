using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

//using WebAppAPI.Models;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Super_Admin,Admin_Online,Online")]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("GetDashboardForOnlineAsync")]
        public async Task<ResponseValue<DashboardDTO>> GetDashboardForOnlineAsync(
            [FromQuery] DashboardFilter filter
        )
        {
            var result = await _dashboardService.GetDashboardForOnlineAsync(filter);
            return new ResponseValue<DashboardDTO>(
                result,
                "Lấy thông tin thống kê thành công",
                StatusReponse.Success
            );
        }

        [HttpGet("GetDashboardForSalesAsync")]
        public async Task<ResponseValue<DashboardDTO>> GetDashboardForSalesAsync(
            [FromQuery] DashboardFilter filter
        )
        {
            var result = await _dashboardService.GetDashboardForSalesAsync(filter);
            return new ResponseValue<DashboardDTO>(
                result,
                "Lấy thông tin thống kê thành công",
                StatusReponse.Success
            );
        }
    }
}
