using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Menus;

namespace Rbac.Application.Features.Menus;

public record GetMenusQuery : IRequest<ApiResponse<List<MenuDto>>>;

public class GetMenusQueryHandler : IRequestHandler<GetMenusQuery, ApiResponse<List<MenuDto>>>
{
    private readonly IAppDbContext _context;

    public GetMenusQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<MenuDto>>> Handle(GetMenusQuery request, CancellationToken cancellationToken)
    {
        var menus = await _context.Menus
            .Include(m => m.Parent)
            .OrderBy(m => m.DisplayOrder)
            .Select(m => new MenuDto
            {
                Id = m.Id,
                Title = m.Title,
                Route = m.Route,
                Icon = m.Icon,
                ParentId = m.ParentId,
                ParentTitle = m.Parent != null ? m.Parent.Title : null,
                DisplayOrder = m.DisplayOrder,
                RequiredPermission = m.RequiredPermission,
                IsActive = m.IsActive
            })
            .ToListAsync(cancellationToken);

        return ApiResponse<List<MenuDto>>.Ok(menus);
    }
}
