using Rbac.Domain.Entities;

namespace Rbac.Application.Common.Interfaces.Repositories;

public interface IAuditLogRepository : IRepository<AuditLog>
{
    Task LogAsync(string userName, string action, string entityName, string? entityId = null, string? details = null, CancellationToken cancellationToken = default);
}
