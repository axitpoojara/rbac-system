using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Rbac.Application.Common.Interfaces;
using Rbac.Infrastructure.Persistence;
using Rbac.Infrastructure.Security;

namespace Rbac.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? "Server=localhost;Port=3306;Database=rbac_db;User=root;Password=root;";

        services.AddDbContext<AppDbContext>(options =>
            options.UseMySql(
                connectionString,
                new MySqlServerVersion(new Version(8, 0, 36)),
                mySqlOptions => mySqlOptions.EnableRetryOnFailure()
            ));

        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

        // Repositories & Unit of Work
        services.AddScoped<Rbac.Application.Common.Interfaces.Repositories.IUnitOfWork, Rbac.Infrastructure.Persistence.Repositories.UnitOfWork>();
        services.AddScoped(typeof(Rbac.Application.Common.Interfaces.Repositories.IRepository<>), typeof(Rbac.Infrastructure.Persistence.Repositories.Repository<>));
        services.AddScoped<Rbac.Application.Common.Interfaces.Repositories.IUserRepository, Rbac.Infrastructure.Persistence.Repositories.UserRepository>();
        services.AddScoped<Rbac.Application.Common.Interfaces.Repositories.IRoleRepository, Rbac.Infrastructure.Persistence.Repositories.RoleRepository>();
        services.AddScoped<Rbac.Application.Common.Interfaces.Repositories.IMenuRepository, Rbac.Infrastructure.Persistence.Repositories.MenuRepository>();
        services.AddScoped<Rbac.Application.Common.Interfaces.Repositories.IPermissionRepository, Rbac.Infrastructure.Persistence.Repositories.PermissionRepository>();
        services.AddScoped<Rbac.Application.Common.Interfaces.Repositories.IUploadedFileRepository, Rbac.Infrastructure.Persistence.Repositories.UploadedFileRepository>();
        services.AddScoped<Rbac.Application.Common.Interfaces.Repositories.IEmailTemplateRepository, Rbac.Infrastructure.Persistence.Repositories.EmailTemplateRepository>();
        services.AddScoped<Rbac.Application.Common.Interfaces.Repositories.IRefreshTokenRepository, Rbac.Infrastructure.Persistence.Repositories.RefreshTokenRepository>();
        services.AddScoped<Rbac.Application.Common.Interfaces.Repositories.IAuditLogRepository, Rbac.Infrastructure.Persistence.Repositories.AuditLogRepository>();

        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IEmailService, Rbac.Infrastructure.Services.EmailService>();

        return services;
    }
}
