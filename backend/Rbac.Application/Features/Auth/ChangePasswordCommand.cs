using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Auth;
using Rbac.Application.DTOs.Common;

namespace Rbac.Application.Features.Auth;

public record ChangePasswordCommand(Guid UserId, ChangePasswordRequest Request) : IRequest<ApiResponse<bool>>;

public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, ApiResponse<bool>>
{
    private readonly IAppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public ChangePasswordCommandHandler(IAppDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<ApiResponse<bool>> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
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
        await _context.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Password changed successfully.");
    }
}
