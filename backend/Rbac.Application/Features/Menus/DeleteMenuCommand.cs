using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;

namespace Rbac.Application.Features.Menus;

public record DeleteMenuCommand(Guid Id, string? CurrentUserName = null) : IRequest<ApiResponse<bool>>;

public class DeleteMenuCommandHandler : IRequestHandler<DeleteMenuCommand, ApiResponse<bool>>
{
    private readonly IAppDbContext _context;

    public DeleteMenuCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<bool>> Handle(DeleteMenuCommand request, CancellationToken cancellationToken)
    {
        var menu = await _context.Menus
            .Include(m => m.SubMenus)
            .FirstOrDefaultAsync(m => m.Id == request.Id, cancellationToken);

        if (menu == null)
        {
            return ApiResponse<bool>.Fail("Menu not found");
        }

        if (menu.SubMenus.Any())
        {
            return ApiResponse<bool>.Fail("Cannot delete menu that has child menus. Delete or reassign children first.");
        }

        menu.IsDeleted = true;
        menu.DeletedAtUtc = DateTime.UtcNow;
        menu.DeletedBy = request.CurrentUserName ?? "Admin";

        _context.AuditLogs.Add(new Domain.Entities.AuditLog
        {
            Id = Guid.NewGuid(),
            UserName = request.CurrentUserName ?? "Admin",
            Action = "SoftDelete",
            EntityName = "Menu",
            EntityId = menu.Id.ToString(),
            TimestampUtc = DateTime.UtcNow,
            Details = $"Menu item '{menu.Title}' ({menu.Route}) was soft-deleted."
        });

        await _context.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Menu item deleted successfully");
    }
}
