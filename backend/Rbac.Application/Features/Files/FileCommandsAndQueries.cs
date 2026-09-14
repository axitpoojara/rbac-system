using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.Files;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.Files;

// 1. Get Files Query
public record GetFilesQuery(int PageNumber = 1, int PageSize = 10, string? SearchTerm = null)
    : IRequest<ApiResponse<PagedResult<FileItemDto>>>;

public class GetFilesQueryHandler : IRequestHandler<GetFilesQuery, ApiResponse<PagedResult<FileItemDto>>>
{
    private readonly IAppDbContext _context;

    public GetFilesQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<PagedResult<FileItemDto>>> Handle(GetFilesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.UploadedFiles.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            query = query.Where(f => f.OriginalFileName.ToLower().Contains(term) || f.UploadedByUserName.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var files = await query
            .OrderByDescending(f => f.CreatedAtUtc)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(f => new FileItemDto
            {
                Id = f.Id,
                OriginalFileName = f.OriginalFileName,
                ContentType = f.ContentType,
                FileSize = f.FileSize,
                UploadedByUserId = f.UploadedByUserId,
                UploadedByUserName = f.UploadedByUserName,
                CreatedAtUtc = f.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var result = new PagedResult<FileItemDto>(files, totalCount, request.PageNumber, request.PageSize);
        return ApiResponse<PagedResult<FileItemDto>>.Ok(result);
    }
}

// 2. Upload File Command
public record UploadFileCommand(
    Stream FileStream,
    string OriginalFileName,
    string ContentType,
    long FileSize,
    Guid UploadedByUserId,
    string UploadedByUserName,
    string StorageDirectory) : IRequest<ApiResponse<FileItemDto>>;

public class UploadFileCommandHandler : IRequestHandler<UploadFileCommand, ApiResponse<FileItemDto>>
{
    private readonly IAppDbContext _context;

    public UploadFileCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<FileItemDto>> Handle(UploadFileCommand command, CancellationToken cancellationToken)
    {
        if (command.FileStream == null || command.FileSize <= 0)
        {
            return ApiResponse<FileItemDto>.Fail("No file or empty file provided.");
        }

        // Limit size to 25 MB
        const long maxSizeBytes = 25 * 1024 * 1024;
        if (command.FileSize > maxSizeBytes)
        {
            return ApiResponse<FileItemDto>.Fail("File size exceeds 25 MB limit.");
        }

        // Ensure storage directory exists
        if (!Directory.Exists(command.StorageDirectory))
        {
            Directory.CreateDirectory(command.StorageDirectory);
        }

        var safeOriginalName = Path.GetFileName(command.OriginalFileName);
        var extension = Path.GetExtension(safeOriginalName);
        var fileId = Guid.NewGuid();
        var storedFileName = $"{fileId}_{DateTime.UtcNow.Ticks}{extension}";
        var physicalPath = Path.Combine(command.StorageDirectory, storedFileName);

        // Save physical file
        using (var destStream = new FileStream(physicalPath, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            await command.FileStream.CopyToAsync(destStream, cancellationToken);
        }

        var uploadedFile = new UploadedFile
        {
            Id = fileId,
            OriginalFileName = safeOriginalName,
            StoredFileName = storedFileName,
            ContentType = string.IsNullOrWhiteSpace(command.ContentType) ? "application/octet-stream" : command.ContentType,
            FileSize = command.FileSize,
            UploadedByUserId = command.UploadedByUserId,
            UploadedByUserName = command.UploadedByUserName,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.UploadedFiles.Add(uploadedFile);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new FileItemDto
        {
            Id = uploadedFile.Id,
            OriginalFileName = uploadedFile.OriginalFileName,
            ContentType = uploadedFile.ContentType,
            FileSize = uploadedFile.FileSize,
            UploadedByUserId = uploadedFile.UploadedByUserId,
            UploadedByUserName = uploadedFile.UploadedByUserName,
            CreatedAtUtc = uploadedFile.CreatedAtUtc
        };

        return ApiResponse<FileItemDto>.Ok(dto, "File uploaded successfully");
    }
}

// 3. Download File Query
public record DownloadFileQuery(Guid Id, string StorageDirectory) : IRequest<ApiResponse<FileDownloadDto>>;

public class DownloadFileQueryHandler : IRequestHandler<DownloadFileQuery, ApiResponse<FileDownloadDto>>
{
    private readonly IAppDbContext _context;

    public DownloadFileQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<FileDownloadDto>> Handle(DownloadFileQuery request, CancellationToken cancellationToken)
    {
        var fileRecord = await _context.UploadedFiles
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == request.Id, cancellationToken);

        if (fileRecord == null)
        {
            return ApiResponse<FileDownloadDto>.Fail("File metadata not found in database.");
        }

        var physicalPath = Path.Combine(request.StorageDirectory, fileRecord.StoredFileName);
        if (!File.Exists(physicalPath))
        {
            return ApiResponse<FileDownloadDto>.Fail("Physical file was not found on the server.");
        }

        var fileStream = new FileStream(physicalPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        var result = new FileDownloadDto
        {
            Stream = fileStream,
            ContentType = fileRecord.ContentType,
            OriginalFileName = fileRecord.OriginalFileName
        };

        return ApiResponse<FileDownloadDto>.Ok(result);
    }
}

// 4. Delete File Command
public record DeleteFileCommand(Guid Id, string StorageDirectory, string? CurrentUserName = null) : IRequest<ApiResponse<bool>>;

public class DeleteFileCommandHandler : IRequestHandler<DeleteFileCommand, ApiResponse<bool>>
{
    private readonly IAppDbContext _context;

    public DeleteFileCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<bool>> Handle(DeleteFileCommand command, CancellationToken cancellationToken)
    {
        var fileRecord = await _context.UploadedFiles
            .FirstOrDefaultAsync(f => f.Id == command.Id, cancellationToken);

        if (fileRecord == null)
        {
            return ApiResponse<bool>.Fail("File not found.");
        }

        // Soft delete: Physical file is retained on disk for auditing and compliance
        fileRecord.IsDeleted = true;
        fileRecord.DeletedAtUtc = DateTime.UtcNow;
        fileRecord.DeletedBy = command.CurrentUserName ?? "Admin";

        _context.AuditLogs.Add(new Domain.Entities.AuditLog
        {
            Id = Guid.NewGuid(),
            UserName = command.CurrentUserName ?? "Admin",
            Action = "SoftDelete",
            EntityName = "UploadedFile",
            EntityId = fileRecord.Id.ToString(),
            TimestampUtc = DateTime.UtcNow,
            Details = $"File '{fileRecord.OriginalFileName}' ({fileRecord.ContentType}) was soft-deleted."
        });

        await _context.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "File deleted successfully");
    }
}
