namespace Rbac.Application.DTOs.EmailTemplates;

public class EmailTemplateDto
{
    public Guid Id { get; set; }
    public string TemplateKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public string AvailableVariables { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsSystemTemplate { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public string? UpdatedBy { get; set; }
}

public class CreateEmailTemplateDto
{
    public string TemplateKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public string AvailableVariables { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class UpdateEmailTemplateDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public string AvailableVariables { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class SendTestEmailDto
{
    public string RecipientEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public Dictionary<string, string>? SampleData { get; set; }
}
