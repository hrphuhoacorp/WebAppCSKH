using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using WebAppInfractor.Models;

//using WebAppAPI.Models;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerController : ControllerBase
    {
        private readonly ICustomerService _customerService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CustomerController(
            ICustomerService customerService,
            IHttpContextAccessor httpContextAccessor
        )
        {
            _customerService = customerService;
            _httpContextAccessor = httpContextAccessor;
        }

        [HttpGet("GetAllCustomersAsync")]
        public async Task<ResponseValue<PagedResult<CustomerDTO>>> GetAllCustomersAsync(
            [FromQuery] CustomerFilterDTO filter
        )
        {
            var result = await _customerService.GetCustomerAllAsync(filter);
            return new ResponseValue<PagedResult<CustomerDTO>>(
                result,
                "Lấy danh sách khách hàng thành công",
                StatusReponse.Success
            );
        }

        [HttpGet("GetCustomerByIdAsync/{id}")]
        public async Task<ResponseValue<CustomerDTO>> GetCustomerByIdAsync(int id)
        {
            var result = await _customerService.GetCustomerByIdAsync(id);
            return new ResponseValue<CustomerDTO>(
                result,
                "Lấy thông tin khách hàng thành công",
                StatusReponse.Success
            );
        }

        [HttpPut("UpdateCustomerAsync/{id}")]
        public async Task<ResponseValue<string>> UpdateCustomerAsync(
            int id,
            UpdateCustomerDTO updateDTO
        )
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                c.Type == "Id"
            );

            var result = await _customerService.UpdateCustomerAsync(
                int.Parse(userIdClaim.Value),
                id,
                updateDTO
            );
            return new ResponseValue<string>(
                result,
                "Cập nhật thông tin khách hàng thành công",
                StatusReponse.Success
            );
        }

        [HttpDelete("DeleteCustomerAsync/{id}")]
        public async Task<ResponseValue<string>> DeleteCustomerAsync(int id, DateTime updatedAt)
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                c.Type == "Id"
            );
            var result = await _customerService.DeleteCustomerAsync(
                int.Parse(userIdClaim.Value),
                id,
                updatedAt
            );
            return new ResponseValue<string>(
                result,
                "Xóa khách hàng thành công",
                StatusReponse.Success
            );
        }
    }
}
