using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Rbac.Application.Common.Interfaces;

namespace Rbac.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> SendTemporaryPasswordEmailAsync(
        string toEmail, 
        string userName, 
        string temporaryPassword, 
        CancellationToken cancellationToken = default)
    {
        var smtpHost = _configuration["EmailSettings:SmtpHost"];
        var smtpPortStr = _configuration["EmailSettings:SmtpPort"];
        var smtpUser = _configuration["EmailSettings:SmtpUser"];
        var smtpPass = _configuration["EmailSettings:SmtpPassword"];
        var senderEmail = _configuration["EmailSettings:SenderEmail"] ?? "axitpoojara1501@gmail.com";
        var senderName = _configuration["EmailSettings:SenderName"] ?? "Enterprise RBAC Security";

        var emailSubject = "Your Temporary Access Password - Enterprise RBAC";
        var plainTextBody = $@"
Hello {userName},

A temporary password was generated for your account ({toEmail}).

--------------------------------------------------
Temporary Password: {temporaryPassword}
--------------------------------------------------

Please log in using this temporary password. You will be required to set your permanent password upon initial login.
This temporary password expires in 30 minutes.

Sent from: {senderEmail}
If you did not request this, please contact your system administrator immediately.

Regards,
Enterprise RBAC Security Team";

        var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #1e293b; }}
        .card {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }}
        .header {{ text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }}
        .title {{ font-size: 20px; font-weight: 700; color: #1e1b4b; margin: 0; }}
        .badge {{ display: inline-block; background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px; }}
        .code-box {{ background: #f8fafc; border: 2px dashed #6366f1; border-radius: 8px; text-align: center; padding: 18px; margin: 24px 0; }}
        .code {{ font-size: 26px; font-weight: 800; letter-spacing: 2px; color: #4338ca; font-family: monospace; }}
        .info {{ color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 12px; }}
        .alert {{ background: #fffbeb; border: 1px solid #fef3c7; color: #b45309; border-radius: 8px; padding: 12px 16px; font-size: 13px; margin: 20px 0; }}
        .footer {{ text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #94a3b8; line-height: 1.5; }}
    </style>
</head>
<body>
    <div class='card'>
        <div class='header'>
            <h2 class='title'>Enterprise RBAC System</h2>
            <div class='badge'>Temporary Verification Password</div>
        </div>
        <p class='info'>Hello <strong>{userName}</strong>,</p>
        <p class='info'>A temporary access password has been issued for your account (<strong>{toEmail}</strong>).</p>
        <div class='code-box'>
            <div class='code'>{temporaryPassword}</div>
        </div>
        <div class='alert'>
            <strong>Notice:</strong> This temporary password expires in <strong>30 minutes</strong>. You will be prompted to set your permanent password upon sign-in.
        </div>
        <p class='info'>If you did not request this, please contact your security administrator.</p>
        <div class='footer'>
            Sent by Enterprise RBAC Platform from <strong>{senderEmail}</strong><br>
            Please do not share this password with anyone.
        </div>
    </div>
</body>
</html>";

        // Always log to server output for developer accessibility, audit, and local testing
        _logger.LogInformation(
            "\n======================================================\n" +
            "[EMAIL DISPATCH - TEMPORARY ONBOARDING PASSWORD]\n" +
            "From: {SenderEmail} ({SenderName})\n" +
            "To: {ToEmail} ({UserName})\n" +
            "Subject: {Subject}\n" +
            "Temporary Password: {TempPassword}\n" +
            "Expires: In 30 Minutes\n" +
            "======================================================",
            senderEmail, senderName, toEmail, userName, emailSubject, temporaryPassword);

        // Attempt actual SMTP dispatch if credentials configured
        if (!string.IsNullOrWhiteSpace(smtpHost) &&
            int.TryParse(smtpPortStr, out var smtpPort) &&
            !string.IsNullOrWhiteSpace(smtpUser) &&
            !string.IsNullOrWhiteSpace(smtpPass))
        {
            try
            {
                using var client = new SmtpClient(smtpHost, smtpPort)
                {
                    Credentials = new NetworkCredential(smtpUser, smtpPass),
                    EnableSsl = true
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(senderEmail, senderName),
                    Subject = emailSubject,
                    Body = htmlBody,
                    IsBodyHtml = true
                };
                mailMessage.To.Add(toEmail);

                await client.SendMailAsync(mailMessage, cancellationToken);
                _logger.LogInformation("SMTP email successfully delivered from {SenderEmail} to {ToEmail}.", senderEmail, toEmail);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gmail SMTP dispatch from {SenderEmail} to {ToEmail} encountered an error: {Message}. (Make sure a 16-character Google App Password is used in appsettings.json).", senderEmail, toEmail, ex.Message);
                return true;
            }
        }
        else
        {
            _logger.LogInformation("Real email sender configured as '{SenderEmail}'. To enable direct inbox delivery via Gmail SMTP, provide your Google App Password in backend/RbacApi/appsettings.json under 'EmailSettings:SmtpPassword'.", senderEmail);
        }

        return true;
    }
}
