using MediatR;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Common;

namespace Rbac.Application.Features.Menus;

public record DeleteMenuCommand(Guid Id, string? CurrentUserName = null) : IRequest<ApiResponse<bool>>;

public class DeleteMenuCommandHandler : IRequestHandler<DeleteMenuCommand, ApiResponse<bool>>
{
    private readonly IUnitOfWork _unitOfWork;

    public DeleteMenuCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<bool>> Handle(DeleteMenuCommand request, CancellationToken cancellationToken)
    {
        var menu = await _unitOfWork.Menus.GetByIdAsync(request.Id, cancellationToken);

        if (menu == null)
        {
            return ApiResponse<bool>.Fail("Menu not found");
        }

        var hasChildren = await _unitOfWork.Menus.AnyAsync(m => m.ParentId == request.Id, cancellationToken);
        if (hasChildren)
        {
            return ApiResponse<bool>.Fail("Cannot delete menu that has child menus. Delete or reassign children first.");
        }

        menu.IsDeleted = true;
        menu.DeletedAtUtc = DateTime.UtcNow;
        menu.DeletedBy = request.CurrentUserName ?? "Admin";

        _unitOfWork.Menus.Update(menu);

        await _unitOfWork.AuditLogs.LogAsync(
            request.CurrentUserName ?? "Admin",
            "SoftDelete",
            "Menu",
            menu.Id.ToString(),
            $"Menu item '{menu.Title}' ({menu.Route}) was soft-deleted.",
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Menu item deleted successfully");
    }
}
