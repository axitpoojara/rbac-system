using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Auth;
using Rbac.Application.DTOs.Common;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Auth;

public record RequestTemporaryPasswordCommand(RequestTempPasswordRequest Request) : IRequest<ApiResponse<bool>>;

public class RequestTemporaryPasswordCommandHandler : IRequestHandler<RequestTemporaryPasswordCommand, ApiResponse<bool>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEmailService _emailService;

    public RequestTemporaryPasswordCommandHandler(
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        IEmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _emailService = emailService;
    }

    public async Task<ApiResponse<bool>> Handle(RequestTemporaryPasswordCommand command, CancellationToken cancellationToken)
    {
        var model = command.Request;
        if (string.IsNullOrWhiteSpace(model.Email))
        {
            return ApiResponse<bool>.Fail("Email address is required.");
        }

        var normalizedEmail = model.Email.Trim().ToLower();
        if (!normalizedEmail.Contains('@') || !normalizedEmail.Contains('.'))
        {
            return ApiResponse<bool>.Fail("Please enter a valid email address.");
        }

        var user = await _unitOfWork.Users.GetByEmailAsync(normalizedEmail, cancellationToken);

        bool isNewUser = false;
        if (user == null)
        {
            isNewUser = true;
            // Derive username from email prefix
            var prefix = normalizedEmail.Split('@')[0];
            var cleanPrefix = new string(prefix.Where(char.IsLetterOrDigit).ToArray());
            if (string.IsNullOrWhiteSpace(cleanPrefix))
            {
                cleanPrefix = "user";
            }

            var baseUsername = cleanPrefix;
            var userName = baseUsername;
            int counter = 1;
            while (!await _unitOfWork.Users.IsUserNameUniqueAsync(userName, null, cancellationToken))
            {
                userName = $"{baseUsername}{counter++}";
            }

            var defaultRole = await _unitOfWork.Roles.GetByNameAsync("Employee", cancellationToken)
                              ?? await _unitOfWork.Roles.Query(asNoTracking: true).FirstOrDefaultAsync(cancellationToken);

            user = new User
            {
                Id = Guid.NewGuid(),
                UserName = userName,
                Email = normalizedEmail,
                FirstName = userName,
                LastName = string.Empty,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                CreatedBy = "SelfRegistration"
            };

            if (defaultRole != null)
            {
                user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = defaultRole.Id });
            }

            await _unitOfWork.Users.AddAsync(user, cancellationToken);
        }
        else
        {
            if (!user.IsActive)
            {
                return ApiResponse<bool>.Fail("Your account has been deactivated. Please contact an administrator.");
            }
        }

        // Generate temporary password with pattern Temp#XXXXXX
        var tempPassword = $"Temp#{Random.Shared.Next(100000, 999999)}";
        user.PasswordHash = _passwordHasher.HashPassword(tempPassword);
        user.MustChangePassword = true;
        user.TemporaryPasswordExpiresAtUtc = DateTime.UtcNow.AddMinutes(30);
        user.UpdatedAtUtc = DateTime.UtcNow;

        if (!isNewUser)
        {
            _unitOfWork.Users.Update(user);
        }

        await _unitOfWork.AuditLogs.LogAsync(
            user.UserName,
            isNewUser ? "SelfRegisterTempPassword" : "RequestTempPassword",
            "User",
            user.Id.ToString(),
            $"Temporary password generated for {user.Email} (expires in 30 minutes).",
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Send email with temporary password
        await _emailService.SendTemporaryPasswordEmailAsync(user.Email, user.UserName, tempPassword, cancellationToken);

        return ApiResponse<bool>.Ok(true, "A temporary password has been sent to your email address. Please check your inbox.");
    }
}
