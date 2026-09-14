namespace Rbac.Application.Common.Interfaces;

public interface IEmailService
{
    Task<bool> SendTemporaryPasswordEmailAsync(string toEmail, string userName, string temporaryPassword, CancellationToken cancellationToken = default);
    Task<bool> SendTemplatedEmailAsync(string toEmail, string templateKey, IDictionary<string, string> placeholders, CancellationToken cancellationToken = default);
    Task<bool> SendRawEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default);
}
