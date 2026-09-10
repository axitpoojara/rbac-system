using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Menus;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Menus;

public record GetUserNavMenusQuery(Guid UserId, bool IsSuperAdmin) : IRequest<ApiResponse<List<NavMenuItemDto>>>;

public class GetUserNavMenusQueryHandler : IRequestHandler<GetUserNavMenusQuery, ApiResponse<List<NavMenuItemDto>>>
{
    private readonly IAppDbContext _context;

    public GetUserNavMenusQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<NavMenuItemDto>>> Handle(GetUserNavMenusQuery request, CancellationToken cancellationToken)
    {
        List<Menu> accessibleMenus;

        if (request.IsSuperAdmin)
        {
            accessibleMenus = await _context.Menus
                .Where(m => m.IsActive)
                .OrderBy(m => m.DisplayOrder)
                .ToListAsync(cancellationToken);
        }
        else
        {
            var userPermissions = await _context.UserRoles
                .Where(ur => ur.UserId == request.UserId && ur.User.IsActive)
                .SelectMany(ur => ur.Role.RolePermissions)
                .Select(rp => rp.Permission.Code)
                .Distinct()
                .ToListAsync(cancellationToken);

            var permSet = new HashSet<string>(userPermissions, StringComparer.OrdinalIgnoreCase);

            var roleMenus = await _context.UserRoles
                .Where(ur => ur.UserId == request.UserId && ur.User.IsActive)
                .SelectMany(ur => ur.Role.RoleMenus)
                .Select(rm => rm.Menu)
                .Where(m => m.IsActive)
                .Distinct()
                .ToListAsync(cancellationToken);

            accessibleMenus = roleMenus
                .Where(m => string.IsNullOrEmpty(m.RequiredPermission) || permSet.Contains(m.RequiredPermission))
                .OrderBy(m => m.DisplayOrder)
                .ToList();

            var parentIds = accessibleMenus.Where(m => m.ParentId.HasValue).Select(m => m.ParentId!.Value).Distinct().ToList();
            if (parentIds.Any())
            {
                var parents = await _context.Menus
                    .Where(m => parentIds.Contains(m.Id) && m.IsActive)
                    .ToListAsync(cancellationToken);

                foreach (var parent in parents)
                {
                    if (!accessibleMenus.Any(m => m.Id == parent.Id))
                    {
                        accessibleMenus.Add(parent);
                    }
                }
            }
        }

        var lookup = accessibleMenus.ToDictionary(m => m.Id, m => new NavMenuItemDto
        {
            Id = m.Id,
            Title = m.Title,
            Route = m.Route,
            Icon = m.Icon,
            DisplayOrder = m.DisplayOrder,
            Children = new List<NavMenuItemDto>()
        });

        var rootItems = new List<NavMenuItemDto>();

        foreach (var menu in accessibleMenus.OrderBy(m => m.DisplayOrder))
        {
            var navItem = lookup[menu.Id];
            if (menu.ParentId.HasValue && lookup.ContainsKey(menu.ParentId.Value))
            {
                lookup[menu.ParentId.Value].Children.Add(navItem);
            }
            else
            {
                rootItems.Add(navItem);
            }
        }

        return ApiResponse<List<NavMenuItemDto>>.Ok(rootItems);
    }
}
