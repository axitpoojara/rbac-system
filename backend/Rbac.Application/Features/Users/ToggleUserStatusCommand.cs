using MediatR;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Users;

namespace Rbac.Application.Features.Users;

public record ToggleUserStatusCommand(Guid Id, ToggleStatusDto Request, Guid? CurrentUserId, string UpdatedBy) : IRequest<ApiResponse<bool>>;

public class ToggleUserStatusCommandHandler : IRequestHandler<ToggleUserStatusCommand, ApiResponse<bool>>
{
    private readonly IUnitOfWork _unitOfWork;

    public ToggleUserStatusCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<bool>> Handle(ToggleUserStatusCommand command, CancellationToken cancellationToken)
    {
        var id = command.Id;
        if (command.CurrentUserId.HasValue && command.CurrentUserId.Value == id)
        {
            return ApiResponse<bool>.Fail("You cannot change your own active status.");
        }

        var user = await _unitOfWork.Users.GetByIdAsync(id, cancellationToken);
        if (user == null)
        {
            return ApiResponse<bool>.Fail("User not found");
        }

        user.IsActive = command.Request.IsActive;
        user.UpdatedAtUtc = DateTime.UtcNow;
        user.UpdatedBy = string.IsNullOrWhiteSpace(command.UpdatedBy) ? "System" : command.UpdatedBy;

        if (!user.IsActive)
        {
            await _unitOfWork.RefreshTokens.RevokeUserTokensAsync(user.Id, cancellationToken);
        }

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(user.IsActive, $"User status updated to {(user.IsActive ? "Active" : "Inactive")}");
    }
}
