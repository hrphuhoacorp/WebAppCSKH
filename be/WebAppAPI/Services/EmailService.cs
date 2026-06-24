using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

public interface IEmailService
{
    Task SendEmaiLAsync(string to, string subject, string html);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendEmaiLAsync(string to, string subject, string html)
    {
        var email = new MimeMessage();

        email.From.Add(MailboxAddress.Parse(_config["EmailSettings:Email"]));

        email.To.Add(MailboxAddress.Parse(to));

        email.Subject = subject;

        email.Body = new TextPart("html") { Text = html };

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
