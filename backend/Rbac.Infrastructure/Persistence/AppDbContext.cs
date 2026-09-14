using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Domain.Common;
using Rbac.Domain.Entities;

namespace Rbac.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Menu> Menus => Set<Menu>();
    public DbSet<RoleMenu> RoleMenus => Set<RoleMenu>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<UploadedFile> UploadedFiles => Set<UploadedFile>();
    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplySoftDelete();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplySoftDelete()
    {
        foreach (var entry in ChangeTracker.Entries<ISoftDelete>())
        {
            if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                entry.Entity.IsDeleted = true;
                entry.Entity.DeletedAtUtc = DateTime.UtcNow;
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Global Query Filters for Soft Delete
        modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
        modelBuilder.Entity<Role>().HasQueryFilter(r => !r.IsDeleted);
        modelBuilder.Entity<Menu>().HasQueryFilter(m => !m.IsDeleted);
        modelBuilder.Entity<UploadedFile>().HasQueryFilter(f => !f.IsDeleted);
        modelBuilder.Entity<Permission>().HasQueryFilter(p => !p.IsDeleted);
        modelBuilder.Entity<EmailTemplate>().HasQueryFilter(e => !e.IsDeleted);

        // Dependent Entity Query Filters (Matching Principal Filters)
        modelBuilder.Entity<RefreshToken>().HasQueryFilter(rt => !rt.User.IsDeleted);
        modelBuilder.Entity<UserRole>().HasQueryFilter(ur => !ur.User.IsDeleted && !ur.Role.IsDeleted);
        modelBuilder.Entity<RoleMenu>().HasQueryFilter(rm => !rm.Role.IsDeleted && !rm.Menu.IsDeleted);
        modelBuilder.Entity<RolePermission>().HasQueryFilter(rp => !rp.Role.IsDeleted && !rp.Permission.IsDeleted);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.UserName).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.UserName).HasMaxLength(50).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(100).IsRequired();
            entity.Property(u => u.FirstName).HasMaxLength(50);
            entity.Property(u => u.LastName).HasMaxLength(50);
        });

        // Role
        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => r.Name).IsUnique();
            entity.Property(r => r.Name).HasMaxLength(50).IsRequired();
            entity.Property(r => r.Description).HasMaxLength(200);
        });

        // UserRole (Composite PK)
        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(ur => new { ur.UserId, ur.RoleId });

            entity.HasOne(ur => ur.User)
                  .WithMany(u => u.UserRoles)
                  .HasForeignKey(ur => ur.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ur => ur.Role)
                  .WithMany(r => r.UserRoles)
                  .HasForeignKey(ur => ur.RoleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Permission
        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.Code).IsUnique();
            entity.Property(p => p.Code).HasMaxLength(50).IsRequired();
            entity.Property(p => p.Name).HasMaxLength(100).IsRequired();
            entity.Property(p => p.Module).HasMaxLength(50).IsRequired();
        });

        // RolePermission (Composite PK)
        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(rp => new { rp.RoleId, rp.PermissionId });

            entity.HasOne(rp => rp.Role)
                  .WithMany(r => r.RolePermissions)
                  .HasForeignKey(rp => rp.RoleId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(rp => rp.Permission)
                  .WithMany(p => p.RolePermissions)
                  .HasForeignKey(rp => rp.PermissionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Menu
        modelBuilder.Entity<Menu>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Title).HasMaxLength(50).IsRequired();
            entity.Property(m => m.Route).HasMaxLength(100).IsRequired();
            entity.Property(m => m.Icon).HasMaxLength(50);
            entity.Property(m => m.RequiredPermission).HasMaxLength(50);

            entity.HasOne(m => m.Parent)
                  .WithMany(m => m.SubMenus)
                  .HasForeignKey(m => m.ParentId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // RoleMenu (Composite PK)
        modelBuilder.Entity<RoleMenu>(entity =>
        {
            entity.HasKey(rm => new { rm.RoleId, rm.MenuId });

            entity.HasOne(rm => rm.Role)
                  .WithMany(r => r.RoleMenus)
                  .HasForeignKey(rm => rm.RoleId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(rm => rm.Menu)
                  .WithMany(m => m.RoleMenus)
                  .HasForeignKey(rm => rm.MenuId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // RefreshToken
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(rt => rt.Id);
            entity.HasIndex(rt => rt.Token).IsUnique();
            entity.Property(rt => rt.Token).HasMaxLength(256).IsRequired();

            entity.HasOne(rt => rt.User)
                  .WithMany(u => u.RefreshTokens)
                  .HasForeignKey(rt => rt.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // AuditLog
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Action).HasMaxLength(50).IsRequired();
            entity.Property(a => a.EntityName).HasMaxLength(50).IsRequired();
        });

        // UploadedFile
        modelBuilder.Entity<UploadedFile>(entity =>
        {
            entity.HasKey(f => f.Id);
            entity.Property(f => f.OriginalFileName).HasMaxLength(255).IsRequired();
            entity.Property(f => f.StoredFileName).HasMaxLength(255).IsRequired();
            entity.Property(f => f.ContentType).HasMaxLength(100).IsRequired();
            entity.Property(f => f.UploadedByUserName).HasMaxLength(50).IsRequired();
        });

        // EmailTemplate
        modelBuilder.Entity<EmailTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TemplateKey).IsUnique();
            entity.Property(e => e.TemplateKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(150).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(300);
            entity.Property(e => e.Subject).HasMaxLength(250).IsRequired();
            entity.Property(e => e.BodyHtml).IsRequired();
            entity.Property(e => e.AvailableVariables).HasMaxLength(500);
        });
    }
}
