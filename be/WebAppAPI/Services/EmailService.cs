using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

public interface IEmailService
{
    Task SendEmaiLAsync(string to, string subject, string html, IList<IFormFile>? attachments = null);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendEmaiLAsync(string to, string subject, string html, IList<IFormFile>? attachments = null)
    {
        var email = new MimeMessage();
        email.From.Add(MailboxAddress.Parse(_config["EmailSettings:Email"]));
        email.To.Add(MailboxAddress.Parse(to));
        email.Subject = subject;

        var builder = new BodyBuilder { HtmlBody = html };
        if (attachments != null)
        {
            foreach (var file in attachments)
            {
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                builder.Attachments.Add(file.FileName, ms.ToArray(),
                    ContentType.Parse(file.ContentType ?? "application/octet-stream"));
            }
        }
        email.Body = builder.ToMessageBody();

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(
            _config["EmailSettings:Host"],
            int.Parse(_config["EmailSettings:Port"]!),
            SecureSocketOptions.StartTls
        );
        await smtp.AuthenticateAsync(
            _config["EmailSettings:Email"],
            _config["EmailSettings:Password"]
        );
        await smtp.SendAsync(email);
        await smtp.DisconnectAsync(true);
    }
}
