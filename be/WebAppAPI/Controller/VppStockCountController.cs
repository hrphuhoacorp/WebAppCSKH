using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAppAPI.Controllers;

[Route("api/vpp/stock-counts")]
[ApiController]
[Authorize]
public class VppStockCountController : ControllerBase
{
    private readonly IVppStockCountService _service;

    public VppStockCountController(IVppStockCountService service) => _service = service;

    [HttpGet]
    public async Task<ResponseValue<PagedResult<VppStockCountDto>>> GetAll(
        [FromQuery] int? month,
        [FromQuery] int? year,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20
    )
    {
        var result = await _service.GetAllAsync(month, year, page, pageSize);
        return new ResponseValue<PagedResult<VppStockCountDto>>(
            result,
            "OK",
            StatusReponse.Success
        );
    }

    [HttpGet("{id:int}")]
    public async Task<ResponseValue<VppStockCountDetailDto>> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy phiếu kiểm kho");
        return new ResponseValue<VppStockCountDetailDto>(result, "OK", StatusReponse.Success);
    }

    [HttpPost]
    public async Task<ResponseValue<VppStockCountDetailDto>> Create(
        [FromBody] VppStockCountCreateDto dto
    )
    {
        var name = User.FindFirstValue(ClaimTypes.Name) ?? "";
        var result = await _service.CreateAsync(dto, name);
        return new ResponseValue<VppStockCountDetailDto>(
            result,
            "Tạo phiếu kiểm kho thành công",
            StatusReponse.Success
        );
    }

    [HttpPut("{id:int}/lines/{lineId:int}")]
    public async Task<ResponseValue<object>> UpdateLine(
        int id,
        int lineId,
        [FromBody] VppStockCountLineUpdateDto dto
    )
    {
        await _service.UpdateLineAsync(id, lineId, dto.ActualQty, dto.Note);
        return new ResponseValue<object>(
            new { success = true },
            "Cập nhật thành công",
            StatusReponse.Success
        );
    }

    [HttpPost("{id:int}/confirm")]
    public async Task<ResponseValue<VppStockCountDetailDto>> Confirm(int id)
    {
        var name = User.FindFirstValue(ClaimTypes.Name) ?? "";
        var result = await _service.ConfirmAsync(id, name);
        return new ResponseValue<VppStockCountDetailDto>(
            result,
            "Đã xác nhận phiếu kiểm kho",
            StatusReponse.Success
        );
    }
}

public class VppStockCountLineUpdateDto
{
    public decimal ActualQty { get; set; }
    public string? Note { get; set; }
}
