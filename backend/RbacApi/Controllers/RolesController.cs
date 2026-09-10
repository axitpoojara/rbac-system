using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Roles;
using Rbac.Application.Features.Roles;
using RbacApi.Security.Authorization;

namespace RbacApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly ISender _mediator;
    private readonly ILogger<RolesController> _logger;

    public RolesController(ISender mediator, ILogger<RolesController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [HttpGet]
    [HasPermission("Roles.View")]
    public async Task<ActionResult<ApiResponse<List<RoleDto>>>> GetRoles()
    {
        var result = await _mediator.Send(new GetRolesQuery());
        return Ok(result);
    }

    [HttpGet("{id}")]
    [HasPermission("Roles.View")]
    public async Task<ActionResult<ApiResponse<RoleDetailDto>>> GetRoleById(Guid id)
    {
        var result = await _mediator.Send(new GetRoleByIdQuery(id));
        if (!result.Success)
        {
            return NotFound(result);
        }
        return Ok(result);
    }

    [HttpPost]
    [HasPermission("Roles.Manage")]
    public async Task<ActionResult<ApiResponse<RoleDetailDto>>> CreateRole([FromBody] CreateRoleDto request)
    {
        var result = await _mediator.Send(new CreateRoleCommand(request));
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return CreatedAtAction(nameof(GetRoleById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id}")]
    [HasPermission("Roles.Manage")]
    public async Task<ActionResult<ApiResponse<RoleDetailDto>>> UpdateRole(Guid id, [FromBody] UpdateRoleDto request)
    {
        var result = await _mediator.Send(new UpdateRoleCommand(id, request));
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
    [HasPermission("Roles.Manage")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteRole(Guid id)
    {
        var result = await _mediator.Send(new DeleteRoleCommand(id));
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
