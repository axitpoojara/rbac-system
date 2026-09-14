using Rbac.Domain.Entities;

namespace Rbac.Application.Common.Interfaces.Repositories;

public interface IPermissionRepository : IRepository<Permission>
{
    Task<Permission?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Permission>> GetUserPermissionsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> UserHasPermissionAsync(Guid userId, string permissionCode, CancellationToken cancellationToken = default);
}
