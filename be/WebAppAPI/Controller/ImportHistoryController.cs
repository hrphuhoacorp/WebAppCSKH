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
    public class ImportHistoryController : ControllerBase
    {
        private readonly IImportHistoryService _importHistoryService;

        public ImportHistoryController(IImportHistoryService importHistoryService)
        {
            _importHistoryService = importHistoryService;
        }

        [HttpGet("GetAllImportHistoryAsync")]
        public async Task<ResponseValue<PagedResult<ImportHistoryDTO>>> GetAllImportHistoryAsync(
            [FromQuery] ImportHistoryFilterDTO filter
        )
        {
            var result = await _importHistoryService.GetAllImportHistoryAsync(filter);
            return new ResponseValue<PagedResult<ImportHistoryDTO>>(
                result,
                "Lấy danh sách lịch sử nhập khẩu thành công",
                StatusReponse.Success
            );
        }
    }
}
