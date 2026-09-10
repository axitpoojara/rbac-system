using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RbacApi.Data;
using RbacApi.DTOs.Common;
using RbacApi.DTOs.Menus;
using RbacApi.Entities;
using RbacApi.Security.Authorization;

namespace RbacApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MenusController : ControllerBase
{
    private readonly AppDbContext _context;

    public MenusController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("nav")]
    public async Task<ActionResult<ApiResponse<List<NavMenuItemDto>>>> GetNavMenu()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(ApiResponse<List<NavMenuItemDto>>.Fail("Invalid session"));
        }

        var isSuperAdmin = User.IsInRole("SuperAdmin");

        List<Menu> accessibleMenus;

        if (isSuperAdmin)
        {
            accessibleMenus = await _context.Menus
                .Where(m => m.IsActive)
                .OrderBy(m => m.DisplayOrder)
                .ToListAsync();
        }
        else
        {
            // Fetch user permissions
            var userPermissions = await _context.UserRoles
                .Where(ur => ur.UserId == userId && ur.User.IsActive)
                .SelectMany(ur => ur.Role.RolePermissions)
                .Select(rp => rp.Permission.Code)
                .Distinct()
                .ToListAsync();

            var permSet = new HashSet<string>(userPermissions, StringComparer.OrdinalIgnoreCase);

            // Fetch menus assigned to any of user's roles
            var roleMenus = await _context.UserRoles
                .Where(ur => ur.UserId == userId && ur.User.IsActive)
                .SelectMany(ur => ur.Role.RoleMenus)
                .Select(rm => rm.Menu)
                .Where(m => m.IsActive)
                .Distinct()
                .ToListAsync();

            // Filter menus that have RequiredPermission specified
            accessibleMenus = roleMenus
                .Where(m => string.IsNullOrEmpty(m.RequiredPermission) || permSet.Contains(m.RequiredPermission))
                .OrderBy(m => m.DisplayOrder)
                .ToList();

            // Also ensure parents of any accessible sub-menus are included so hierarchy doesn't break
            var parentIds = accessibleMenus.Where(m => m.ParentId.HasValue).Select(m => m.ParentId!.Value).Distinct().ToList();
            if (parentIds.Any())
            {
                var parents = await _context.Menus
                    .Where(m => parentIds.Contains(m.Id) && m.IsActive)
                    .ToListAsync();

                foreach (var parent in parents)
                {
                    if (!accessibleMenus.Any(m => m.Id == parent.Id))
                    {
                        accessibleMenus.Add(parent);
                    }
                }
            }
        }

        // Build navigation hierarchy
        var lookup = accessibleMenus.ToDictionary(m => m.Id, m => new NavMenuItemDto
        {
            Id = m.Id,
            Title = m.Title,
            Route = m.Route,
            Icon = m.Icon,
            DisplayOrder = m.DisplayOrder,
            Children = new List<NavMenuItemDto>()
        });

        var rootItems = new List<NavMenuItemDto>();

        foreach (var menu in accessibleMenus.OrderBy(m => m.DisplayOrder))
        {
            var navItem = lookup[menu.Id];
            if (menu.ParentId.HasValue && lookup.ContainsKey(menu.ParentId.Value))
            {
                lookup[menu.ParentId.Value].Children.Add(navItem);
            }
            else
            {
                rootItems.Add(navItem);
            }
        }

        return Ok(ApiResponse<List<NavMenuItemDto>>.Ok(rootItems));
    }

    [HttpGet]
    [HasPermission("Menus.View")]
    public async Task<ActionResult<ApiResponse<List<MenuDto>>>> GetAllMenus()
    {
        var menus = await _context.Menus
            .Include(m => m.Parent)
            .OrderBy(m => m.DisplayOrder)
            .Select(m => new MenuDto
            {
                Id = m.Id,
                Title = m.Title,
                Route = m.Route,
                Icon = m.Icon,
                ParentId = m.ParentId,
                ParentTitle = m.Parent != null ? m.Parent.Title : null,
                DisplayOrder = m.DisplayOrder,
                RequiredPermission = m.RequiredPermission,
                IsActive = m.IsActive
            })
            .ToListAsync();

        return Ok(ApiResponse<List<MenuDto>>.Ok(menus));
    }

    [HttpPost]
    [HasPermission("Menus.Manage")]
    public async Task<ActionResult<ApiResponse<MenuDto>>> CreateMenu([FromBody] CreateMenuDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Route))
        {
            return BadRequest(ApiResponse<MenuDto>.Fail("Title and Route are required."));
        }

        if (request.ParentId.HasValue)
        {
            var parentExists = await _context.Menus.AnyAsync(m => m.Id == request.ParentId.Value);
            if (!parentExists)
            {
                return BadRequest(ApiResponse<MenuDto>.Fail("Parent menu does not exist."));
            }
        }

        var menu = new Menu
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Route = request.Route.Trim(),
            Icon = request.Icon?.Trim() ?? string.Empty,
            ParentId = request.ParentId,
            DisplayOrder = request.DisplayOrder,
            RequiredPermission = string.IsNullOrWhiteSpace(request.RequiredPermission) ? null : request.RequiredPermission.Trim(),
            IsActive = request.IsActive
        };

        _context.Menus.Add(menu);
        await _context.SaveChangesAsync();

        var parentTitle = menu.ParentId.HasValue
            ? await _context.Menus.Where(m => m.Id == menu.ParentId.Value).Select(m => m.Title).FirstOrDefaultAsync()
            : null;

        var dto = new MenuDto
        {
            Id = menu.Id,
            Title = menu.Title,
            Route = menu.Route,
            Icon = menu.Icon,
            ParentId = menu.ParentId,
            ParentTitle = parentTitle,
            DisplayOrder = menu.DisplayOrder,
            RequiredPermission = menu.RequiredPermission,
            IsActive = menu.IsActive
        };

        return Ok(ApiResponse<MenuDto>.Ok(dto, "Menu item created successfully"));
    }

    [HttpPut("{id}")]
    [HasPermission("Menus.Manage")]
    public async Task<ActionResult<ApiResponse<MenuDto>>> UpdateMenu(Guid id, [FromBody] UpdateMenuDto request)
    {
        var menu = await _context.Menus.FindAsync(id);
        if (menu == null)
        {
            return NotFound(ApiResponse<MenuDto>.Fail("Menu not found"));
        }

        if (request.ParentId == id)
        {
            return BadRequest(ApiResponse<MenuDto>.Fail("A menu item cannot be its own parent."));
        }

        menu.Title = request.Title.Trim();
        menu.Route = request.Route.Trim();
        menu.Icon = request.Icon?.Trim() ?? string.Empty;
        menu.ParentId = request.ParentId;
        menu.DisplayOrder = request.DisplayOrder;
        menu.RequiredPermission = string.IsNullOrWhiteSpace(request.RequiredPermission) ? null : request.RequiredPermission.Trim();
        menu.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        var parentTitle = menu.ParentId.HasValue
            ? await _context.Menus.Where(m => m.Id == menu.ParentId.Value).Select(m => m.Title).FirstOrDefaultAsync()
            : null;

        var dto = new MenuDto
        {
            Id = menu.Id,
            Title = menu.Title,
            Route = menu.Route,
            Icon = menu.Icon,
            ParentId = menu.ParentId,
            ParentTitle = parentTitle,
            DisplayOrder = menu.DisplayOrder,
            RequiredPermission = menu.RequiredPermission,
            IsActive = menu.IsActive
        };

        return Ok(ApiResponse<MenuDto>.Ok(dto, "Menu item updated successfully"));
    }

    [HttpDelete("{id}")]
    [HasPermission("Menus.Manage")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteMenu(Guid id)
    {
        var menu = await _context.Menus
            .Include(m => m.SubMenus)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (menu == null)
        {
            return NotFound(ApiResponse<bool>.Fail("Menu not found"));
        }

        if (menu.SubMenus.Any())
        {
            return BadRequest(ApiResponse<bool>.Fail("Cannot delete menu that has child menus. Delete or reassign children first."));
        }

        _context.Menus.Remove(menu);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<bool>.Ok(true, "Menu item deleted successfully"));
    }
}
