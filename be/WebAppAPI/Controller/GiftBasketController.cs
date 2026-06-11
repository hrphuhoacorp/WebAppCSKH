using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

public class ImportSapoRequest
{
    public IFormFile File { get; set; } = null!;
    public string ReportDate { get; set; } = "";
}

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class GiftBasketController : ControllerBase
    {
        private readonly IGiftBasketService _service;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public GiftBasketController(
            IGiftBasketService service,
            IHttpContextAccessor httpContextAccessor
        )
        {
            _service = service;
            _httpContextAccessor = httpContextAccessor;
        }

        private int GetCurrentUserId()
        {
            var claim = _httpContextAccessor.HttpContext?.User.Claims.FirstOrDefault(c =>
                c.Type == "Id"
            );
            return int.Parse(claim!.Value);
        }

        // ─── BASKETS ──────────────────────────────────────────────────────────

        [HttpGet("List")]
        public async Task<ResponseValue<PagedResult<GiftBasketDTO>>> GetList(
            [FromQuery] GiftBasketFilterDTO filter
        )
        {
            try
            {
                var result = await _service.GetBasketsAsync(filter);
                return new ResponseValue<PagedResult<GiftBasketDTO>>
                {
                    StatusCode = 200,
                    Data = result,
                };
            }
            catch (Exception ex)
            {
                return new ResponseValue<PagedResult<GiftBasketDTO>>
                {
                    StatusCode = 500,
                    Message = ex.Message,
                };
            }
        }

        [HttpPost("Create")]
        public async Task<ResponseValue<GiftBasketDTO>> Create([FromBody] CreateGiftBasketDTO dto)
        {
            try
            {
                var result = await _service.CreateBasketAsync(dto, GetCurrentUserId());
                return new ResponseValue<GiftBasketDTO> { StatusCode = 200, Data = result };
            }
            catch (Exception ex)
            {
                return new ResponseValue<GiftBasketDTO> { StatusCode = 500, Message = ex.Message };
            }
        }

        [HttpPut("Update")]
        public async Task<ResponseValue<GiftBasketDTO>> Update([FromBody] UpdateGiftBasketDTO dto)
        {
            try
            {
                var result = await _service.UpdateBasketAsync(dto, GetCurrentUserId());
                return new ResponseValue<GiftBasketDTO> { StatusCode = 200, Data = result };
            }
            catch (NotFoundException ex)
            {
                return new ResponseValue<GiftBasketDTO> { StatusCode = 404, Message = ex.Message };
            }
            catch (Exception ex)
            {
                return new ResponseValue<GiftBasketDTO> { StatusCode = 500, Message = ex.Message };
            }
        }

        [HttpDelete("{id}")]
        public async Task<ResponseValue<bool>> Delete(int id)
        {
            try
            {
                await _service.DeleteBasketAsync(id, GetCurrentUserId());
                return new ResponseValue<bool> { StatusCode = 200, Data = true };
            }
            catch (NotFoundException ex)
            {
                return new ResponseValue<bool> { StatusCode = 404, Message = ex.Message };
            }
            catch (Exception ex)
            {
                return new ResponseValue<bool> { StatusCode = 500, Message = ex.Message };
            }
        }

        [HttpPost("UploadImage")]
        [Consumes("multipart/form-data")]
        public async Task<ResponseValue<string>> UploadImage(IFormFile file)
        {
            try
            {
                var url = await _service.UploadBasketImageAsync(file, GetCurrentUserId());
                return new ResponseValue<string> { StatusCode = 200, Data = url };
            }
            catch (BadRequestException ex)
            {
                return new ResponseValue<string> { StatusCode = 400, Message = ex.Message };
            }
            catch (Exception ex)
            {
                return new ResponseValue<string> { StatusCode = 500, Message = ex.Message };
            }
        }

        // ─── CODE MAPPINGS ────────────────────────────────────────────────────

        [HttpGet("CodeMappings")]
        public async Task<ResponseValue<List<GiftCodeMappingDTO>>> GetCodeMappings(
            [FromQuery] int? branchId
        )
        {
            try
            {
                var result = await _service.GetCodeMappingsAsync(branchId);
                return new ResponseValue<List<GiftCodeMappingDTO>>
                {
                    StatusCode = 200,
                    Data = result,
                };
            }
            catch (Exception ex)
            {
                return new ResponseValue<List<GiftCodeMappingDTO>>
                {
                    StatusCode = 500,
                    Message = ex.Message,
                };
            }
        }

        // ─── SAPO ─────────────────────────────────────────────────────────────

        [HttpPost("ImportSapo")]
        [Consumes("multipart/form-data")]
        public async Task<ResponseValue<SapoDashboardDTO>> ImportSapo([FromForm] ImportSapoRequest request)
        {
            try
            {
                var result = await _service.ImportSapoFileAsync(
                    request.File,
                    request.ReportDate,
                    GetCurrentUserId()
                );
                return new ResponseValue<SapoDashboardDTO> { StatusCode = 200, Data = result };
            }
            catch (BadRequestException ex)
            {
                return new ResponseValue<SapoDashboardDTO>
                {
                    StatusCode = 400,
                    Message = ex.Message,
                };
            }
            catch (Exception ex)
            {
                return new ResponseValue<SapoDashboardDTO>
                {
                    StatusCode = 500,
                    Message = ex.Message,
                };
            }
        }

        [HttpDelete("SapoImport/{importBatchId}")]
        public async Task<ResponseValue<bool>> DeleteSapoImport(string importBatchId)
        {
            try
            {
                await _service.DeleteSapoImportAsync(importBatchId, GetCurrentUserId());
                return new ResponseValue<bool> { StatusCode = 200, Data = true };
            }
            catch (Exception ex)
            {
                return new ResponseValue<bool> { StatusCode = 500, Message = ex.Message };
            }
        }

        [HttpGet("SapoDashboard")]
        public async Task<ResponseValue<SapoDashboardDTO>> GetSapoDashboard(
            [FromQuery] string? filterKey
        )
        {
            try
            {
                var result = await _service.GetSapoDashboardAsync(filterKey ?? "all");
                return new ResponseValue<SapoDashboardDTO> { StatusCode = 200, Data = result };
            }
            catch (Exception ex)
            {
                return new ResponseValue<SapoDashboardDTO>
                {
                    StatusCode = 500,
                    Message = ex.Message,
                };
            }
        }

        // ─── CODE CHANGE REQUESTS ─────────────────────────────────────────────

        [HttpGet("ChangeRequests")]
        public async Task<ResponseValue<PagedResult<GiftCodeChangeRequestDTO>>> GetChangeRequests(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? status = null,
            [FromQuery] int? branchId = null
        )
        {
            try
            {
                var result = await _service.GetCodeChangeRequestsAsync(
                    page,
                    pageSize,
                    status,
                    branchId
                );
                return new ResponseValue<PagedResult<GiftCodeChangeRequestDTO>>
                {
                    StatusCode = 200,
                    Data = result,
                };
            }
            catch (Exception ex)
            {
                return new ResponseValue<PagedResult<GiftCodeChangeRequestDTO>>
                {
                    StatusCode = 500,
                    Message = ex.Message,
                };
            }
        }

        [HttpPost("ChangeRequest/Create")]
        public async Task<ResponseValue<GiftCodeChangeRequestDTO>> CreateChangeRequest(
            [FromBody] CreateCodeChangeRequestDTO dto
        )
        {
            try
            {
                var result = await _service.CreateCodeChangeRequestAsync(dto, GetCurrentUserId());
                return new ResponseValue<GiftCodeChangeRequestDTO>
                {
                    StatusCode = 200,
                    Data = result,
                };
            }
            catch (Exception ex)
            {
                return new ResponseValue<GiftCodeChangeRequestDTO>
                {
                    StatusCode = 500,
                    Message = ex.Message,
                };
            }
        }

        [HttpPut("ChangeRequest/Handle")]
        public async Task<ResponseValue<GiftCodeChangeRequestDTO>> HandleChangeRequest(
            [FromBody] HandleCodeChangeRequestDTO dto
        )
        {
            try
            {
                var result = await _service.HandleCodeChangeRequestAsync(dto, GetCurrentUserId());
                return new ResponseValue<GiftCodeChangeRequestDTO>
                {
                    StatusCode = 200,
                    Data = result,
                };
            }
            catch (NotFoundException ex)
            {
                return new ResponseValue<GiftCodeChangeRequestDTO>
                {
                    StatusCode = 404,
                    Message = ex.Message,
                };
            }
            catch (Exception ex)
            {
                return new ResponseValue<GiftCodeChangeRequestDTO>
                {
                    StatusCode = 500,
                    Message = ex.Message,
                };
            }
        }
    }
}
