using Rbac.Domain.Common;

namespace Rbac.Domain.Entities;

public class EmailTemplate : ISoftDelete
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string TemplateKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public string AvailableVariables { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool IsSystemTemplate { get; set; } = false;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public string? UpdatedBy { get; set; }

    // Soft delete
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAtUtc { get; set; }
    public string? DeletedBy { get; set; }
}
