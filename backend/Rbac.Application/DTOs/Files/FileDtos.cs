namespace Rbac.Application.DTOs.Files;

public class FileItemDto
{
    public Guid Id { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public Guid UploadedByUserId { get; set; }
    public string UploadedByUserName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }

    public string Extension => Path.GetExtension(OriginalFileName).ToLowerInvariant();

    public string FormattedSize
    {
        get
        {
            if (FileSize < 1024) return $"{FileSize} B";
            if (FileSize < 1024 * 1024) return $"{FileSize / 1024.0:F1} KB";
            if (FileSize < 1024 * 1024 * 1024) return $"{FileSize / (1024.0 * 1024.0):F2} MB";
            return $"{FileSize / (1024.0 * 1024.0 * 1024.0):F2} GB";
        }
    }
}

public class FileDownloadDto
{
    public Stream Stream { get; set; } = null!;
    public string ContentType { get; set; } = "application/octet-stream";
    public string OriginalFileName { get; set; } = string.Empty;
}
