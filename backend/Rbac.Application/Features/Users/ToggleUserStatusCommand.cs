using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Users;

namespace Rbac.Application.Features.Users;

public record ToggleUserStatusCommand(Guid Id, ToggleStatusDto Request, Guid? CurrentUserId, string UpdatedBy) : IRequest<ApiResponse<bool>>;

public class ToggleUserStatusCommandHandler : IRequestHandler<ToggleUserStatusCommand, ApiResponse<bool>>
{
    private readonly IAppDbContext _context;

    public ToggleUserStatusCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<bool>> Handle(ToggleUserStatusCommand command, CancellationToken cancellationToken)
    {
        var id = command.Id;
        if (command.CurrentUserId.HasValue && command.CurrentUserId.Value == id)
        {
            return ApiResponse<bool>.Fail("You cannot change your own active status.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null)
        {
            return ApiResponse<bool>.Fail("User not found");
        }

        user.IsActive = command.Request.IsActive;
        user.UpdatedAtUtc = DateTime.UtcNow;
        user.UpdatedBy = string.IsNullOrWhiteSpace(command.UpdatedBy) ? "System" : command.UpdatedBy;

        if (!user.IsActive)
        {
            var activeTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == user.Id && rt.RevokedAtUtc == null)
                .ToListAsync(cancellationToken);

            foreach (var t in activeTokens)
            {
                t.RevokedAtUtc = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return ApiResponse<bool>.Ok(user.IsActive, $"User status updated to {(user.IsActive ? "Active" : "Inactive")}");
    }
}
