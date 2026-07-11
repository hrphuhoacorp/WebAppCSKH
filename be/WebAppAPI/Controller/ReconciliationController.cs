using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReconciliationController : ControllerBase
    {
        private readonly IReconciliationService _reconciliationService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ReconciliationController(IReconciliationService reconciliationService, IHttpContextAccessor httpContextAccessor)
        {
            _reconciliationService = reconciliationService;
            _httpContextAccessor = httpContextAccessor;
        }

        private int CurrentUserId()
        {
            var claim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c => c.Type == "Id");
            return int.Parse(claim!.Value);
        }

        [RequirePermission("reconciliation.run")]
        [HttpPost("Run")]
        public async Task<ResponseValue<ReconciliationRunSummaryDTO>> RunAsync(IFormFile file, [FromForm] int month, [FromForm] int year)
        {
            var result = await _reconciliationService.RunReconciliationAsync(month, year, file, CurrentUserId());
            return new ResponseValue<ReconciliationRunSummaryDTO>(
                result,
                $"Đã rà soát xong — {result.TotalExcessRows} dòng dư, {result.TotalMissingRows} dòng thiếu.",
                StatusReponse.Success
            );
        }

        [RequirePermission("reconciliation.view")]
        [HttpGet("Runs")]
        public async Task<ResponseValue<List<ReconciliationRunSummaryDTO>>> GetRunsAsync([FromQuery] int? month, [FromQuery] int? year)
        {
            var result = await _reconciliationService.GetRunsAsync(month, year);
            return new ResponseValue<List<ReconciliationRunSummaryDTO>>(
                result,
                "Lấy danh sách rà soát thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("reconciliation.view")]
        [HttpGet("Trend")]
        public async Task<ResponseValue<List<ReconciliationRunSummaryDTO>>> GetTrendAsync()
        {
            var result = await _reconciliationService.GetTrendAsync();
            return new ResponseValue<List<ReconciliationRunSummaryDTO>>(
                result,
                "Lấy xu hướng rà soát thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("reconciliation.view")]
        [HttpGet("Runs/{id}")]
        public async Task<ResponseValue<ReconciliationRunDetailDTO>> GetRunDetailAsync(int id)
        {
            var result = await _reconciliationService.GetRunDetailAsync(id);
            return new ResponseValue<ReconciliationRunDetailDTO>(
                result,
                "Lấy chi tiết rà soát thành công",
                StatusReponse.Success
            );
        }

        [RequirePermission("reconciliation.delete")]
        [HttpPost("Runs/{id}/ConfirmDelete")]
        public async Task<ResponseValue<ConfirmDeleteExcessRowsResultDTO>> ConfirmDeleteAsync(int id, [FromBody] ConfirmDeleteExcessRowsRequestDTO body)
        {
            var result = await _reconciliationService.ConfirmDeleteExcessRowsAsync(id, body.ExcessRowIds, CurrentUserId());
            return new ResponseValue<ConfirmDeleteExcessRowsResultDTO>(
                result,
                $"Đã xóa {result.DeletedCount} dòng lệch, hoàn {result.TotalAmountReversed:N0}đ doanh thu.",
                StatusReponse.Success
            );
        }
    }
}
