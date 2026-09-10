using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Permissions;
using Rbac.Application.Features.Permissions;
using RbacApi.Security.Authorization;

namespace RbacApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PermissionsController : ControllerBase
{
    private readonly ISender _mediator;

    public PermissionsController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission("Permissions.View")]
    public async Task<ActionResult<ApiResponse<List<PermissionDto>>>> GetAllPermissions()
    {
        var result = await _mediator.Send(new GetPermissionsQuery());
        return Ok(result);
    }

    [HttpGet("grouped")]
    [HasPermission("Permissions.View")]
    public async Task<ActionResult<ApiResponse<List<ModulePermissionsDto>>>> GetGroupedPermissions()
    {
        var result = await _mediator.Send(new GetGroupedPermissionsQuery());
        return Ok(result);
    }

    [HttpPost]
    [HasPermission("Permissions.Manage")]
    public async Task<ActionResult<ApiResponse<PermissionDto>>> CreatePermission([FromBody] CreatePermissionDto request)
    {
        var result = await _mediator.Send(new CreatePermissionCommand(request));
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }
}
