using MediatR;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Menus;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Menus;

public record CreateMenuCommand(CreateMenuDto Request) : IRequest<ApiResponse<MenuDto>>;

public class CreateMenuCommandHandler : IRequestHandler<CreateMenuCommand, ApiResponse<MenuDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateMenuCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<MenuDto>> Handle(CreateMenuCommand command, CancellationToken cancellationToken)
    {
        var request = command.Request;
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Route))
        {
            return ApiResponse<MenuDto>.Fail("Title and Route are required.");
        }

        if (request.ParentId.HasValue)
        {
            var parentExists = await _unitOfWork.Menus.AnyAsync(m => m.Id == request.ParentId.Value, cancellationToken);
            if (!parentExists)
            {
                return ApiResponse<MenuDto>.Fail("Parent menu does not exist.");
            }
        }

        var menu = new Menu
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Route = request.Route.Trim(),
            Icon = request.Icon?.Trim() ?? string.Empty,
            ParentId = request.ParentId,
            DisplayOrder = request.DisplayOrder,
            RequiredPermission = string.IsNullOrWhiteSpace(request.RequiredPermission) ? null : request.RequiredPermission.Trim(),
            IsActive = request.IsActive
        };

        await _unitOfWork.Menus.AddAsync(menu, cancellationToken);
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

        return ApiResponse<MenuDto>.Ok(dto, "Menu item created successfully");
    }
}
