using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;

namespace Rbac.Application.Features.Users;

public record DeleteUserCommand(Guid Id, Guid? CurrentUserId) : IRequest<ApiResponse<bool>>;

public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, ApiResponse<bool>>
{
    private readonly IAppDbContext _context;

    public DeleteUserCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<bool>> Handle(DeleteUserCommand command, CancellationToken cancellationToken)
    {
        var id = command.Id;
        if (command.CurrentUserId.HasValue && command.CurrentUserId.Value == id)
        {
            return ApiResponse<bool>.Fail("You cannot delete your own account.");
        }

        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            return ApiResponse<bool>.Fail("User not found");
        }

        if (user.UserRoles.Any(ur => ur.Role.Name == "SuperAdmin"))
        {
            return ApiResponse<bool>.Fail("SuperAdmin user accounts cannot be deleted.");
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "User deleted successfully");
    }
}
