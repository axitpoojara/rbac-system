using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Domain.Entities;

namespace Rbac.Infrastructure.Persistence.Repositories;

public class MenuRepository : Repository<Menu>, IMenuRepository
{
    public MenuRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Menu>> GetSubMenusAsync(Guid parentId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(m => m.ParentId == parentId)
            .OrderBy(m => m.DisplayOrder)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Menu>> GetHierarchyAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(m => m.SubMenus.OrderBy(sm => sm.DisplayOrder))
            .Where(m => m.ParentId == null)
            .OrderBy(m => m.DisplayOrder)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Menu>> GetMenusForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var roleIds = await _context.UserRoles
            .Where(ur => ur.UserId == userId)
            .Select(ur => ur.RoleId)
            .ToListAsync(cancellationToken);

        var menuIds = await _context.RoleMenus
            .Where(rm => roleIds.Contains(rm.RoleId))
            .Select(rm => rm.MenuId)
            .Distinct()
            .ToListAsync(cancellationToken);

        return await _dbSet
            .Include(m => m.SubMenus.OrderBy(sm => sm.DisplayOrder))
            .Where(m => menuIds.Contains(m.Id) && m.IsActive)
            .OrderBy(m => m.DisplayOrder)
            .ToListAsync(cancellationToken);
    }
}
