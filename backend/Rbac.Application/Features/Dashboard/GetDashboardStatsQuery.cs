using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Dashboard;

namespace Rbac.Application.Features.Dashboard;

public record GetDashboardStatsQuery : IRequest<ApiResponse<DashboardStatsDto>>;

public class GetDashboardStatsQueryHandler : IRequestHandler<GetDashboardStatsQuery, ApiResponse<DashboardStatsDto>>
{
    private readonly IAppDbContext _context;

    public GetDashboardStatsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<DashboardStatsDto>> Handle(GetDashboardStatsQuery request, CancellationToken cancellationToken)
    {
        var totalUsers = await _context.Users.CountAsync(cancellationToken);
        var activeUsers = await _context.Users.CountAsync(u => u.IsActive, cancellationToken);
        var inactiveUsers = totalUsers - activeUsers;
        var totalRoles = await _context.Roles.CountAsync(cancellationToken);
        var totalPermissions = await _context.Permissions.CountAsync(cancellationToken);
        var totalMenus = await _context.Menus.CountAsync(cancellationToken);

        var recentUsers = await _context.Users
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
