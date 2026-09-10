using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Menus;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Menus;

public record CreateMenuCommand(CreateMenuDto Request) : IRequest<ApiResponse<MenuDto>>;

public class CreateMenuCommandHandler : IRequestHandler<CreateMenuCommand, ApiResponse<MenuDto>>
{
    private readonly IAppDbContext _context;

    public CreateMenuCommandHandler(IAppDbContext context)
    {
        _context = context;
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
            var parentExists = await _context.Menus.AnyAsync(m => m.Id == request.ParentId.Value, cancellationToken);
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

        _context.Menus.Add(menu);
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

        return ApiResponse<MenuDto>.Ok(dto, "Menu item created successfully");
    }
}
