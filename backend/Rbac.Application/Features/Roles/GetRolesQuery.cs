using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Roles;

namespace Rbac.Application.Features.Roles;

public record GetRolesQuery : IRequest<ApiResponse<List<RoleDto>>>;

public class GetRolesQueryHandler : IRequestHandler<GetRolesQuery, ApiResponse<List<RoleDto>>>
{
    private readonly IAppDbContext _context;

    public GetRolesQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<RoleDto>>> Handle(GetRolesQuery request, CancellationToken cancellationToken)
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
            .ToListAsync(cancellationToken);

        return ApiResponse<List<RoleDto>>.Ok(roles);
    }
}
