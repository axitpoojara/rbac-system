using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Domain.Entities;

namespace Rbac.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext context, IPasswordHasher passwordHasher)
    {
        await context.Database.EnsureCreatedAsync();

        // Ensure UploadedFiles table exists
        await context.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS `UploadedFiles` (
    `Id` char(36) COLLATE ascii_general_ci NOT NULL,
    `OriginalFileName` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `StoredFileName` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `ContentType` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `FileSize` bigint NOT NULL,
    `UploadedByUserId` char(36) COLLATE ascii_general_ci NOT NULL,
    `UploadedByUserName` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    `DeletedAtUtc` datetime(6) NULL,
    `DeletedBy` varchar(50) NULL,
    CONSTRAINT `PK_UploadedFiles` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `EmailTemplates` (
    `Id` char(36) COLLATE ascii_general_ci NOT NULL,
    `TemplateKey` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Name` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(300) CHARACTER SET utf8mb4 NULL,
    `Subject` varchar(250) CHARACTER SET utf8mb4 NOT NULL,
    `BodyHtml` longtext CHARACTER SET utf8mb4 NOT NULL,
    `AvailableVariables` varchar(500) CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT 1,
    `IsSystemTemplate` tinyint(1) NOT NULL DEFAULT 0,
    `CreatedAtUtc` datetime(6) NOT NULL,
    `CreatedBy` varchar(50) NULL,
    `UpdatedAtUtc` datetime(6) NULL,
    `UpdatedBy` varchar(50) NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    `DeletedAtUtc` datetime(6) NULL,
    `DeletedBy` varchar(50) NULL,
    CONSTRAINT `PK_EmailTemplates` PRIMARY KEY (`Id`),
    UNIQUE KEY `IX_EmailTemplates_TemplateKey` (`TemplateKey`)
) CHARACTER SET=utf8mb4;
");

        // Soft delete schema migration for existing MySQL tables
        await EnsureSoftDeleteColumnsAsync(context);

        // 1. Seed Permissions
        var permissions = new List<Permission>
        {
            // Dashboard
            new() { Id = Guid.NewGuid(), Code = "Dashboard.View", Name = "View Dashboard", Module = "Dashboard", Description = "Can view the main dashboard and metrics" },

            // Users
            new() { Id = Guid.NewGuid(), Code = "Users.View", Name = "View Users", Module = "Users", Description = "Can view the list and details of users" },
            new() { Id = Guid.NewGuid(), Code = "Users.Create", Name = "Create Users", Module = "Users", Description = "Can add new users to the system" },
            new() { Id = Guid.NewGuid(), Code = "Users.Edit", Name = "Edit Users", Module = "Users", Description = "Can modify user details, status, and role assignments" },
            new() { Id = Guid.NewGuid(), Code = "Users.Delete", Name = "Delete Users", Module = "Users", Description = "Can remove non-system users" },

            // Roles
            new() { Id = Guid.NewGuid(), Code = "Roles.View", Name = "View Roles", Module = "Roles", Description = "Can view roles, their permissions, and menus" },
            new() { Id = Guid.NewGuid(), Code = "Roles.Manage", Name = "Manage Roles", Module = "Roles", Description = "Can create, update, delete roles, and assign permissions/menus" },

            // Permissions
            new() { Id = Guid.NewGuid(), Code = "Permissions.View", Name = "View Permissions", Module = "Permissions", Description = "Can view the system permission registry" },
            new() { Id = Guid.NewGuid(), Code = "Permissions.Manage", Name = "Manage Permissions", Module = "Permissions", Description = "Can register custom system permissions" },

            // Menus
            new() { Id = Guid.NewGuid(), Code = "Menus.View", Name = "View Menus", Module = "Menus", Description = "Can view system navigation menu configurations" },
            new() { Id = Guid.NewGuid(), Code = "Menus.Manage", Name = "Manage Menus", Module = "Menus", Description = "Can create, update, reorder, and delete system menus" },

            // Files
            new() { Id = Guid.NewGuid(), Code = "Files.View", Name = "View Files", Module = "Files", Description = "Can view the list and details of uploaded files" },
            new() { Id = Guid.NewGuid(), Code = "Files.Upload", Name = "Upload Files", Module = "Files", Description = "Can upload new files to the system" },
            new() { Id = Guid.NewGuid(), Code = "Files.Download", Name = "Download Files", Module = "Files", Description = "Can download files from the system" },
            new() { Id = Guid.NewGuid(), Code = "Files.Delete", Name = "Delete Files", Module = "Files", Description = "Can delete uploaded files" },

            // Email Templates
            new() { Id = Guid.NewGuid(), Code = "EmailTemplates.View", Name = "View Email Templates", Module = "EmailTemplates", Description = "Can view system email templates" },
            new() { Id = Guid.NewGuid(), Code = "EmailTemplates.Create", Name = "Create Email Templates", Module = "EmailTemplates", Description = "Can create new email templates" },
            new() { Id = Guid.NewGuid(), Code = "EmailTemplates.Update", Name = "Update Email Templates", Module = "EmailTemplates", Description = "Can modify email templates content and settings" },
            new() { Id = Guid.NewGuid(), Code = "EmailTemplates.Delete", Name = "Delete Email Templates", Module = "EmailTemplates", Description = "Can remove email templates" },
        };

        foreach (var perm in permissions)
        {
            if (!await context.Permissions.AnyAsync(p => p.Code == perm.Code))
            {
                context.Permissions.Add(perm);
            }
        }
        await context.SaveChangesAsync();

        var allDbPermissions = await context.Permissions.ToListAsync();

        // 2. Seed Roles
        var superAdminRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "SuperAdmin");
        if (superAdminRole == null)
        {
            superAdminRole = new Role
            {
                Id = Guid.NewGuid(),
                Name = "SuperAdmin",
                Description = "Full administrative access to all system functions, roles, menus, and users.",
                IsSystemRole = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            context.Roles.Add(superAdminRole);
            await context.SaveChangesAsync();
        }

        var managerRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Manager");
        if (managerRole == null)
        {
            managerRole = new Role
            {
                Id = Guid.NewGuid(),
                Name = "Manager",
                Description = "Operations manager with user management capabilities and role review rights.",
                IsSystemRole = false,
                CreatedAtUtc = DateTime.UtcNow
            };
            context.Roles.Add(managerRole);
            await context.SaveChangesAsync();
        }

        var employeeRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Employee");
        if (employeeRole == null)
        {
            employeeRole = new Role
            {
                Id = Guid.NewGuid(),
                Name = "Employee",
                Description = "Standard staff member with basic dashboard access.",
                IsSystemRole = false,
                CreatedAtUtc = DateTime.UtcNow
            };
            context.Roles.Add(employeeRole);
            await context.SaveChangesAsync();
        }

        // 3. Assign Permissions to Roles
        // SuperAdmin gets all permissions
        var existingSuperAdminPermIds = await context.RolePermissions
            .Where(rp => rp.RoleId == superAdminRole.Id)
            .Select(rp => rp.PermissionId)
            .ToListAsync();

        foreach (var perm in allDbPermissions)
        {
            if (!existingSuperAdminPermIds.Contains(perm.Id))
            {
                context.RolePermissions.Add(new RolePermission { RoleId = superAdminRole.Id, PermissionId = perm.Id });
            }
        }

        // Manager gets Users.*, Roles.View, Dashboard.View, Files.*
        var managerPermCodes = new[] { "Dashboard.View", "Users.View", "Users.Create", "Users.Edit", "Roles.View", "Files.View", "Files.Upload", "Files.Download", "Files.Delete" };
        var managerPerms = allDbPermissions.Where(p => managerPermCodes.Contains(p.Code)).ToList();
        var existingManagerPermIds = await context.RolePermissions
            .Where(rp => rp.RoleId == managerRole.Id)
            .Select(rp => rp.PermissionId)
            .ToListAsync();

        foreach (var perm in managerPerms)
        {
            if (!existingManagerPermIds.Contains(perm.Id))
            {
                context.RolePermissions.Add(new RolePermission { RoleId = managerRole.Id, PermissionId = perm.Id });
            }
        }

        // Employee gets Dashboard.View, Files.View, Files.Download
        var employeePermCodes = new[] { "Dashboard.View", "Files.View", "Files.Download" };
        var employeePerms = allDbPermissions.Where(p => employeePermCodes.Contains(p.Code)).ToList();
        var existingEmployeePermIds = await context.RolePermissions
            .Where(rp => rp.RoleId == employeeRole.Id)
            .Select(rp => rp.PermissionId)
            .ToListAsync();

        foreach (var perm in employeePerms)
        {
            if (!existingEmployeePermIds.Contains(perm.Id))
            {
                context.RolePermissions.Add(new RolePermission { RoleId = employeeRole.Id, PermissionId = perm.Id });
            }
        }
        await context.SaveChangesAsync();

        // 4. Seed Menus
        var dashboardMenu = await context.Menus.FirstOrDefaultAsync(m => m.Route == "/dashboard");
        if (dashboardMenu == null)
        {
            dashboardMenu = new Menu
            {
                Id = Guid.NewGuid(),
                Title = "Dashboard",
                Route = "/dashboard",
                Icon = "dashboard",
                ParentId = null,
                DisplayOrder = 1,
                RequiredPermission = null,
                IsActive = true
            };
            context.Menus.Add(dashboardMenu);
            await context.SaveChangesAsync();
        }

        var userMgmtParent = await context.Menus.FirstOrDefaultAsync(m => m.Title == "User Management" && m.ParentId == null);
        if (userMgmtParent == null)
        {
            userMgmtParent = new Menu
            {
                Id = Guid.NewGuid(),
                Title = "User Management",
                Route = "/users",
                Icon = "users",
                ParentId = null,
                DisplayOrder = 2,
                RequiredPermission = "Users.View",
                IsActive = true
            };
            context.Menus.Add(userMgmtParent);
            await context.SaveChangesAsync();
        }

        var usersSubMenu = await context.Menus.FirstOrDefaultAsync(m => m.Title == "Users" && m.ParentId == userMgmtParent.Id);
        if (usersSubMenu == null)
        {
            usersSubMenu = new Menu
            {
                Id = Guid.NewGuid(),
                Title = "Users",
                Route = "/users",
                Icon = "user",
                ParentId = userMgmtParent.Id,
                DisplayOrder = 1,
                RequiredPermission = "Users.View",
                IsActive = true
            };
            context.Menus.Add(usersSubMenu);
            await context.SaveChangesAsync();
        }

        var rolesSubMenu = await context.Menus.FirstOrDefaultAsync(m => m.Title == "Roles & Permissions" && m.ParentId == userMgmtParent.Id);
        if (rolesSubMenu == null)
        {
            rolesSubMenu = new Menu
            {
                Id = Guid.NewGuid(),
                Title = "Roles & Permissions",
                Route = "/roles",
                Icon = "shield",
                ParentId = userMgmtParent.Id,
                DisplayOrder = 2,
                RequiredPermission = "Roles.View",
                IsActive = true
            };
            context.Menus.Add(rolesSubMenu);
            await context.SaveChangesAsync();
        }

        var systemParent = await context.Menus.FirstOrDefaultAsync(m => m.Title == "System Settings" && m.ParentId == null);
        if (systemParent == null)
        {
            systemParent = new Menu
            {
                Id = Guid.NewGuid(),
                Title = "System Settings",
                Route = "/system",
                Icon = "settings",
                ParentId = null,
                DisplayOrder = 3,
                RequiredPermission = "Menus.View",
                IsActive = true
            };
            context.Menus.Add(systemParent);
            await context.SaveChangesAsync();
        }

        var menusSubMenu = await context.Menus.FirstOrDefaultAsync(m => m.Title == "Navigation Menus" && m.ParentId == systemParent.Id);
        if (menusSubMenu == null)
        {
            menusSubMenu = new Menu
            {
                Id = Guid.NewGuid(),
                Title = "Navigation Menus",
                Route = "/system/menus",
                Icon = "menu",
                ParentId = systemParent.Id,
                DisplayOrder = 1,
                RequiredPermission = "Menus.View",
                IsActive = true
            };
            context.Menus.Add(menusSubMenu);
            await context.SaveChangesAsync();
        }

        var permsSubMenu = await context.Menus.FirstOrDefaultAsync(m => m.Title == "Permissions Registry" && m.ParentId == systemParent.Id);
        if (permsSubMenu == null)
        {
            permsSubMenu = new Menu
            {
                Id = Guid.NewGuid(),
                Title = "Permissions Registry",
                Route = "/system/permissions",
                Icon = "key",
                ParentId = systemParent.Id,
                DisplayOrder = 2,
                RequiredPermission = "Permissions.View",
                IsActive = true
            };
            context.Menus.Add(permsSubMenu);
            await context.SaveChangesAsync();
        }

        var emailTemplatesSubMenu = await context.Menus.FirstOrDefaultAsync(m => m.Title == "Email Templates" && m.ParentId == systemParent.Id);
        if (emailTemplatesSubMenu == null)
        {
            emailTemplatesSubMenu = new Menu
            {
                Id = Guid.NewGuid(),
                Title = "Email Templates",
                Route = "/system/email-templates",
                Icon = "mail",
                ParentId = systemParent.Id,
                DisplayOrder = 3,
                RequiredPermission = "EmailTemplates.View",
                IsActive = true
            };
            context.Menus.Add(emailTemplatesSubMenu);
            await context.SaveChangesAsync();
        }

        var filesMenu = await context.Menus.FirstOrDefaultAsync(m => m.Route == "/files");
        if (filesMenu == null)
        {
            filesMenu = new Menu
            {
                Id = Guid.NewGuid(),
                Title = "File Management",
                Route = "/files",
                Icon = "files",
                ParentId = null,
                DisplayOrder = 3,
                RequiredPermission = "Files.View",
                IsActive = true
            };
            context.Menus.Add(filesMenu);
            await context.SaveChangesAsync();
        }

        // 5. Assign Menus to Roles
        var allMenus = await context.Menus.ToListAsync();

        // SuperAdmin gets all menus
        var existingSuperAdminMenuIds = await context.RoleMenus
            .Where(rm => rm.RoleId == superAdminRole.Id)
            .Select(rm => rm.MenuId)
            .ToListAsync();

        foreach (var m in allMenus)
        {
            if (!existingSuperAdminMenuIds.Contains(m.Id))
            {
                context.RoleMenus.Add(new RoleMenu { RoleId = superAdminRole.Id, MenuId = m.Id });
            }
        }

        // Manager gets Dashboard, User Management, Users, Roles & Permissions, Files
        var managerMenuRoutes = new[] { "/dashboard", "/users", "/roles", "/files" };
        var managerMenus = allMenus.Where(m => managerMenuRoutes.Contains(m.Route) || m.Id == userMgmtParent.Id).ToList();
        var existingManagerMenuIds = await context.RoleMenus
            .Where(rm => rm.RoleId == managerRole.Id)
            .Select(rm => rm.MenuId)
            .ToListAsync();

        foreach (var m in managerMenus)
        {
            if (!existingManagerMenuIds.Contains(m.Id))
            {
                context.RoleMenus.Add(new RoleMenu { RoleId = managerRole.Id, MenuId = m.Id });
            }
        }

        // Employee gets Dashboard and Files
        var employeeMenuRoutes = new[] { "/dashboard", "/files" };
        var employeeMenus = allMenus.Where(m => employeeMenuRoutes.Contains(m.Route)).ToList();
        var existingEmployeeMenuIds = await context.RoleMenus
            .Where(rm => rm.RoleId == employeeRole.Id)
            .Select(rm => rm.MenuId)
            .ToListAsync();

        foreach (var m in employeeMenus)
        {
            if (!existingEmployeeMenuIds.Contains(m.Id))
            {
                context.RoleMenus.Add(new RoleMenu { RoleId = employeeRole.Id, MenuId = m.Id });
            }
        }

        await context.SaveChangesAsync();

        // Update any existing legacy @rbac.com or other domains to @gmail.com
        var legacyUsers = await context.Users.Where(u => u.Email.Contains("@rbac.com")).ToListAsync();
        foreach (var u in legacyUsers)
        {
            u.Email = u.Email.Replace("@rbac.com", "@gmail.com");
        }
        await context.SaveChangesAsync();

        // 6. Seed Users
        // Admin
        if (!await context.Users.AnyAsync(u => u.UserName == "admin"))
        {
            var adminUser = new User
            {
                Id = Guid.NewGuid(),
                UserName = "admin",
                Email = "admin@gmail.com",
                FirstName = "Admin",
                LastName = "User",
                PasswordHash = passwordHasher.HashPassword("Admin@123"),
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                CreatedBy = "System"
            };
            adminUser.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = superAdminRole.Id });
            context.Users.Add(adminUser);
        }

        // Manager
        if (!await context.Users.AnyAsync(u => u.UserName == "manager"))
        {
            var managerUser = new User
            {
                Id = Guid.NewGuid(),
                UserName = "manager",
                Email = "manager@gmail.com",
                FirstName = "Manager",
                LastName = "User",
                PasswordHash = passwordHasher.HashPassword("Manager@123"),
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                CreatedBy = "System"
            };
            managerUser.UserRoles.Add(new UserRole { UserId = managerUser.Id, RoleId = managerRole.Id });
            context.Users.Add(managerUser);
        }

        // Employee
        if (!await context.Users.AnyAsync(u => u.UserName == "employee"))
        {
            var employeeUser = new User
            {
                Id = Guid.NewGuid(),
                UserName = "employee",
                Email = "employee@gmail.com",
                FirstName = "Employee",
                LastName = "User",
                PasswordHash = passwordHasher.HashPassword("Employee@123"),
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                CreatedBy = "System"
            };
            employeeUser.UserRoles.Add(new UserRole { UserId = employeeUser.Id, RoleId = employeeRole.Id });
            context.Users.Add(employeeUser);
        }

        // Deactivated user for testing inactive account rejection
        if (!await context.Users.AnyAsync(u => u.UserName == "disabled_user"))
        {
            var disabledUser = new User
            {
                Id = Guid.NewGuid(),
                UserName = "disabled_user",
                Email = "disabled@gmail.com",
                FirstName = "Disabled",
                LastName = "Account",
                PasswordHash = passwordHasher.HashPassword("User@123"),
                IsActive = false,
                CreatedAtUtc = DateTime.UtcNow,
                CreatedBy = "System"
            };
            disabledUser.UserRoles.Add(new UserRole { UserId = disabledUser.Id, RoleId = employeeRole.Id });
            context.Users.Add(disabledUser);
        }

        // Seed default Email Templates
        await SeedEmailTemplatesAsync(context);

        await context.SaveChangesAsync();
    }

    private static async Task EnsureSoftDeleteColumnsAsync(AppDbContext context)
    {
        var tables = new[] { "Users", "Roles", "Menus", "UploadedFiles", "Permissions", "EmailTemplates" };
        var columns = new[]
        {
            ("IsDeleted", "tinyint(1) NOT NULL DEFAULT 0"),
            ("DeletedAtUtc", "datetime(6) NULL"),
            ("DeletedBy", "varchar(50) NULL")
        };

        var connection = context.Database.GetDbConnection();
        var wasClosed = connection.State == System.Data.ConnectionState.Closed;
        if (wasClosed)
        {
            await connection.OpenAsync();
        }

        try
        {
            foreach (var table in tables)
            {
                foreach (var (colName, colDef) in columns)
                {
                    using var checkCmd = connection.CreateCommand();
                    checkCmd.CommandText = $"SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table}' AND COLUMN_NAME = '{colName}'";
                    var count = Convert.ToInt32(await checkCmd.ExecuteScalarAsync());
                    if (count == 0)
                    {
                        using var alterCmd = connection.CreateCommand();
                        alterCmd.CommandText = $"ALTER TABLE `{table}` ADD COLUMN `{colName}` {colDef};";
                        await alterCmd.ExecuteNonQueryAsync();
                    }
                }
            }

            // User-specific onboarding columns
            var userColumns = new[]
            {
                ("MustChangePassword", "tinyint(1) NOT NULL DEFAULT 0"),
                ("TemporaryPasswordExpiresAtUtc", "datetime(6) NULL")
            };

            foreach (var (colName, colDef) in userColumns)
            {
                using var checkCmd = connection.CreateCommand();
                checkCmd.CommandText = $"SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = '{colName}'";
                var count = Convert.ToInt32(await checkCmd.ExecuteScalarAsync());
                if (count == 0)
                {
                    using var alterCmd = connection.CreateCommand();
                    alterCmd.CommandText = $"ALTER TABLE `Users` ADD COLUMN `{colName}` {colDef};";
                    await alterCmd.ExecuteNonQueryAsync();
                }
            }
        }
        finally
        {
            if (wasClosed)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task SeedEmailTemplatesAsync(AppDbContext context)
    {
        // 1. Temporary Password Template
        if (!await context.EmailTemplates.IgnoreQueryFilters().AnyAsync(t => t.TemplateKey == "TemporaryPassword"))
        {
            context.EmailTemplates.Add(new EmailTemplate
            {
                Id = Guid.NewGuid(),
                TemplateKey = "TemporaryPassword",
                Name = "Temporary Login Password",
                Description = "Dispatched when a user requests access via temporary one-time password.",
                Subject = "Your Temporary Access Password - {{CompanyName}}",
                AvailableVariables = "{{UserName}}, {{Email}}, {{TempPassword}}, {{ExpirationMinutes}}, {{CompanyName}}, {{LoginUrl}}",
                IsActive = true,
                IsSystemTemplate = true,
                CreatedAtUtc = DateTime.UtcNow,
                CreatedBy = "System",
                BodyHtml = @"<div style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);"">
  <div style=""background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 32px 24px; text-align: center;"">
    <h1 style=""color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;"">{{CompanyName}}</h1>
    <p style=""color: #c7d2fe; margin: 8px 0 0; font-size: 14px;"">Secure Account Authentication</p>
  </div>
  
  <div style=""padding: 32px 28px;"">
    <h2 style=""color: #1e293b; font-size: 18px; font-weight: 600; margin-top: 0;"">Hello {{UserName}},</h2>
    <p style=""color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;"">
      A temporary password was requested for your account (<strong>{{Email}}</strong>). Please use the credentials below to log into your portal:
    </p>

    <div style=""background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;"">
      <span style=""font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; display: block; margin-bottom: 8px;"">Your Temporary Password</span>
      <span style=""font-family: 'Consolas', 'Courier New', monospace; font-size: 24px; font-weight: 700; color: #1e293b; letter-spacing: 2px; display: inline-block; background: #ffffff; padding: 8px 24px; border-radius: 6px; border: 1px solid #e2e8f0;"">{{TempPassword}}</span>
    </div>

    <div style=""background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 24px; border-radius: 4px;"">
      <p style=""margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;"">
        <strong>Security Notice:</strong> This password is valid for <strong>{{ExpirationMinutes}} minutes</strong>. For your security, you will be required to set a new permanent password immediately upon logging in.
      </p>
    </div>

    <div style=""text-align: center; margin: 30px 0 10px;"">
      <a href=""{{LoginUrl}}"" style=""display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);"">Login to Portal</a>
    </div>

    <p style=""color: #94a3b8; font-size: 13px; line-height: 1.5; margin-top: 28px;"">
      If you did not request this temporary password, please contact your system administrator immediately.
    </p>
  </div>

  <div style=""background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;"">
    &copy; {{CompanyName}} RBAC System. All rights reserved.
  </div>
</div>"
            });
        }

        // 2. Reset Password Template
        if (!await context.EmailTemplates.IgnoreQueryFilters().AnyAsync(t => t.TemplateKey == "ResetPassword"))
        {
            context.EmailTemplates.Add(new EmailTemplate
            {
                Id = Guid.NewGuid(),
                TemplateKey = "ResetPassword",
                Name = "Password Reset Request",
                Description = "Dispatched when a user requests to reset their password.",
                Subject = "Reset Your Password - {{CompanyName}}",
                AvailableVariables = "{{UserName}}, {{Email}}, {{ResetLink}}, {{ExpirationMinutes}}, {{CompanyName}}",
                IsActive = true,
                IsSystemTemplate = true,
                CreatedAtUtc = DateTime.UtcNow,
                CreatedBy = "System",
                BodyHtml = @"<div style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);"">
  <div style=""background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 24px; text-align: center;"">
    <h1 style=""color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;"">{{CompanyName}}</h1>
    <p style=""color: #bae6fd; margin: 8px 0 0; font-size: 14px;"">Password Reset Request</p>
  </div>
  
  <div style=""padding: 32px 28px;"">
    <h2 style=""color: #1e293b; font-size: 18px; font-weight: 600; margin-top: 0;"">Hello {{UserName}},</h2>
    <p style=""color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;"">
      We received a request to reset the password for your account (<strong>{{Email}}</strong>). Click the button below to establish a new password:
    </p>

    <div style=""text-align: center; margin: 30px 0;"">
      <a href=""{{ResetLink}}"" style=""display: inline-block; background: #0284c7; color: #ffffff; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);"">Reset My Password</a>
    </div>

    <div style=""background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 12px 16px; margin-bottom: 24px; border-radius: 4px;"">
      <p style=""margin: 0; color: #0369a1; font-size: 13px; line-height: 1.5;"">
        This link is valid for <strong>{{ExpirationMinutes}} minutes</strong>. If you did not make this request, you can safely ignore this email.
      </p>
    </div>

    <p style=""color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px;"">
      If the button above does not work, copy and paste this link into your browser:<br/>
      <a href=""{{ResetLink}}"" style=""color: #0284c7; word-break: break-all;"">{{ResetLink}}</a>
    </p>
  </div>

  <div style=""background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;"">
    &copy; {{CompanyName}} RBAC System. All rights reserved.
  </div>
</div>"
            });
        }

        // 3. Welcome User Template
        if (!await context.EmailTemplates.IgnoreQueryFilters().AnyAsync(t => t.TemplateKey == "WelcomeUser"))
        {
            context.EmailTemplates.Add(new EmailTemplate
            {
                Id = Guid.NewGuid(),
                TemplateKey = "WelcomeUser",
                Name = "Welcome New User",
                Description = "Dispatched when a new user account is onboarded.",
                Subject = "Welcome to {{CompanyName}}!",
                AvailableVariables = "{{UserName}}, {{Email}}, {{PortalUrl}}, {{CompanyName}}",
                IsActive = true,
                IsSystemTemplate = true,
                CreatedAtUtc = DateTime.UtcNow,
                CreatedBy = "System",
                BodyHtml = @"<div style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);"">
  <div style=""background: linear-gradient(135deg, #10b981 0%, #047857 100%); padding: 32px 24px; text-align: center;"">
    <h1 style=""color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;"">{{CompanyName}}</h1>
    <p style=""color: #a7f3d0; margin: 8px 0 0; font-size: 14px;"">Welcome to the Platform</p>
  </div>
  
  <div style=""padding: 32px 28px;"">
    <h2 style=""color: #1e293b; font-size: 18px; font-weight: 600; margin-top: 0;"">Welcome, {{UserName}}!</h2>
    <p style=""color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;"">
      Your account has been successfully configured on <strong>{{CompanyName}}</strong>. You now have secure access to your assigned portal modules and resources.
    </p>

    <div style=""background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;"">
      <p style=""margin: 4px 0; color: #475569; font-size: 14px;""><strong>Account Login:</strong> {{Email}}</p>
      <p style=""margin: 4px 0; color: #475569; font-size: 14px;""><strong>Access Status:</strong> Active</p>
    </div>

    <div style=""text-align: center; margin: 30px 0;"">
      <a href=""{{PortalUrl}}"" style=""display: inline-block; background: #10b981; color: #ffffff; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);"">Access Your Portal</a>
    </div>

    <p style=""color: #94a3b8; font-size: 13px; line-height: 1.5; margin-top: 24px;"">
      If you have any questions or require assistance, please contact your security administrator.
    </p>
  </div>

  <div style=""background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;"">
    &copy; {{CompanyName}} RBAC System. All rights reserved.
  </div>
</div>"
            });
        }

        await context.SaveChangesAsync();
    }
}
