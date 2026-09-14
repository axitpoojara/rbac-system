using Rbac.Domain.Entities;

namespace Rbac.Application.Common.Interfaces.Repositories;

public interface IMenuRepository : IRepository<Menu>
{
    Task<IReadOnlyList<Menu>> GetSubMenusAsync(Guid parentId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Menu>> GetHierarchyAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Menu>> GetMenusForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
