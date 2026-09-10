using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Permissions;

namespace Rbac.Application.Features.Permissions;

public record GetPermissionsQuery : IRequest<ApiResponse<List<PermissionDto>>>;

public class GetPermissionsQueryHandler : IRequestHandler<GetPermissionsQuery, ApiResponse<List<PermissionDto>>>
{
    private readonly IAppDbContext _context;

    public GetPermissionsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<PermissionDto>>> Handle(GetPermissionsQuery request, CancellationToken cancellationToken)
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
            .ToListAsync(cancellationToken);

        return ApiResponse<List<PermissionDto>>.Ok(permissions);
    }
}
