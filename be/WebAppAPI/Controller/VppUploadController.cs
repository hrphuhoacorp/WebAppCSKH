using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers;

[Route("api/vpp/upload")]
[ApiController]
[Authorize]
[RequestFormLimits(MultipartBodyLengthLimit = 52_428_800)]
[RequestSizeLimit(52_428_800)]
public class VppUploadController : ControllerBase
{
    private static readonly HashSet<string> _allowed =
        new(StringComparer.OrdinalIgnoreCase) { ".pdf", ".xlsx", ".xls", ".doc", ".docx", ".jpg", ".jpeg", ".png" };

    private readonly IConfiguration _config;

    public VppUploadController(IConfiguration config) => _config = config;

    [RequirePermission("vpp.manage")]
    [HttpPost]
    public async Task<ResponseValue<List<VppFileUploadResultDto>>> Upload([FromForm] List<IFormFile> files)
    {
        var rootPath = _config["MediaSettings:RootPath"]
            ?? throw new InvalidOperationException("MediaSettings:RootPath chưa cấu hình");
        var baseUrl = _config["MediaSettings:BaseUrl"] ?? "";

        var dir = Path.Combine(rootPath, "vpp-docs");
        Directory.CreateDirectory(dir);

        var result = new List<VppFileUploadResultDto>();
        foreach (var file in files)
        {
            if (file.Length == 0) continue;

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!_allowed.Contains(ext))
                throw new BadRequestException($"Loại file không hỗ trợ: {ext}. Chấp nhận: PDF, Excel, Word, ảnh");

            var saveName = $"{Guid.NewGuid():N}{ext}";
            var savePath = Path.Combine(dir, saveName);

            await using (var stream = System.IO.File.Create(savePath))
                await file.CopyToAsync(stream);

            result.Add(new VppFileUploadResultDto
            {
                Url = $"{baseUrl}/media/vpp-docs/{saveName}",
                Name = file.FileName,
                Size = file.Length,
            });
        }

        return new ResponseValue<List<VppFileUploadResultDto>>(result, "Tải lên thành công", StatusReponse.Success);
    }
}

public class VppFileUploadResultDto
{
    public string Url { get; set; } = "";
    public string Name { get; set; } = "";
    public long Size { get; set; }
}
