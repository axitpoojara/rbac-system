using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Dashboard;

namespace Rbac.Application.Features.Dashboard;

public record GetDashboardStatsQuery : IRequest<ApiResponse<DashboardStatsDto>>;

public class GetDashboardStatsQueryHandler : IRequestHandler<GetDashboardStatsQuery, ApiResponse<DashboardStatsDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetDashboardStatsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<DashboardStatsDto>> Handle(GetDashboardStatsQuery request, CancellationToken cancellationToken)
    {
        var totalUsers = await _unitOfWork.Users.CountAsync(null, cancellationToken);
        var activeUsers = await _unitOfWork.Users.CountAsync(u => u.IsActive, cancellationToken);
        var inactiveUsers = totalUsers - activeUsers;
        var totalRoles = await _unitOfWork.Roles.CountAsync(null, cancellationToken);
        var totalPermissions = await _unitOfWork.Permissions.CountAsync(null, cancellationToken);
        var totalMenus = await _unitOfWork.Menus.CountAsync(null, cancellationToken);

        var recentUsers = await _unitOfWork.Users.Query(asNoTracking: true)
            .OrderByDescending(u => u.CreatedAtUtc)
            .Take(5)
            .Select(u => new
            {
                u.Id,
                u.UserName,
                u.Email,
                u.FirstName,
                u.LastName,
                u.IsActive,
                u.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var stats = new DashboardStatsDto
        {
            TotalUsers = totalUsers,
            ActiveUsers = activeUsers,
            InactiveUsers = inactiveUsers,
            TotalRoles = totalRoles,
            TotalPermissions = totalPermissions,
            TotalMenus = totalMenus,
            RecentUsers = recentUsers
        };

        return ApiResponse<DashboardStatsDto>.Ok(stats);
    }
}
