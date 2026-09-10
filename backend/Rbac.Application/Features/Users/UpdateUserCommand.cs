using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Users;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Users;

public record UpdateUserCommand(Guid Id, UpdateUserDto Request, string UpdatedBy) : IRequest<ApiResponse<UserDto>>;

public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, ApiResponse<UserDto>>
{
    private readonly IAppDbContext _context;

    public UpdateUserCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<UserDto>> Handle(UpdateUserCommand command, CancellationToken cancellationToken)
    {
        var id = command.Id;
        var request = command.Request;

        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            return ApiResponse<UserDto>.Fail("User not found");
        }

        if (user.Email.ToLower() != request.Email.Trim().ToLower())
        {
            var emailExists = await _context.Users.AnyAsync(u => u.Id != id && u.Email.ToLower() == request.Email.Trim().ToLower(), cancellationToken);
            if (emailExists)
            {
                return ApiResponse<UserDto>.Fail("Email is already in use by another user.");
            }
            user.Email = request.Email.Trim();
        }

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.IsActive = request.IsActive;
        user.UpdatedAtUtc = DateTime.UtcNow;
        user.UpdatedBy = string.IsNullOrWhiteSpace(command.UpdatedBy) ? "System" : command.UpdatedBy;

        if (!user.IsActive)
        {
            var activeTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == user.Id && rt.RevokedAtUtc == null)
                .ToListAsync(cancellationToken);

            foreach (var t in activeTokens)
            {
                t.RevokedAtUtc = DateTime.UtcNow;
            }
        }

        if (request.RoleIds != null)
        {
            _context.UserRoles.RemoveRange(user.UserRoles);

            var validRoleIds = await _context.Roles
                .Where(r => request.RoleIds.Contains(r.Id))
                .Select(r => r.Id)
                .ToListAsync(cancellationToken);

            foreach (var roleId in validRoleIds)
            {
                user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        var roles = await _context.Roles
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

        return ApiResponse<UserDto>.Ok(dto, "User updated successfully");
    }
}
