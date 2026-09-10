using Microsoft.EntityFrameworkCore;
using RbacApi.Entities;
using RbacApi.Security;

namespace RbacApi.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext context, IPasswordHasher passwordHasher)
    {
        await context.Database.EnsureCreatedAsync();

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

        // Manager gets Users.*, Roles.View, Dashboard.View
        var managerPermCodes = new[] { "Dashboard.View", "Users.View", "Users.Create", "Users.Edit", "Roles.View" };
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

        // Employee gets Dashboard.View
        var employeePerm = allDbPermissions.FirstOrDefault(p => p.Code == "Dashboard.View");
        if (employeePerm != null)
        {
            var hasEmployeePerm = await context.RolePermissions.AnyAsync(rp => rp.RoleId == employeeRole.Id && rp.PermissionId == employeePerm.Id);
            if (!hasEmployeePerm)
            {
                context.RolePermissions.Add(new RolePermission { RoleId = employeeRole.Id, PermissionId = employeePerm.Id });
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

        // Manager gets Dashboard, User Management, Users, Roles & Permissions
        var managerMenuRoutes = new[] { "/dashboard", "/users", "/roles" };
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

        // Employee gets Dashboard
        var existingEmployeeMenu = await context.RoleMenus
            .AnyAsync(rm => rm.RoleId == employeeRole.Id && rm.MenuId == dashboardMenu.Id);
        if (!existingEmployeeMenu)
        {
            context.RoleMenus.Add(new RoleMenu { RoleId = employeeRole.Id, MenuId = dashboardMenu.Id });
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

        await context.SaveChangesAsync();
    }
}
