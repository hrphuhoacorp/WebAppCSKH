using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppInfractor.Models;

//using WebAppAPI.Models;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public OrderController(IOrderService orderService, IHttpContextAccessor httpContextAccessor)
        {
            _orderService = orderService;
            _httpContextAccessor = httpContextAccessor;
        }

        [Authorize(Roles = "Super_Admin,Admin_Online,Online")]
        [HttpPost("ImportExcel")]
        public async Task<ResponseValue<ImportResultDTO>> ImportExcelAsync(IFormFile file)
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                c.Type == "Id"
            );

            var result = await _orderService.ImportExcelAsync(file, int.Parse(userIdClaim.Value));

            return new ResponseValue<ImportResultDTO>(
                result,
                "Nhập khẩu dữ liệu thành công",
                StatusReponse.Success
            );
        }

        [Authorize(Roles = "Super_Admin,Admin_Online,Online")]
        [HttpPost("RollbackImportAsync/{importHistoryId}")]
        public async Task<ResponseValue<bool>> RollbackImportAsync(int importHistoryId)
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                c.Type == "Id"
            );

            var result = await _orderService.RollbackImportAsync(
                importHistoryId,
                int.Parse(userIdClaim.Value)
            );

            return new ResponseValue<bool>(
                result,
                "Hoàn tác nhập khẩu thành công",
                StatusReponse.Success
            );
        }

        [Authorize(Roles = "Super_Admin,Admin_Online,Online")]
        [HttpPost("RestoreImportAsync/{importHistoryId}")]
        public async Task<ResponseValue<bool>> RestoreImportAsync(int importHistoryId)
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                c.Type == "Id"
            );

            var result = await _orderService.RestoreImportAsync(
                importHistoryId,
                int.Parse(userIdClaim.Value)
            );

            return new ResponseValue<bool>(
                result,
                "Khôi phục nhập khẩu thành công",
                StatusReponse.Success
            );
        }

        [Authorize(Roles = "Super_Admin,Admin_Online,Online")]
        [HttpGet("GetAllOrdersAsync")]
        public async Task<ResponseValue<PagedResult<OrderDTO>>> GetAllOrdersAsync(
            [FromQuery] OrderFilterDTO filter
        )
        {
            var result = await _orderService.GetAllOrdersAsync(filter);
            return new ResponseValue<PagedResult<OrderDTO>>(
                result,
                "Lấy danh sách đơn hàng thành công",
                StatusReponse.Success
            );
        }

        [Authorize(Roles = "Super_Admin,Admin_Online,Online")]
        [HttpGet("GetOrderByIdAsync/{id}")]
        public async Task<ResponseValue<OrderDTO>> GetOrderByIdAsync(int id)
        {
            var result = await _orderService.GetOrderByIdAsync(id);
            return new ResponseValue<OrderDTO>(
                result,
                "Lấy thông tin đơn hàng thành công",
                StatusReponse.Success
            );
        }

        [HttpGet("GetAllStatusesAsync")]
        public async Task<ResponseValue<StatusDTO[]>> GetAllStatusesAsync()
        {
            var result = await _orderService.GetAllStatusesAsync();
            return new ResponseValue<StatusDTO[]>(
                result,
                "Lấy danh sách trạng thái đơn hàng thành công",
                StatusReponse.Success
            );
        }

        [HttpGet("GetAllBranchesAsync")]
        public async Task<ResponseValue<BranchDTO[]>> GetAllBranchesAsync()
        {
            var result = await _orderService.GetAllBranchesAsync();
            return new ResponseValue<BranchDTO[]>(
                result,
                "Lấy danh sách chi nhánh thành công",
                StatusReponse.Success
            );
        }
    }
}
