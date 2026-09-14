using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Roles;

namespace Rbac.Application.Features.Roles;

public record GetRoleByIdQuery(Guid Id) : IRequest<ApiResponse<RoleDetailDto>>;

public class GetRoleByIdQueryHandler : IRequestHandler<GetRoleByIdQuery, ApiResponse<RoleDetailDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetRoleByIdQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<RoleDetailDto>> Handle(GetRoleByIdQuery request, CancellationToken cancellationToken)
    {
        var role = await _unitOfWork.Roles.Query(asNoTracking: true)
            .Include(r => r.UserRoles)
            .Include(r => r.RolePermissions)
            .Include(r => r.RoleMenus)
            .FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);

        if (role == null)
        {
            return ApiResponse<RoleDetailDto>.Fail("Role not found");
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

        return ApiResponse<RoleDetailDto>.Ok(dto);
    }
}
