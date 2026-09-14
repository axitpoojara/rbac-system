using MediatR;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Auth;
using Rbac.Application.DTOs.Common;

namespace Rbac.Application.Features.Auth;

public record RevokeTokenCommand(RevokeTokenRequest Request) : IRequest<ApiResponse<bool>>;

public class RevokeTokenCommandHandler : IRequestHandler<RevokeTokenCommand, ApiResponse<bool>>
{
    private readonly IUnitOfWork _unitOfWork;

    public RevokeTokenCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<bool>> Handle(RevokeTokenCommand request, CancellationToken cancellationToken)
    {
        var token = await _unitOfWork.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == request.Request.RefreshToken, cancellationToken);
        if (token == null)
        {
            return ApiResponse<bool>.Fail("Token not found");
        }

        if (token.IsActive)
        {
            token.RevokedAtUtc = DateTime.UtcNow;
            _unitOfWork.RefreshTokens.Update(token);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return ApiResponse<bool>.Ok(true, "Token revoked successfully");
    }
}
