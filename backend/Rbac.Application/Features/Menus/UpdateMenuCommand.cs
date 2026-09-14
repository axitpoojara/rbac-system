using MediatR;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Menus;

namespace Rbac.Application.Features.Menus;

public record UpdateMenuCommand(Guid Id, UpdateMenuDto Request) : IRequest<ApiResponse<MenuDto>>;

public class UpdateMenuCommandHandler : IRequestHandler<UpdateMenuCommand, ApiResponse<MenuDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public UpdateMenuCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<MenuDto>> Handle(UpdateMenuCommand command, CancellationToken cancellationToken)
    {
        var id = command.Id;
        var request = command.Request;

        var menu = await _unitOfWork.Menus.GetByIdAsync(id, cancellationToken);
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

        _unitOfWork.Menus.Update(menu);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        string? parentTitle = null;
        if (menu.ParentId.HasValue)
        {
            var parent = await _unitOfWork.Menus.GetByIdAsync(menu.ParentId.Value, cancellationToken);
            parentTitle = parent?.Title;
        }

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
