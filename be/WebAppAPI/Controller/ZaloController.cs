using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ZaloController : ControllerBase
    {
        private readonly IZaloService _zalo;
        private readonly IUserRepository _userRepo;
        private readonly IUnitOfWork _uow;

        public ZaloController(IZaloService zalo, IUserRepository userRepo, IUnitOfWork uow)
        {
            _zalo = zalo;
            _userRepo = userRepo;
            _uow = uow;
        }

        // Zalo redirect đến đây sau khi admin xác nhận cấp quyền
        [AllowAnonymous]
        [HttpGet("callback")]
        public async Task<IActionResult> Callback(
            [FromQuery] string code,
            [FromQuery] string? state
        )
        {
            if (string.IsNullOrWhiteSpace(code))
                return BadRequest("Thiếu authorization code.");
            try
            {
                await _zalo.ExchangeCodeAsync(code);
                return Content(
                    "<html><body style='font-family:sans-serif;padding:40px'>"
                        + "<h2 style='color:green'>✅ Zalo OA đã được kết nối thành công!</h2>"
                        + "<p>Token đã được lưu. Bạn có thể đóng tab này.</p></body></html>",
                    "text/html"
                );
            }
            catch (Exception ex)
            {
                return Content(
                    $"<html><body style='font-family:sans-serif;padding:40px'>"
                        + $"<h2 style='color:red'>❌ Lỗi kết nối Zalo OA</h2>"
                        + $"<p>{ex.Message}</p></body></html>",
                    "text/html"
                );
            }
        }

        // Zalo gọi GET để xác minh webhook URL
        [AllowAnonymous]
        [HttpGet("webhook")]
        public IActionResult WebhookVerify([FromQuery] string challenge)
        {
            return Ok(challenge);
        }

        // Zalo gửi events về đây
        [AllowAnonymous]
        [HttpPost("webhook")]
        public async Task<IActionResult> WebhookEvent()
        {
            using var reader = new System.IO.StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();

            JsonElement root;
            try
            {
                root = JsonDocument.Parse(body).RootElement;
            }
            catch
            {
                return Ok();
            }

            var eventName = root.TryGetProperty("event_name", out var en) ? en.GetString() : "";
            var userId =
                root.TryGetProperty("sender", out var sender)
                && sender.TryGetProperty("id", out var sid)
                    ? sid.GetString()
                    : "";

            if (string.IsNullOrEmpty(userId))
                return Ok();

            // Xử lý khi nhân viên nhắn mã nhân viên để tự đăng ký
            if (eventName == "user_send_text")
            {
                var text =
                    root.TryGetProperty("message", out var msg)
                    && msg.TryGetProperty("text", out var t)
                        ? t.GetString()?.Trim().ToUpper()
                        : "";

                if (!string.IsNullOrEmpty(text))
                {
                    // Kiểm tra Zalo này đã link mã NV khác chưa
                    var alreadyLinked = await _userRepo
                        .GetAll()
                        .FirstOrDefaultAsync(u => u.ZaloUserId == userId && u.DeletedAt == null);

                    if (alreadyLinked != null)
                    {
                        await _zalo.SendOaMessageAsync(
                            userId,
                            $"⚠️ Tài khoản Zalo này đã được liên kết với nhân viên {alreadyLinked.Name} ({alreadyLinked.StaffCode}). Liên hệ quản trị viên nếu cần thay đổi."
                        );
                        return Ok();
                    }

                    var user = await _userRepo
                        .GetAll()
                        .FirstOrDefaultAsync(u =>
                            u.StaffCode != null
                            && u.StaffCode.ToUpper() == text
                            && u.DeletedAt == null
                        );

                    if (user != null)
                    {
                        // Kiểm tra mã NV đó đã bị người khác link chưa
                        if (!string.IsNullOrEmpty(user.ZaloUserId) && user.ZaloUserId != userId)
                        {
                            await _zalo.SendOaMessageAsync(
                                userId,
                                $"⚠️ Mã nhân viên \"{text}\" đã được liên kết với tài khoản Zalo khác. Liên hệ quản trị viên để gỡ liên kết."
                            );
                            return Ok();
                        }

                        user.ZaloUserId = userId;
                        await _uow.SaveChangesAsync();
                        await _zalo.SendOaMessageAsync(
                            userId,
                            $"✅ Tài khoản {user.Name} ({user.StaffCode}) đã được liên kết với Zalo thành công!"
                        );
                    }
                    else
                    {
                        await _zalo.SendOaMessageAsync(
                            userId,
                            $"❌ Không tìm thấy mã nhân viên \"{text}\". Vui lòng nhắn đúng mã nhân viên của bạn (ví dụ: PHF082)."
                        );
                    }
                }
            }

            return Ok();
        }

        // Kiểm tra trạng thái token
        [HttpGet("status")]
        public IActionResult Status()
        {
            var info = _zalo.GetTokenInfo();
            if (info == null)
                return Ok(
                    new { connected = false, message = "Chưa có token. Vui lòng kết nối OA." }
                );

            var accessOk = DateTime.UtcNow < info.AccessTokenExpiresAt;
            var refreshOk = DateTime.UtcNow < info.RefreshTokenExpiresAt;

            return Ok(
                new
                {
                    connected = refreshOk,
                    accessTokenValid = accessOk,
                    accessTokenExpiresAt = info
                        .AccessTokenExpiresAt.AddHours(7)
                        .ToString("yyyy-MM-dd HH:mm"),
                    refreshTokenExpiresAt = info
                        .RefreshTokenExpiresAt.AddHours(7)
                        .ToString("yyyy-MM-dd HH:mm"),
                    message = !refreshOk ? "Refresh token hết hạn, cần kết nối lại OA."
                    : !accessOk ? "Access token hết hạn, sẽ tự refresh khi gọi API."
                    : "OK",
                }
            );
        }

        [HttpPost("send-message")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
        {
            var ok = await _zalo.SendOaMessageAsync(dto.UserId, dto.Text);
            return Ok(new { success = ok });
        }

        [HttpPost("send-zns")]
        public async Task<IActionResult> SendZns([FromBody] SendZnsDto dto)
        {
            var ok = await _zalo.SendZnsAsync(
                dto.Phone,
                dto.TemplateId,
                dto.TemplateData,
                dto.TrackingId
            );
            return Ok(new { success = ok });
        }
    }

    public class SendMessageDto
    {
        public string UserId { get; set; } = "";
        public string Text { get; set; } = "";
    }

    public class SendZnsDto
    {
        public string Phone { get; set; } = "";
        public string TemplateId { get; set; } = "";
        public Dictionary<string, string> TemplateData { get; set; } = new();
        public string? TrackingId { get; set; }
    }
}
