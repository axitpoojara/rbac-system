using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Auth;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Users;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Auth;

public record LoginCommand(LoginRequest Request) : IRequest<ApiResponse<AuthResponse>>;

public class LoginCommandHandler : IRequestHandler<LoginCommand, ApiResponse<AuthResponse>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtService _jwtService;

    public LoginCommandHandler(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher, IJwtService jwtService)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
    }

    public async Task<ApiResponse<AuthResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var model = request.Request;
        if (string.IsNullOrWhiteSpace(model.UserNameOrEmail) || string.IsNullOrWhiteSpace(model.Password))
        {
            return ApiResponse<AuthResponse>.Fail("Username/Email and Password are required.");
        }

        var normalizedInput = model.UserNameOrEmail.Trim().ToLower();
        var user = await _unitOfWork.Users.Query(asNoTracking: true)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.UserName.ToLower() == normalizedInput || u.Email.ToLower() == normalizedInput, cancellationToken);

        if (user == null || !_passwordHasher.VerifyPassword(model.Password, user.PasswordHash))
        {
            return ApiResponse<AuthResponse>.Fail("Invalid credentials.");
        }

        if (!user.IsActive)
        {
            return ApiResponse<AuthResponse>.Fail("Your account has been deactivated. Please contact an administrator.");
        }

        if (user.MustChangePassword && user.TemporaryPasswordExpiresAtUtc.HasValue && user.TemporaryPasswordExpiresAtUtc.Value < DateTime.UtcNow)
        {
            return ApiResponse<AuthResponse>.Fail("Your temporary password has expired. Please request a new one.");
        }

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var permissions = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToList();

        var accessToken = _jwtService.GenerateAccessToken(user, roles, permissions);
        var refreshToken = _jwtService.GenerateRefreshToken(user.Id);

        await _unitOfWork.RefreshTokens.AddAsync(refreshToken, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var response = new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken.Token,
            ExpiresAt = refreshToken.ExpiresAtUtc,
            MustChangePassword = user.MustChangePassword,
            User = new UserDto
            {
                Id = user.Id,
                UserName = user.UserName,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                CreatedAtUtc = user.CreatedAtUtc,
                Roles = roles,
                RoleIds = user.UserRoles.Select(ur => ur.RoleId).ToList()
            },
            Roles = roles,
            Permissions = permissions
        };

        return ApiResponse<AuthResponse>.Ok(response, "Login successful");
    }
}
