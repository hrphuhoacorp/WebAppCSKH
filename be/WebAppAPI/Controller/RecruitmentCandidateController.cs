using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppAPI.Authorization;

namespace WebAppAPI.Controllers
{
    [Route("api/recruitment/candidates")]
    [ApiController]
    [Authorize]
    public class RecruitmentCandidateController : ControllerBase
    {
        private readonly IRecruitmentCandidateService _service;

        public RecruitmentCandidateController(IRecruitmentCandidateService service) =>
            _service = service;

        [RequirePermission("recruitment.view")]
        [HttpGet]
        public async Task<ResponseValue<IEnumerable<RecruitmentCandidateDto>>> GetAll(
            [FromQuery] int? campaignId,
            [FromQuery] string? status,
            [FromQuery] string? search
        )
        {
            var result = await _service.GetAllAsync(campaignId, status, search);
            return new ResponseValue<IEnumerable<RecruitmentCandidateDto>>(
                result,
                "OK",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.view")]
        [HttpGet("{id:int}")]
        public async Task<ResponseValue<RecruitmentCandidateDetailDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null)
                return new ResponseValue<RecruitmentCandidateDetailDto>(
                    null,
                    "Không Tìm Thấy Ứng Viên",
                    StatusReponse.Error
                );
            return new ResponseValue<RecruitmentCandidateDetailDto>(
                result,
                "OK",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.edit")]
        [HttpPost]
        public async Task<ResponseValue<RecruitmentCandidateDto>> Create(
            [FromBody] CandidateCreateDto dto
        )
        {
            var result = await _service.CreateAsync(dto);
            return new ResponseValue<RecruitmentCandidateDto>(
                result,
                "Thêm Ứng Viên Thành Công",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.edit")]
        [HttpPut("{id:int}")]
        public async Task<ResponseValue<RecruitmentCandidateDto>> Update(
            int id,
            [FromBody] CandidateUpdateDto dto
        )
        {
            var result = await _service.UpdateAsync(id, dto);
            return new ResponseValue<RecruitmentCandidateDto>(
                result,
                "Cập Nhật Thành Công",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.edit")]
        [HttpPost("{id:int}/upload-cv")]
        [RequestSizeLimit(20 * 1024 * 1024)]
        [Consumes("multipart/form-data")]
        public async Task<ResponseValue<CvUploadResultDto>> UploadCv(
            int id,
            [FromForm] UploadCvForm form
        )
        {
            var result = await _service.UploadCvAsync(id, form.File, form.ActedBy);
            return new ResponseValue<CvUploadResultDto>(
                result,
                "Tải CV Thành Công",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.view")]
        [HttpGet("{id:int}/download-cv")]
        public async Task<IActionResult> DownloadCv(int id)
        {
            var (bytes, mime, fileName) = await _service.DownloadCvAsync(id);
            return File(bytes, mime, fileName);
        }

        [RequirePermission("recruitment.edit")]
        [HttpPost("{id:int}/send-mail")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(25 * 1024 * 1024)]
        public async Task<ResponseValue<object>> SendMail(int id, [FromForm] SendMailDto dto)
        {
            await _service.SendMailAsync(id, dto);
            return new ResponseValue<object>(
                new { success = true },
                "Đã Gửi Email Thành Công",
                StatusReponse.Success
            );
        }

        [RequirePermission("recruitment.edit")]
        [HttpDelete("{id:int}")]
        public async Task<ResponseValue<object>> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return new ResponseValue<object>(
                new { success = true },
                "Đã Xóa Ứng Viên",
                StatusReponse.Success
            );
        }
    }
}
