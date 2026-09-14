using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Users;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Users;

public record CreateUserCommand(CreateUserDto Request, string CreatedBy) : IRequest<ApiResponse<UserDto>>;

public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, ApiResponse<UserDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;

    public CreateUserCommandHandler(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
    }

    public async Task<ApiResponse<UserDto>> Handle(CreateUserCommand command, CancellationToken cancellationToken)
    {
        var request = command.Request;
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return ApiResponse<UserDto>.Fail("Username, email, and password are required.");
        }

        var isUserNameUnique = await _unitOfWork.Users.IsUserNameUniqueAsync(request.UserName.Trim(), null, cancellationToken);
        var isEmailUnique = await _unitOfWork.Users.IsEmailUniqueAsync(request.Email.Trim(), null, cancellationToken);

        if (!isUserNameUnique || !isEmailUnique)
        {
            return ApiResponse<UserDto>.Fail("A user with this username or email already exists.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = request.UserName.Trim(),
            Email = request.Email.Trim(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            IsActive = request.IsActive,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = string.IsNullOrWhiteSpace(command.CreatedBy) ? "System" : command.CreatedBy
        };

        if (request.RoleIds != null && request.RoleIds.Any())
        {
            var validRoleIds = await _unitOfWork.Roles.Query(asNoTracking: true)
                .Where(r => request.RoleIds.Contains(r.Id))
                .Select(r => r.Id)
                .ToListAsync(cancellationToken);

            foreach (var roleId in validRoleIds)
            {
                user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
            }
        }

        await _unitOfWork.Users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var roles = await _unitOfWork.Roles.Query(asNoTracking: true)
            .Where(r => user.UserRoles.Select(ur => ur.RoleId).Contains(r.Id))
            .Select(r => r.Name)
            .ToListAsync(cancellationToken);

        var dto = new UserDto
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
        };

        return ApiResponse<UserDto>.Ok(dto, "User created successfully");
    }
}
