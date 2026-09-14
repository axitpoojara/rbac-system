using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Domain.Entities;

namespace Rbac.Infrastructure.Persistence.Repositories;

public class RoleRepository : Repository<Role>, IRoleRepository
{
    public RoleRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Role?> GetByNameAsync(string name, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .Include(r => r.RoleMenus)
                .ThenInclude(rm => rm.Menu)
            .FirstOrDefaultAsync(r => r.Name.ToLower() == name.ToLower(), cancellationToken);
    }

    public async Task<Role?> GetByIdWithPermissionsAndMenusAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .Include(r => r.RoleMenus)
                .ThenInclude(rm => rm.Menu)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<bool> IsRoleNameUniqueAsync(string name, Guid? excludeRoleId = null, CancellationToken cancellationToken = default)
    {
        return !await _dbSet.AnyAsync(r => r.Name.ToLower() == name.ToLower() && (!excludeRoleId.HasValue || r.Id != excludeRoleId.Value), cancellationToken);
    }

    public async Task<int> GetRoleUserCountAsync(Guid roleId, CancellationToken cancellationToken = default)
    {
        return await _context.UserRoles.CountAsync(ur => ur.RoleId == roleId, cancellationToken);
    }
}
