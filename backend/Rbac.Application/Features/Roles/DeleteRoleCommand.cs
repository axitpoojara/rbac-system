using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Common;

namespace Rbac.Application.Features.Roles;

public record DeleteRoleCommand(Guid Id, string? CurrentUserName = null) : IRequest<ApiResponse<bool>>;

public class DeleteRoleCommandHandler : IRequestHandler<DeleteRoleCommand, ApiResponse<bool>>
{
    private readonly IUnitOfWork _unitOfWork;

    public DeleteRoleCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<bool>> Handle(DeleteRoleCommand request, CancellationToken cancellationToken)
    {
        var role = await _unitOfWork.Roles.Query(asNoTracking: false)
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);

        if (role == null)
        {
            return ApiResponse<bool>.Fail("Role not found");
        }

        if (role.IsSystemRole)
        {
            return ApiResponse<bool>.Fail("System roles cannot be deleted.");
        }

        if (role.UserRoles.Any())
        {
            return ApiResponse<bool>.Fail("Cannot delete a role that is assigned to users. Unassign it first.");
        }

        role.IsDeleted = true;
        role.DeletedAtUtc = DateTime.UtcNow;
        role.DeletedBy = request.CurrentUserName ?? "Admin";

        _unitOfWork.Roles.Update(role);

        await _unitOfWork.AuditLogs.LogAsync(
            request.CurrentUserName ?? "Admin",
            "SoftDelete",
            "Role",
            role.Id.ToString(),
            $"Role '{role.Name}' was soft-deleted.",
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Role deleted successfully");
    }
}
