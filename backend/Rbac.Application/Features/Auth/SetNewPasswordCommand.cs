using MediatR;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Auth;
using Rbac.Application.DTOs.Common;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Auth;

public record SetNewPasswordCommand(Guid UserId, SetNewPasswordRequest Request) : IRequest<ApiResponse<bool>>;

public class SetNewPasswordCommandHandler : IRequestHandler<SetNewPasswordCommand, ApiResponse<bool>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;

    public SetNewPasswordCommandHandler(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
    }

    public async Task<ApiResponse<bool>> Handle(SetNewPasswordCommand request, CancellationToken cancellationToken)
    {
        var model = request.Request;
        if (string.IsNullOrWhiteSpace(model.NewPassword) || string.IsNullOrWhiteSpace(model.ConfirmPassword))
        {
            return ApiResponse<bool>.Fail("New password and confirmation password are required.");
        }

        if (model.NewPassword.Length < 6)
        {
            return ApiResponse<bool>.Fail("Password must be at least 6 characters long.");
        }

        if (model.NewPassword != model.ConfirmPassword)
        {
            return ApiResponse<bool>.Fail("New password and confirm password do not match.");
        }

        var user = await _unitOfWork.Users.GetByIdAsync(request.UserId, cancellationToken);
        if (user == null)
        {
            return ApiResponse<bool>.Fail("User not found.");
        }

        user.PasswordHash = _passwordHasher.HashPassword(model.NewPassword);
        user.MustChangePassword = false;
        user.TemporaryPasswordExpiresAtUtc = null;
        user.UpdatedAtUtc = DateTime.UtcNow;

        _unitOfWork.Users.Update(user);

        await _unitOfWork.AuditLogs.LogAsync(
            user.UserName,
            "SetPermanentPassword",
            "User",
            user.Id.ToString(),
            $"User '{user.UserName}' completed password onboarding and set their permanent password.",
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Your new password has been set successfully. Welcome aboard!");
    }
}
