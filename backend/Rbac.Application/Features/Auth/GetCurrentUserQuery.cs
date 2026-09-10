using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Auth;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Users;

namespace Rbac.Application.Features.Auth;

public record GetCurrentUserQuery(Guid UserId) : IRequest<ApiResponse<AuthResponse>>;

public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, ApiResponse<AuthResponse>>
{
    private readonly IAppDbContext _context;

    public GetCurrentUserQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<AuthResponse>> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null || !user.IsActive)
        {
            return ApiResponse<AuthResponse>.Fail("User not found or inactive.");
        }

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var permissions = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToList();

        var response = new AuthResponse
        {
            AccessToken = string.Empty,
            RefreshToken = string.Empty,
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

        return ApiResponse<AuthResponse>.Ok(response);
    }
}
