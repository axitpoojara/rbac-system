using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Roles;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Roles;

public record CreateRoleCommand(CreateRoleDto Request) : IRequest<ApiResponse<RoleDetailDto>>;

public class CreateRoleCommandHandler : IRequestHandler<CreateRoleCommand, ApiResponse<RoleDetailDto>>
{
    private readonly IAppDbContext _context;

    public CreateRoleCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<RoleDetailDto>> Handle(CreateRoleCommand command, CancellationToken cancellationToken)
    {
        var request = command.Request;
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ApiResponse<RoleDetailDto>.Fail("Role name is required.");
        }

        var exists = await _context.Roles.AnyAsync(r => r.Name.ToLower() == request.Name.Trim().ToLower(), cancellationToken);
        if (exists)
        {
            return ApiResponse<RoleDetailDto>.Fail("A role with this name already exists.");
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
                .ToListAsync(cancellationToken);

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
                .ToListAsync(cancellationToken);

            foreach (var menuId in validMenuIds)
            {
                role.RoleMenus.Add(new RoleMenu { RoleId = role.Id, MenuId = menuId });
            }
        }

        _context.Roles.Add(role);
        await _context.SaveChangesAsync(cancellationToken);

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

        return ApiResponse<RoleDetailDto>.Ok(result, "Role created successfully");
    }
}
