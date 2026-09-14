using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.EmailTemplates;
using Rbac.Application.Features.EmailTemplates;
using RbacApi.Security.Authorization;

namespace RbacApi.Controllers;

[ApiController]
[Route("api/email-templates")]
[Authorize]
public class EmailTemplatesController : ControllerBase
{
    private readonly ISender _mediator;
    private readonly ILogger<EmailTemplatesController> _logger;

    public EmailTemplatesController(ISender mediator, ILogger<EmailTemplatesController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [HttpGet]
    [HasPermission("EmailTemplates.View")]
    public async Task<ActionResult<ApiResponse<List<EmailTemplateDto>>>> GetEmailTemplates()
    {
        var result = await _mediator.Send(new GetEmailTemplatesQuery());
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [HasPermission("EmailTemplates.View")]
    public async Task<ActionResult<ApiResponse<EmailTemplateDto>>> GetEmailTemplateById(Guid id)
    {
        var result = await _mediator.Send(new GetEmailTemplateByIdQuery(id));
        if (!result.Success)
        {
            return NotFound(result);
        }
        return Ok(result);
    }

    [HttpPost]
    [HasPermission("EmailTemplates.Create")]
    public async Task<ActionResult<ApiResponse<EmailTemplateDto>>> CreateEmailTemplate([FromBody] CreateEmailTemplateDto request)
    {
        var currentUser = User.Identity?.Name ?? "System";
        var result = await _mediator.Send(new CreateEmailTemplateCommand(request, currentUser));
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return CreatedAtAction(nameof(GetEmailTemplateById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [HasPermission("EmailTemplates.Update")]
    public async Task<ActionResult<ApiResponse<EmailTemplateDto>>> UpdateEmailTemplate(Guid id, [FromBody] UpdateEmailTemplateDto request)
    {
        var currentUser = User.Identity?.Name ?? "System";
        var result = await _mediator.Send(new UpdateEmailTemplateCommand(id, request, currentUser));
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [HasPermission("EmailTemplates.Delete")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteEmailTemplate(Guid id)
    {
        var currentUser = User.Identity?.Name ?? "System";
        var result = await _mediator.Send(new DeleteEmailTemplateCommand(id, currentUser));
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpPost("send-test")]
    [HasPermission("EmailTemplates.Update")]
    public async Task<ActionResult<ApiResponse<bool>>> SendTestEmail([FromBody] SendTestEmailDto request)
    {
        var result = await _mediator.Send(new SendTestEmailCommand(request));
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }
}
