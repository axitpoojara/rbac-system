using Microsoft.EntityFrameworkCore;
using Rbac.Domain.Entities;

namespace Rbac.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<Role> Roles { get; }
    DbSet<UserRole> UserRoles { get; }
    DbSet<Permission> Permissions { get; }
    DbSet<RolePermission> RolePermissions { get; }
    DbSet<Menu> Menus { get; }
    DbSet<RoleMenu> RoleMenus { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<UploadedFile> UploadedFiles { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
