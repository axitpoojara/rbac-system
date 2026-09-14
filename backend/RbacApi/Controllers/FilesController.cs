using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Files;
using Rbac.Application.Features.Files;
using RbacApi.Security.Authorization;

namespace RbacApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly ISender _mediator;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<FilesController> _logger;

    public FilesController(ISender mediator, IWebHostEnvironment environment, ILogger<FilesController> logger)
    {
        _mediator = mediator;
        _environment = environment;
        _logger = logger;
    }

    private string StorageDirectory => Path.Combine(_environment.ContentRootPath, "Uploads");

    [HttpGet]
    [HasPermission("Files.View")]
    public async Task<ActionResult<ApiResponse<PagedResult<FileItemDto>>>> GetFiles(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? searchTerm = null)
    {
        var result = await _mediator.Send(new GetFilesQuery(pageNumber, pageSize, searchTerm));
        return Ok(result);
    }

    [HttpPost("upload")]
    [HasPermission("Files.Upload")]
    [RequestSizeLimit(30 * 1024 * 1024)] // 30 MB
    public async Task<ActionResult<ApiResponse<FileItemDto>>> UploadFile([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<FileItemDto>.Fail("Please select a valid file to upload."));
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userId = Guid.TryParse(userIdClaim, out var parsedId) ? parsedId : Guid.Empty;
        var userName = User.Identity?.Name ?? "User";

        using var stream = file.OpenReadStream();
        var command = new UploadFileCommand(
            stream,
            file.FileName,
            file.ContentType,
            file.Length,
            userId,
            userName,
            StorageDirectory);

        var result = await _mediator.Send(command);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpGet("{id}/download")]
    [HasPermission("Files.Download")]
    public async Task<IActionResult> DownloadFile(Guid id)
    {
        var result = await _mediator.Send(new DownloadFileQuery(id, StorageDirectory));
        if (!result.Success || result.Data == null)
        {
            return NotFound(result);
        }

        var fileData = result.Data;
        return File(fileData.Stream, fileData.ContentType, fileData.OriginalFileName);
    }

    [HttpDelete("{id}")]
    [HasPermission("Files.Delete")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteFile(Guid id)
    {
        var currentUserName = User.Identity?.Name ?? "Admin";
        var result = await _mediator.Send(new DeleteFileCommand(id, StorageDirectory, currentUserName));
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }
}
