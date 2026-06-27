using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAppAPI.Controllers;

[Route("api/vpp/imports")]
[ApiController]
[Authorize]
public class VppImportController : ControllerBase
{
    private readonly IVppImportService _service;

    public VppImportController(IVppImportService service) => _service = service;

    [HttpGet]
    public async Task<ResponseValue<PagedResult<VppImportDto>>> GetAll(
        [FromQuery] int? month,
        [FromQuery] int? year,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20
    )
    {
        var result = await _service.GetAllAsync(month, year, page, pageSize);
        return new ResponseValue<PagedResult<VppImportDto>>(result, "OK", StatusReponse.Success);
    }

    [HttpGet("{id:int}")]
    public async Task<ResponseValue<VppImportDetailDto>> GetById(int id)
    {
        var result =
            await _service.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy phiếu nhập");
        return new ResponseValue<VppImportDetailDto>(result, "OK", StatusReponse.Success);
    }

    [HttpPost]
    public async Task<ResponseValue<VppImportDetailDto>> Create([FromBody] VppImportCreateDto dto)
    {
        var name = User.FindFirstValue(ClaimTypes.Name) ?? "";
        var result = await _service.CreateAsync(dto, name);
        return new ResponseValue<VppImportDetailDto>(
            result,
            "Tạo phiếu nhập thành công",
            StatusReponse.Success
        );
    }

    [HttpDelete("{id:int}")]
    public async Task<ResponseValue<object>> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return new ResponseValue<object>(
            new { success = true },
            "Đã xóa phiếu nhập",
            StatusReponse.Success
        );
    }
}
