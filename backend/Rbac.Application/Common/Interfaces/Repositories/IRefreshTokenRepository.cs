using Rbac.Domain.Entities;

namespace Rbac.Application.Common.Interfaces.Repositories;

public interface IRefreshTokenRepository : IRepository<RefreshToken>
{
    Task<RefreshToken?> GetActiveTokenWithUserAsync(string token, CancellationToken cancellationToken = default);
    Task RevokeUserTokensAsync(Guid userId, CancellationToken cancellationToken = default);
}
