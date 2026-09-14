using Rbac.Domain.Entities;

namespace Rbac.Application.Common.Interfaces.Repositories;

public interface IRoleRepository : IRepository<Role>
{
    Task<Role?> GetByNameAsync(string name, CancellationToken cancellationToken = default);
    Task<Role?> GetByIdWithPermissionsAndMenusAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> IsRoleNameUniqueAsync(string name, Guid? excludeRoleId = null, CancellationToken cancellationToken = default);
    Task<int> GetRoleUserCountAsync(Guid roleId, CancellationToken cancellationToken = default);
}
