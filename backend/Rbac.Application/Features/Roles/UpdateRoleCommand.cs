using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Roles;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Roles;

public record UpdateRoleCommand(Guid Id, UpdateRoleDto Request) : IRequest<ApiResponse<RoleDetailDto>>;

public class UpdateRoleCommandHandler : IRequestHandler<UpdateRoleCommand, ApiResponse<RoleDetailDto>>
{
    private readonly IAppDbContext _context;

    public UpdateRoleCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<RoleDetailDto>> Handle(UpdateRoleCommand command, CancellationToken cancellationToken)
    {
        var id = command.Id;
        var request = command.Request;

        var role = await _context.Roles
            .Include(r => r.RolePermissions)
            .Include(r => r.RoleMenus)
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (role == null)
        {
            return ApiResponse<RoleDetailDto>.Fail("Role not found");
        }

        if (role.Name.ToLower() != request.Name.Trim().ToLower())
        {
            if (role.IsSystemRole)
            {
                return ApiResponse<RoleDetailDto>.Fail("System role names cannot be renamed.");
            }

            var nameExists = await _context.Roles.AnyAsync(r => r.Id != id && r.Name.ToLower() == request.Name.Trim().ToLower(), cancellationToken);
            if (nameExists)
            {
                return ApiResponse<RoleDetailDto>.Fail("A role with this name already exists.");
            }
            role.Name = request.Name.Trim();
        }

        role.Description = request.Description.Trim();
        role.UpdatedAtUtc = DateTime.UtcNow;

        if (request.PermissionIds != null)
        {
            _context.RolePermissions.RemoveRange(role.RolePermissions);
            var validPermIds = await _context.Permissions
                .Where(p => request.PermissionIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToListAsync(cancellationToken);

            foreach (var permId in validPermIds)
            {
                role.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permId });
            }
        }

        if (request.MenuIds != null)
        {
            _context.RoleMenus.RemoveRange(role.RoleMenus);
            var validMenuIds = await _context.Menus
                .Where(m => request.MenuIds.Contains(m.Id))
                .Select(m => m.Id)
                .ToListAsync(cancellationToken);

            foreach (var menuId in validMenuIds)
            {
                role.RoleMenus.Add(new RoleMenu { RoleId = role.Id, MenuId = menuId });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

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

        return ApiResponse<RoleDetailDto>.Ok(result, "Role updated successfully");
    }
}
