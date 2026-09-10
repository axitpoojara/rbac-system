using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Menus;
using Rbac.Application.Features.Menus;
using RbacApi.Security.Authorization;

namespace RbacApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MenusController : ControllerBase
{
    private readonly ISender _mediator;

    public MenusController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("nav")]
    public async Task<ActionResult<ApiResponse<List<NavMenuItemDto>>>> GetNavMenu()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(ApiResponse<List<NavMenuItemDto>>.Fail("Invalid session"));
        }

        var isSuperAdmin = User.IsInRole("SuperAdmin");
        var result = await _mediator.Send(new GetUserNavMenusQuery(userId, isSuperAdmin));
        return Ok(result);
    }

    [HttpGet]
    [HasPermission("Menus.View")]
    public async Task<ActionResult<ApiResponse<List<MenuDto>>>> GetAllMenus()
    {
        var result = await _mediator.Send(new GetMenusQuery());
        return Ok(result);
    }

    [HttpPost]
    [HasPermission("Menus.Manage")]
    public async Task<ActionResult<ApiResponse<MenuDto>>> CreateMenu([FromBody] CreateMenuDto request)
    {
        var result = await _mediator.Send(new CreateMenuCommand(request));
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpPut("{id}")]
    [HasPermission("Menus.Manage")]
    public async Task<ActionResult<ApiResponse<MenuDto>>> UpdateMenu(Guid id, [FromBody] UpdateMenuDto request)
    {
        var result = await _mediator.Send(new UpdateMenuCommand(id, request));
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
    [HasPermission("Menus.Manage")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteMenu(Guid id)
    {
        var result = await _mediator.Send(new DeleteMenuCommand(id));
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
