using MediatR;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Common;

namespace Rbac.Application.Features.Auth;

public record LogoutCommand(Guid UserId) : IRequest<ApiResponse<bool>>;

public class LogoutCommandHandler : IRequestHandler<LogoutCommand, ApiResponse<bool>>
{
    private readonly IUnitOfWork _unitOfWork;

    public LogoutCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<bool>> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        await _unitOfWork.RefreshTokens.RevokeUserTokensAsync(request.UserId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ApiResponse<bool>.Ok(true, "Logged out successfully");
    }
}
