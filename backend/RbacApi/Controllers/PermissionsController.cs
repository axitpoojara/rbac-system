using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RbacApi.Data;
using RbacApi.DTOs.Common;
using RbacApi.DTOs.Permissions;
using RbacApi.Entities;
using RbacApi.Security.Authorization;

namespace RbacApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PermissionsController : ControllerBase
{
    private readonly AppDbContext _context;

    public PermissionsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [HasPermission("Permissions.View")]
    public async Task<ActionResult<ApiResponse<List<PermissionDto>>>> GetAllPermissions()
    {
        var permissions = await _context.Permissions
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Code)
            .Select(p => new PermissionDto
            {
                Id = p.Id,
                Code = p.Code,
                Name = p.Name,
                Module = p.Module,
                Description = p.Description
            })
            .ToListAsync();

        return Ok(ApiResponse<List<PermissionDto>>.Ok(permissions));
    }

    [HttpGet("grouped")]
    [HasPermission("Permissions.View")]
    public async Task<ActionResult<ApiResponse<List<ModulePermissionsDto>>>> GetGroupedPermissions()
    {
        var permissions = await _context.Permissions
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Name)
            .ToListAsync();

        var grouped = permissions
            .GroupBy(p => p.Module)
            .Select(g => new ModulePermissionsDto
            {
                Module = g.Key,
                Permissions = g.Select(p => new PermissionDto
                {
                    Id = p.Id,
                    Code = p.Code,
                    Name = p.Name,
                    Module = p.Module,
                    Description = p.Description
                }).ToList()
            })
            .ToList();

        return Ok(ApiResponse<List<ModulePermissionsDto>>.Ok(grouped));
    }

    [HttpPost]
    [HasPermission("Permissions.Manage")]
    public async Task<ActionResult<ApiResponse<PermissionDto>>> CreatePermission([FromBody] CreatePermissionDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Module))
        {
            return BadRequest(ApiResponse<PermissionDto>.Fail("Code, Name, and Module are required."));
        }

        var exists = await _context.Permissions.AnyAsync(p => p.Code.ToLower() == request.Code.Trim().ToLower());
        if (exists)
        {
            return BadRequest(ApiResponse<PermissionDto>.Fail("A permission with this code already exists."));
        }

        var permission = new Permission
        {
            Id = Guid.NewGuid(),
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Module = request.Module.Trim(),
            Description = request.Description.Trim()
        };

        _context.Permissions.Add(permission);
        await _context.SaveChangesAsync();

        var dto = new PermissionDto
        {
            Id = permission.Id,
            Code = permission.Code,
            Name = permission.Name,
            Module = permission.Module,
            Description = permission.Description
        };

        return Ok(ApiResponse<PermissionDto>.Ok(dto, "Permission created successfully"));
    }
}
