using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RbacApi.Data;
using RbacApi.DTOs.Common;
using RbacApi.DTOs.Users;
using RbacApi.Entities;
using RbacApi.Security;
using RbacApi.Security.Authorization;

namespace RbacApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        ILogger<UsersController> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    [HttpGet]
    [HasPermission("Users.View")]
    public async Task<ActionResult<ApiResponse<PagedResult<UserDto>>>> GetUsers(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? searchTerm = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] Guid? roleId = null)
    {
        var query = _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(u =>
                u.UserName.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term) ||
                u.FirstName.ToLower().Contains(term) ||
                u.LastName.ToLower().Contains(term));
        }

        if (isActive.HasValue)
        {
            query = query.Where(u => u.IsActive == isActive.Value);
        }

        if (roleId.HasValue)
        {
            query = query.Where(u => u.UserRoles.Any(ur => ur.RoleId == roleId.Value));
        }

        var totalCount = await query.CountAsync();

        var users = await query
            .OrderByDescending(u => u.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserDto
            {
                Id = u.Id,
                UserName = u.UserName,
                Email = u.Email,
                FirstName = u.FirstName,
                LastName = u.LastName,
                IsActive = u.IsActive,
                CreatedAtUtc = u.CreatedAtUtc,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList(),
                RoleIds = u.UserRoles.Select(ur => ur.RoleId).ToList()
            })
            .ToListAsync();

        var result = new PagedResult<UserDto>(users, totalCount, pageNumber, pageSize);
        return Ok(ApiResponse<PagedResult<UserDto>>.Ok(result));
    }

    [HttpGet("{id}")]
    [HasPermission("Users.View")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetUserById(Guid id)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound(ApiResponse<UserDto>.Fail("User not found"));
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

        return Ok(ApiResponse<UserDto>.Ok(dto));
    }

    [HttpPost]
    [HasPermission("Users.Create")]
    public async Task<ActionResult<ApiResponse<UserDto>>> CreateUser([FromBody] CreateUserDto request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(ApiResponse<UserDto>.Fail("Username, email, and password are required."));
        }

        var exists = await _context.Users.AnyAsync(u =>
            u.UserName.ToLower() == request.UserName.Trim().ToLower() ||
            u.Email.ToLower() == request.Email.Trim().ToLower());

        if (exists)
        {
            return BadRequest(ApiResponse<UserDto>.Fail("A user with this username or email already exists."));
        }

        var currentUserName = User.Identity?.Name ?? "System";

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
            CreatedBy = currentUserName
        };

        if (request.RoleIds != null && request.RoleIds.Any())
        {
            var validRoleIds = await _context.Roles
                .Where(r => request.RoleIds.Contains(r.Id))
                .Select(r => r.Id)
                .ToListAsync();

            foreach (var roleId in validRoleIds)
            {
                user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
            }
        }

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var roles = await _context.Roles
            .Where(r => user.UserRoles.Select(ur => ur.RoleId).Contains(r.Id))
            .Select(r => r.Name)
            .ToListAsync();

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

        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, ApiResponse<UserDto>.Ok(dto, "User created successfully"));
    }

    [HttpPut("{id}")]
    [HasPermission("Users.Edit")]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateUser(Guid id, [FromBody] UpdateUserDto request)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound(ApiResponse<UserDto>.Fail("User not found"));
        }

        // Check email uniqueness if changed
        if (user.Email.ToLower() != request.Email.Trim().ToLower())
        {
            var emailExists = await _context.Users.AnyAsync(u => u.Id != id && u.Email.ToLower() == request.Email.Trim().ToLower());
            if (emailExists)
            {
                return BadRequest(ApiResponse<UserDto>.Fail("Email is already in use by another user."));
            }
            user.Email = request.Email.Trim();
        }

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.IsActive = request.IsActive;
        user.UpdatedAtUtc = DateTime.UtcNow;
        user.UpdatedBy = User.Identity?.Name ?? "System";

        // If user was deactivated, revoke all active refresh tokens
        if (!user.IsActive)
        {
            var activeTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == user.Id && rt.RevokedAtUtc == null)
                .ToListAsync();

            foreach (var t in activeTokens)
            {
                t.RevokedAtUtc = DateTime.UtcNow;
            }
        }

        // Update roles
        if (request.RoleIds != null)
        {
            _context.UserRoles.RemoveRange(user.UserRoles);

            var validRoleIds = await _context.Roles
                .Where(r => request.RoleIds.Contains(r.Id))
                .Select(r => r.Id)
                .ToListAsync();

            foreach (var roleId in validRoleIds)
            {
                user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
            }
        }

        await _context.SaveChangesAsync();

        var roles = await _context.Roles
            .Where(r => user.UserRoles.Select(ur => ur.RoleId).Contains(r.Id))
            .Select(r => r.Name)
            .ToListAsync();

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

        return Ok(ApiResponse<UserDto>.Ok(dto, "User updated successfully"));
    }

    [HttpPatch("{id}/status")]
    [HasPermission("Users.Edit")]
    public async Task<ActionResult<ApiResponse<bool>>> ToggleUserStatus(Guid id, [FromBody] ToggleStatusDto request)
    {
        var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(currentUserIdStr, out var currentUserId) && currentUserId == id)
        {
            return BadRequest(ApiResponse<bool>.Fail("You cannot change your own active status."));
        }

        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(ApiResponse<bool>.Fail("User not found"));
        }

        user.IsActive = request.IsActive;
        user.UpdatedAtUtc = DateTime.UtcNow;
        user.UpdatedBy = User.Identity?.Name ?? "System";

        if (!user.IsActive)
        {
            var activeTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == user.Id && rt.RevokedAtUtc == null)
                .ToListAsync();

            foreach (var t in activeTokens)
            {
                t.RevokedAtUtc = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(ApiResponse<bool>.Ok(user.IsActive, $"User status updated to {(user.IsActive ? "Active" : "Inactive")}"));
    }

    [HttpDelete("{id}")]
    [HasPermission("Users.Delete")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteUser(Guid id)
    {
        var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(currentUserIdStr, out var currentUserId) && currentUserId == id)
        {
            return BadRequest(ApiResponse<bool>.Fail("You cannot delete your own account."));
        }

        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound(ApiResponse<bool>.Fail("User not found"));
        }

        // Prevent deleting superadmin users
        if (user.UserRoles.Any(ur => ur.Role.Name == "SuperAdmin"))
        {
            return BadRequest(ApiResponse<bool>.Fail("SuperAdmin user accounts cannot be deleted."));
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<bool>.Ok(true, "User deleted successfully"));
    }
}
