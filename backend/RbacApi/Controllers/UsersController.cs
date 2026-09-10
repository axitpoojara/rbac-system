using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Users;
using Rbac.Application.Features.Users;
using RbacApi.Security.Authorization;

namespace RbacApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ISender _mediator;
    private readonly ILogger<UsersController> _logger;

    public UsersController(ISender mediator, ILogger<UsersController> logger)
    {
        _mediator = mediator;
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
        var result = await _mediator.Send(new GetUsersQuery(pageNumber, pageSize, searchTerm, isActive, roleId));
        return Ok(result);
    }

    [HttpGet("{id}")]
    [HasPermission("Users.View")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetUserById(Guid id)
    {
        var result = await _mediator.Send(new GetUserByIdQuery(id));
        if (!result.Success)
        {
            return NotFound(result);
        }
        return Ok(result);
    }

    [HttpPost]
    [HasPermission("Users.Create")]
    public async Task<ActionResult<ApiResponse<UserDto>>> CreateUser([FromBody] CreateUserDto request)
    {
        var createdBy = User.Identity?.Name ?? "System";
        var result = await _mediator.Send(new CreateUserCommand(request, createdBy));
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return CreatedAtAction(nameof(GetUserById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id}")]
    [HasPermission("Users.Edit")]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateUser(Guid id, [FromBody] UpdateUserDto request)
    {
        var updatedBy = User.Identity?.Name ?? "System";
        var result = await _mediator.Send(new UpdateUserCommand(id, request, updatedBy));
        if (!result.Success)
        {
            if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
            {
                return NotFound(result);
            }
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpPatch("{id}/status")]
    [HasPermission("Users.Edit")]
    public async Task<ActionResult<ApiResponse<bool>>> ToggleUserStatus(Guid id, [FromBody] ToggleStatusDto request)
    {
        var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? currentUserId = Guid.TryParse(currentUserIdStr, out var parsedId) ? parsedId : null;
        var updatedBy = User.Identity?.Name ?? "System";

        var result = await _mediator.Send(new ToggleUserStatusCommand(id, request, currentUserId, updatedBy));
        if (!result.Success)
        {
            if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
            {
                return NotFound(result);
            }
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [HasPermission("Users.Delete")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteUser(Guid id)
    {
        var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? currentUserId = Guid.TryParse(currentUserIdStr, out var parsedId) ? parsedId : null;

        var result = await _mediator.Send(new DeleteUserCommand(id, currentUserId));
        if (!result.Success)
        {
            if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
            {
                return NotFound(result);
            }
            return BadRequest(result);
        }
        return Ok(result);
    }
}
