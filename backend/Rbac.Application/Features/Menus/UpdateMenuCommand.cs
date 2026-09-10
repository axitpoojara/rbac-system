using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Menus;

namespace Rbac.Application.Features.Menus;

public record UpdateMenuCommand(Guid Id, UpdateMenuDto Request) : IRequest<ApiResponse<MenuDto>>;

public class UpdateMenuCommandHandler : IRequestHandler<UpdateMenuCommand, ApiResponse<MenuDto>>
{
    private readonly IAppDbContext _context;

    public UpdateMenuCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<MenuDto>> Handle(UpdateMenuCommand command, CancellationToken cancellationToken)
    {
        var id = command.Id;
        var request = command.Request;

        var menu = await _context.Menus.FindAsync(new object[] { id }, cancellationToken);
        if (menu == null)
        {
            return ApiResponse<MenuDto>.Fail("Menu not found");
        }

        if (request.ParentId == id)
        {
            return ApiResponse<MenuDto>.Fail("A menu item cannot be its own parent.");
        }

        menu.Title = request.Title.Trim();
        menu.Route = request.Route.Trim();
        menu.Icon = request.Icon?.Trim() ?? string.Empty;
        menu.ParentId = request.ParentId;
        menu.DisplayOrder = request.DisplayOrder;
        menu.RequiredPermission = string.IsNullOrWhiteSpace(request.RequiredPermission) ? null : request.RequiredPermission.Trim();
        menu.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        var parentTitle = menu.ParentId.HasValue
            ? await _context.Menus.Where(m => m.Id == menu.ParentId.Value).Select(m => m.Title).FirstOrDefaultAsync(cancellationToken)
            : null;

        var dto = new MenuDto
        {
            Id = menu.Id,
            Title = menu.Title,
            Route = menu.Route,
            Icon = menu.Icon,
            ParentId = menu.ParentId,
            ParentTitle = parentTitle,
            DisplayOrder = menu.DisplayOrder,
            RequiredPermission = menu.RequiredPermission,
            IsActive = menu.IsActive
        };

        return ApiResponse<MenuDto>.Ok(dto, "Menu item updated successfully");
    }
}
