using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Permissions;

namespace Rbac.Application.Features.Permissions;

public record GetGroupedPermissionsQuery : IRequest<ApiResponse<List<ModulePermissionsDto>>>;

public class GetGroupedPermissionsQueryHandler : IRequestHandler<GetGroupedPermissionsQuery, ApiResponse<List<ModulePermissionsDto>>>
{
    private readonly IAppDbContext _context;

    public GetGroupedPermissionsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<ModulePermissionsDto>>> Handle(GetGroupedPermissionsQuery request, CancellationToken cancellationToken)
    {
        var permissions = await _context.Permissions
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Name)
            .ToListAsync(cancellationToken);

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

        return ApiResponse<List<ModulePermissionsDto>>.Ok(grouped);
    }
}
