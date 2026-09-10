using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Auth;
using Rbac.Application.DTOs.Common;

namespace Rbac.Application.Features.Auth;

public record RevokeTokenCommand(RevokeTokenRequest Request) : IRequest<ApiResponse<bool>>;

public class RevokeTokenCommandHandler : IRequestHandler<RevokeTokenCommand, ApiResponse<bool>>
{
    private readonly IAppDbContext _context;

    public RevokeTokenCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<bool>> Handle(RevokeTokenCommand request, CancellationToken cancellationToken)
    {
        var token = await _context.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == request.Request.RefreshToken, cancellationToken);
        if (token == null)
        {
            return ApiResponse<bool>.Fail("Token not found");
        }

        if (token.IsActive)
        {
            token.RevokedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return ApiResponse<bool>.Ok(true, "Token revoked successfully");
    }
}
