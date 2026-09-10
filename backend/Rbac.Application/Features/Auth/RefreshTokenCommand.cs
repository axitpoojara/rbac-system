using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Auth;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Users;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Auth;

public record RefreshTokenCommand(RefreshTokenRequest Request) : IRequest<ApiResponse<AuthResponse>>;

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, ApiResponse<AuthResponse>>
{
    private readonly IAppDbContext _context;
    private readonly IJwtService _jwtService;

    public RefreshTokenCommandHandler(IAppDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<ApiResponse<AuthResponse>> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var model = request.Request;
        if (string.IsNullOrWhiteSpace(model.RefreshToken))
        {
            return ApiResponse<AuthResponse>.Fail("Refresh token is required.");
        }

        var tokenRecord = await _context.RefreshTokens
            .Include(rt => rt.User)
                .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(rt => rt.Token == model.RefreshToken, cancellationToken);

        if (tokenRecord == null)
        {
            return ApiResponse<AuthResponse>.Fail("Invalid refresh token.");
        }

        if (tokenRecord.IsRevoked)
        {
            var activeTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == tokenRecord.UserId && rt.RevokedAtUtc == null)
                .ToListAsync(cancellationToken);

            foreach (var t in activeTokens)
            {
                t.RevokedAtUtc = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync(cancellationToken);

            return ApiResponse<AuthResponse>.Fail("Refresh token compromised or revoked. Please log in again.");
        }

        if (tokenRecord.IsExpired)
        {
            return ApiResponse<AuthResponse>.Fail("Refresh token expired. Please log in again.");
        }

        var user = tokenRecord.User;
        if (!user.IsActive)
        {
            return ApiResponse<AuthResponse>.Fail("User account has been deactivated.");
        }

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var permissions = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToList();

        var newAccessToken = _jwtService.GenerateAccessToken(user, roles, permissions);
        var newRefreshToken = _jwtService.GenerateRefreshToken(user.Id);

        tokenRecord.RevokedAtUtc = DateTime.UtcNow;
        tokenRecord.ReplacedByToken = newRefreshToken.Token;

        _context.RefreshTokens.Add(newRefreshToken);
        await _context.SaveChangesAsync(cancellationToken);

        var response = new AuthResponse
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken.Token,
            ExpiresAt = newRefreshToken.ExpiresAtUtc,
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

        return ApiResponse<AuthResponse>.Ok(response, "Token refreshed successfully");
    }
}
