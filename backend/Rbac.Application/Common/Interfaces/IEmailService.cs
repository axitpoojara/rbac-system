namespace Rbac.Application.Common.Interfaces;

public interface IEmailService
{
    Task<bool> SendTemporaryPasswordEmailAsync(string toEmail, string userName, string temporaryPassword, CancellationToken cancellationToken = default);
}
