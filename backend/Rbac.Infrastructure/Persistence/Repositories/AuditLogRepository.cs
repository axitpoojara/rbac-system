using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Domain.Entities;

namespace Rbac.Infrastructure.Persistence.Repositories;

public class AuditLogRepository : Repository<AuditLog>, IAuditLogRepository
{
    public AuditLogRepository(AppDbContext context) : base(context)
    {
    }

    public async Task LogAsync(
        string userName, 
        string action, 
        string entityName, 
        string? entityId = null, 
        string? details = null, 
        CancellationToken cancellationToken = default)
    {
        var log = new AuditLog
        {
            Id = Guid.NewGuid(),
            UserName = userName,
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            Details = details,
            TimestampUtc = DateTime.UtcNow
        };

        await _dbSet.AddAsync(log, cancellationToken);
    }
}
