using MediatR;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Users;

namespace Rbac.Application.Features.Users;

public record GetUserByIdQuery(Guid Id) : IRequest<ApiResponse<UserDto>>;

public class GetUserByIdQueryHandler : IRequestHandler<GetUserByIdQuery, ApiResponse<UserDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetUserByIdQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<UserDto>> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
    {
        var user = await _unitOfWork.Users.GetByIdWithRolesAsync(request.Id, cancellationToken);

        if (user == null)
        {
            return ApiResponse<UserDto>.Fail("User not found");
        }

        var dto = new UserDto
        {
            Id = user.Id,
            UserName = user.UserName,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            CreatedAtUtc = user.CreatedAtUtc,
            Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList(),
            RoleIds = user.UserRoles.Select(ur => ur.RoleId).ToList()
        };

        return ApiResponse<UserDto>.Ok(dto);
    }
}
