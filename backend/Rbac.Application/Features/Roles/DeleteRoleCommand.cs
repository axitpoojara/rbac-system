using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;

namespace Rbac.Application.Features.Roles;

public record DeleteRoleCommand(Guid Id) : IRequest<ApiResponse<bool>>;

public class DeleteRoleCommandHandler : IRequestHandler<DeleteRoleCommand, ApiResponse<bool>>
{
    private readonly IAppDbContext _context;

    public DeleteRoleCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<bool>> Handle(DeleteRoleCommand request, CancellationToken cancellationToken)
    {
        var role = await _context.Roles
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

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Role deleted successfully");
    }
}
