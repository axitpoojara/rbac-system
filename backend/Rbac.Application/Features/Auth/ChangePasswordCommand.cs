using MediatR;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Auth;
using Rbac.Application.DTOs.Common;

namespace Rbac.Application.Features.Auth;

public record ChangePasswordCommand(Guid UserId, ChangePasswordRequest Request) : IRequest<ApiResponse<bool>>;

public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, ApiResponse<bool>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;

    public ChangePasswordCommandHandler(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
    }

    public async Task<ApiResponse<bool>> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(request.UserId, cancellationToken);
        if (user == null)
        {
            return ApiResponse<bool>.Fail("User not found");
        }

        if (!_passwordHasher.VerifyPassword(request.Request.CurrentPassword, user.PasswordHash))
        {
            return ApiResponse<bool>.Fail("Current password does not match.");
        }

        user.PasswordHash = _passwordHasher.HashPassword(request.Request.NewPassword);
        user.UpdatedAtUtc = DateTime.UtcNow;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Password changed successfully.");
    }
}
