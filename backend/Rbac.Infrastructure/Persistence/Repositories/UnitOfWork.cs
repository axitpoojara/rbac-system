using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore.Storage;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Domain.Entities;

namespace Rbac.Infrastructure.Persistence.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private IDbContextTransaction? _currentTransaction;
    private readonly ConcurrentDictionary<Type, object> _repositories = new();

    private IUserRepository? _users;
    private IRoleRepository? _roles;
    private IMenuRepository? _menus;
    private IPermissionRepository? _permissions;
    private IUploadedFileRepository? _uploadedFiles;
    private IEmailTemplateRepository? _emailTemplates;
    private IRefreshTokenRepository? _refreshTokens;
    private IAuditLogRepository? _auditLogs;

    private IRepository<UserRole>? _userRoles;
    private IRepository<RolePermission>? _rolePermissions;
    private IRepository<RoleMenu>? _roleMenus;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }

    public IUserRepository Users => _users ??= new UserRepository(_context);
    public IRoleRepository Roles => _roles ??= new RoleRepository(_context);
    public IMenuRepository Menus => _menus ??= new MenuRepository(_context);
    public IPermissionRepository Permissions => _permissions ??= new PermissionRepository(_context);
    public IUploadedFileRepository UploadedFiles => _uploadedFiles ??= new UploadedFileRepository(_context);
    public IEmailTemplateRepository EmailTemplates => _emailTemplates ??= new EmailTemplateRepository(_context);
    public IRefreshTokenRepository RefreshTokens => _refreshTokens ??= new RefreshTokenRepository(_context);
    public IAuditLogRepository AuditLogs => _auditLogs ??= new AuditLogRepository(_context);

    public IRepository<UserRole> UserRoles => _userRoles ??= new Repository<UserRole>(_context);
    public IRepository<RolePermission> RolePermissions => _rolePermissions ??= new Repository<RolePermission>(_context);
    public IRepository<RoleMenu> RoleMenus => _roleMenus ??= new Repository<RoleMenu>(_context);

    public IRepository<T> Repository<T>() where T : class
    {
        return (IRepository<T>)_repositories.GetOrAdd(typeof(T), _ => new Repository<T>(_context));
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        _currentTransaction ??= await _context.Database.BeginTransactionAsync(cancellationToken);
    }

    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.CommitAsync(cancellationToken);
            }
        }
        finally
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.DisposeAsync();
                _currentTransaction = null;
            }
        }
    }

    public async Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.RollbackAsync(cancellationToken);
            }
        }
        finally
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.DisposeAsync();
                _currentTransaction = null;
            }
        }
    }

    public void Dispose()
    {
        _currentTransaction?.Dispose();
        _context.Dispose();
    }
}
