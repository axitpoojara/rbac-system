using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Permissions;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Permissions;

public record CreatePermissionCommand(CreatePermissionDto Request) : IRequest<ApiResponse<PermissionDto>>;

public class CreatePermissionCommandHandler : IRequestHandler<CreatePermissionCommand, ApiResponse<PermissionDto>>
{
    private readonly IAppDbContext _context;

    public CreatePermissionCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<PermissionDto>> Handle(CreatePermissionCommand command, CancellationToken cancellationToken)
    {
        var request = command.Request;
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Module))
        {
            return ApiResponse<PermissionDto>.Fail("Code, Name, and Module are required.");
        }

        var exists = await _context.Permissions.AnyAsync(p => p.Code.ToLower() == request.Code.Trim().ToLower(), cancellationToken);
        if (exists)
        {
            return ApiResponse<PermissionDto>.Fail("A permission with this code already exists.");
        }

        var permission = new Permission
        {
            Id = Guid.NewGuid(),
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Module = request.Module.Trim(),
            Description = request.Description.Trim()
        };

        _context.Permissions.Add(permission);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new PermissionDto
        {
            Id = permission.Id,
            Code = permission.Code,
            Name = permission.Name,
            Module = permission.Module,
            Description = permission.Description
        };

        return ApiResponse<PermissionDto>.Ok(dto, "Permission created successfully");
    }
}
