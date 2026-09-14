using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Permissions;

namespace Rbac.Application.Features.Permissions;

public record GetPermissionsQuery : IRequest<ApiResponse<List<PermissionDto>>>;

public class GetPermissionsQueryHandler : IRequestHandler<GetPermissionsQuery, ApiResponse<List<PermissionDto>>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetPermissionsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<List<PermissionDto>>> Handle(GetPermissionsQuery request, CancellationToken cancellationToken)
    {
        var permissions = await _unitOfWork.Permissions.Query(asNoTracking: true)
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
