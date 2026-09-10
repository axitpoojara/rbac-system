using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RbacApi.Data;
using RbacApi.DTOs.Common;

namespace RbacApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<DashboardStatsDto>>> GetStats()
    {
        var totalUsers = await _context.Users.CountAsync();
        var activeUsers = await _context.Users.CountAsync(u => u.IsActive);
        var inactiveUsers = totalUsers - activeUsers;
        var totalRoles = await _context.Roles.CountAsync();
        var totalPermissions = await _context.Permissions.CountAsync();
        var totalMenus = await _context.Menus.CountAsync();

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
            .ToListAsync();

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

        return Ok(ApiResponse<DashboardStatsDto>.Ok(stats));
    }
}

public class DashboardStatsDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int InactiveUsers { get; set; }
    public int TotalRoles { get; set; }
    public int TotalPermissions { get; set; }
    public int TotalMenus { get; set; }
    public object? RecentUsers { get; set; }
}
