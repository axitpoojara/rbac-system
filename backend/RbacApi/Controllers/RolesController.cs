using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RbacApi.Data;
using RbacApi.DTOs.Common;
using RbacApi.DTOs.Roles;
using RbacApi.Entities;
using RbacApi.Security.Authorization;

namespace RbacApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<RolesController> _logger;

    public RolesController(AppDbContext context, ILogger<RolesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [HasPermission("Roles.View")]
    public async Task<ActionResult<ApiResponse<List<RoleDto>>>> GetRoles()
    {
        var roles = await _context.Roles
            .Include(r => r.UserRoles)
            .Include(r => r.RolePermissions)
            .Include(r => r.RoleMenus)
            .OrderBy(r => r.Name)
            .Select(r => new RoleDto
            {
                Id = r.Id,
                Name = r.Name,
                Description = r.Description,
                IsSystemRole = r.IsSystemRole,
                CreatedAtUtc = r.CreatedAtUtc,
                UserCount = r.UserRoles.Count,
                PermissionCount = r.RolePermissions.Count,
                MenuCount = r.RoleMenus.Count
            })
            .ToListAsync();

        return Ok(ApiResponse<List<RoleDto>>.Ok(roles));
    }

    [HttpGet("{id}")]
    [HasPermission("Roles.View")]
    public async Task<ActionResult<ApiResponse<RoleDetailDto>>> GetRoleById(Guid id)
    {
        var role = await _context.Roles
            .Include(r => r.UserRoles)
            .Include(r => r.RolePermissions)
            .Include(r => r.RoleMenus)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role == null)
        {
            return NotFound(ApiResponse<RoleDetailDto>.Fail("Role not found"));
        }

        var dto = new RoleDetailDto
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            IsSystemRole = role.IsSystemRole,
            CreatedAtUtc = role.CreatedAtUtc,
            UserCount = role.UserRoles.Count,
            PermissionCount = role.RolePermissions.Count,
            MenuCount = role.RoleMenus.Count,
            PermissionIds = role.RolePermissions.Select(rp => rp.PermissionId).ToList(),
            MenuIds = role.RoleMenus.Select(rm => rm.MenuId).ToList()
        };

        return Ok(ApiResponse<RoleDetailDto>.Ok(dto));
    }

    [HttpPost]
    [HasPermission("Roles.Manage")]
    public async Task<ActionResult<ApiResponse<RoleDetailDto>>> CreateRole([FromBody] CreateRoleDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(ApiResponse<RoleDetailDto>.Fail("Role name is required."));
        }

        var exists = await _context.Roles.AnyAsync(r => r.Name.ToLower() == request.Name.Trim().ToLower());
        if (exists)
        {
            return BadRequest(ApiResponse<RoleDetailDto>.Fail("A role with this name already exists."));
        }

        var role = new Role
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            IsSystemRole = false,
            CreatedAtUtc = DateTime.UtcNow
        };

        if (request.PermissionIds != null && request.PermissionIds.Any())
        {
            var validPermIds = await _context.Permissions
                .Where(p => request.PermissionIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToListAsync();

            foreach (var permId in validPermIds)
            {
                role.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permId });
            }
        }

        if (request.MenuIds != null && request.MenuIds.Any())
        {
            var validMenuIds = await _context.Menus
                .Where(m => request.MenuIds.Contains(m.Id))
                .Select(m => m.Id)
                .ToListAsync();

            foreach (var menuId in validMenuIds)
            {
                role.RoleMenus.Add(new RoleMenu { RoleId = role.Id, MenuId = menuId });
            }
        }

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        var result = new RoleDetailDto
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            IsSystemRole = role.IsSystemRole,
            CreatedAtUtc = role.CreatedAtUtc,
            UserCount = 0,
            PermissionCount = role.RolePermissions.Count,
            MenuCount = role.RoleMenus.Count,
            PermissionIds = role.RolePermissions.Select(rp => rp.PermissionId).ToList(),
            MenuIds = role.RoleMenus.Select(rm => rm.MenuId).ToList()
        };

        return CreatedAtAction(nameof(GetRoleById), new { id = role.Id }, ApiResponse<RoleDetailDto>.Ok(result, "Role created successfully"));
    }

    [HttpPut("{id}")]
    [HasPermission("Roles.Manage")]
    public async Task<ActionResult<ApiResponse<RoleDetailDto>>> UpdateRole(Guid id, [FromBody] UpdateRoleDto request)
    {
        var role = await _context.Roles
            .Include(r => r.RolePermissions)
            .Include(r => r.RoleMenus)
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role == null)
        {
            return NotFound(ApiResponse<RoleDetailDto>.Fail("Role not found"));
        }

        if (role.Name.ToLower() != request.Name.Trim().ToLower())
        {
            if (role.IsSystemRole)
            {
                return BadRequest(ApiResponse<RoleDetailDto>.Fail("System role names cannot be renamed."));
            }

            var nameExists = await _context.Roles.AnyAsync(r => r.Id != id && r.Name.ToLower() == request.Name.Trim().ToLower());
            if (nameExists)
            {
                return BadRequest(ApiResponse<RoleDetailDto>.Fail("A role with this name already exists."));
            }
            role.Name = request.Name.Trim();
        }

        role.Description = request.Description.Trim();
        role.UpdatedAtUtc = DateTime.UtcNow;

        // Update permissions
        if (request.PermissionIds != null)
        {
            _context.RolePermissions.RemoveRange(role.RolePermissions);
            var validPermIds = await _context.Permissions
                .Where(p => request.PermissionIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToListAsync();

            foreach (var permId in validPermIds)
            {
                role.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permId });
            }
        }

        // Update menus
        if (request.MenuIds != null)
        {
            _context.RoleMenus.RemoveRange(role.RoleMenus);
            var validMenuIds = await _context.Menus
                .Where(m => request.MenuIds.Contains(m.Id))
                .Select(m => m.Id)
                .ToListAsync();

            foreach (var menuId in validMenuIds)
            {
                role.RoleMenus.Add(new RoleMenu { RoleId = role.Id, MenuId = menuId });
            }
        }

        await _context.SaveChangesAsync();

        var result = new RoleDetailDto
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            IsSystemRole = role.IsSystemRole,
            CreatedAtUtc = role.CreatedAtUtc,
            UserCount = role.UserRoles.Count,
            PermissionCount = role.RolePermissions.Count,
            MenuCount = role.RoleMenus.Count,
            PermissionIds = role.RolePermissions.Select(rp => rp.PermissionId).ToList(),
            MenuIds = role.RoleMenus.Select(rm => rm.MenuId).ToList()
        };

        return Ok(ApiResponse<RoleDetailDto>.Ok(result, "Role updated successfully"));
    }

    [HttpDelete("{id}")]
    [HasPermission("Roles.Manage")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteRole(Guid id)
    {
        var role = await _context.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role == null)
        {
            return NotFound(ApiResponse<bool>.Fail("Role not found"));
        }

        if (role.IsSystemRole)
        {
            return BadRequest(ApiResponse<bool>.Fail("System roles cannot be deleted."));
        }

        if (role.UserRoles.Any())
        {
            return BadRequest(ApiResponse<bool>.Fail("Cannot delete a role that is assigned to users. Unassign it first."));
        }

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<bool>.Ok(true, "Role deleted successfully"));
    }
}
