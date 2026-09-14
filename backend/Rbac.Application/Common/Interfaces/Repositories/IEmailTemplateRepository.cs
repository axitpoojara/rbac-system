using Rbac.Domain.Entities;

namespace Rbac.Application.Common.Interfaces.Repositories;

public interface IEmailTemplateRepository : IRepository<EmailTemplate>
{
    Task<EmailTemplate?> GetByTemplateKeyAsync(string templateKey, CancellationToken cancellationToken = default);
}
