using System.Text.RegularExpressions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Application.DTOs.Common;
using Rbac.Application.DTOs.EmailTemplates;
using Rbac.Domain.Entities;

namespace Rbac.Application.Features.EmailTemplates;

// 1. Get All Email Templates
public record GetEmailTemplatesQuery : IRequest<ApiResponse<List<EmailTemplateDto>>>;

public class GetEmailTemplatesQueryHandler : IRequestHandler<GetEmailTemplatesQuery, ApiResponse<List<EmailTemplateDto>>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetEmailTemplatesQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<List<EmailTemplateDto>>> Handle(GetEmailTemplatesQuery request, CancellationToken cancellationToken)
    {
        var templates = await _unitOfWork.EmailTemplates.Query(asNoTracking: true)
            .OrderBy(t => t.IsSystemTemplate ? 0 : 1)
            .ThenBy(t => t.Name)
            .Select(t => new EmailTemplateDto
            {
                Id = t.Id,
                TemplateKey = t.TemplateKey,
                Name = t.Name,
                Description = t.Description,
                Subject = t.Subject,
                BodyHtml = t.BodyHtml,
                AvailableVariables = t.AvailableVariables,
                IsActive = t.IsActive,
                IsSystemTemplate = t.IsSystemTemplate,
                CreatedAtUtc = t.CreatedAtUtc,
                CreatedBy = t.CreatedBy,
                UpdatedAtUtc = t.UpdatedAtUtc,
                UpdatedBy = t.UpdatedBy
            })
            .ToListAsync(cancellationToken);

        return ApiResponse<List<EmailTemplateDto>>.Ok(templates);
    }
}

// 2. Get Email Template By Id
public record GetEmailTemplateByIdQuery(Guid Id) : IRequest<ApiResponse<EmailTemplateDto>>;

public class GetEmailTemplateByIdQueryHandler : IRequestHandler<GetEmailTemplateByIdQuery, ApiResponse<EmailTemplateDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetEmailTemplateByIdQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<EmailTemplateDto>> Handle(GetEmailTemplateByIdQuery request, CancellationToken cancellationToken)
    {
        var template = await _unitOfWork.EmailTemplates.GetByIdAsync(request.Id, cancellationToken);

        if (template == null)
        {
            return ApiResponse<EmailTemplateDto>.Fail("Email template not found.");
        }

        var dto = new EmailTemplateDto
        {
            Id = template.Id,
            TemplateKey = template.TemplateKey,
            Name = template.Name,
            Description = template.Description,
            Subject = template.Subject,
            BodyHtml = template.BodyHtml,
            AvailableVariables = template.AvailableVariables,
            IsActive = template.IsActive,
            IsSystemTemplate = template.IsSystemTemplate,
            CreatedAtUtc = template.CreatedAtUtc,
            CreatedBy = template.CreatedBy,
            UpdatedAtUtc = template.UpdatedAtUtc,
            UpdatedBy = template.UpdatedBy
        };

        return ApiResponse<EmailTemplateDto>.Ok(dto);
    }
}

// 3. Create Email Template
public record CreateEmailTemplateCommand(CreateEmailTemplateDto Dto, string? CurrentUser = null) 
    : IRequest<ApiResponse<EmailTemplateDto>>;

public class CreateEmailTemplateCommandHandler : IRequestHandler<CreateEmailTemplateCommand, ApiResponse<EmailTemplateDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateEmailTemplateCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<EmailTemplateDto>> Handle(CreateEmailTemplateCommand command, CancellationToken cancellationToken)
    {
        var dto = command.Dto;
        if (string.IsNullOrWhiteSpace(dto.TemplateKey))
        {
            return ApiResponse<EmailTemplateDto>.Fail("Template key is required.");
        }
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return ApiResponse<EmailTemplateDto>.Fail("Template name is required.");
        }
        if (string.IsNullOrWhiteSpace(dto.Subject))
        {
            return ApiResponse<EmailTemplateDto>.Fail("Subject is required.");
        }
        if (string.IsNullOrWhiteSpace(dto.BodyHtml))
        {
            return ApiResponse<EmailTemplateDto>.Fail("Email body HTML is required.");
        }

        var cleanKey = dto.TemplateKey.Trim();
        var exists = await _unitOfWork.EmailTemplates.AnyAsync(
            t => t.TemplateKey.ToLower() == cleanKey.ToLower() && !t.IsDeleted, cancellationToken);

        if (exists)
        {
            return ApiResponse<EmailTemplateDto>.Fail($"A template with key '{cleanKey}' already exists.");
        }

        var template = new EmailTemplate
        {
            Id = Guid.NewGuid(),
            TemplateKey = cleanKey,
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim() ?? string.Empty,
            Subject = dto.Subject.Trim(),
            BodyHtml = dto.BodyHtml,
            AvailableVariables = dto.AvailableVariables?.Trim() ?? string.Empty,
            IsActive = dto.IsActive,
            IsSystemTemplate = false,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = command.CurrentUser ?? "System"
        };

        await _unitOfWork.EmailTemplates.AddAsync(template, cancellationToken);

        await _unitOfWork.AuditLogs.LogAsync(
            command.CurrentUser ?? "System",
            "CREATE",
            "EmailTemplate",
            template.Id.ToString(),
            $"Created email template '{template.Name}' ({template.TemplateKey})",
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var resultDto = new EmailTemplateDto
        {
            Id = template.Id,
            TemplateKey = template.TemplateKey,
            Name = template.Name,
            Description = template.Description,
            Subject = template.Subject,
            BodyHtml = template.BodyHtml,
            AvailableVariables = template.AvailableVariables,
            IsActive = template.IsActive,
            IsSystemTemplate = template.IsSystemTemplate,
            CreatedAtUtc = template.CreatedAtUtc,
            CreatedBy = template.CreatedBy
        };

        return ApiResponse<EmailTemplateDto>.Ok(resultDto, "Email template created successfully.");
    }
}

// 4. Update Email Template
public record UpdateEmailTemplateCommand(Guid Id, UpdateEmailTemplateDto Dto, string? CurrentUser = null) 
    : IRequest<ApiResponse<EmailTemplateDto>>;

public class UpdateEmailTemplateCommandHandler : IRequestHandler<UpdateEmailTemplateCommand, ApiResponse<EmailTemplateDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public UpdateEmailTemplateCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<EmailTemplateDto>> Handle(UpdateEmailTemplateCommand command, CancellationToken cancellationToken)
    {
        var template = await _unitOfWork.EmailTemplates.GetByIdAsync(command.Id, cancellationToken);

        if (template == null)
        {
            return ApiResponse<EmailTemplateDto>.Fail("Email template not found.");
        }

        var dto = command.Dto;
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return ApiResponse<EmailTemplateDto>.Fail("Template name is required.");
        }
        if (string.IsNullOrWhiteSpace(dto.Subject))
        {
            return ApiResponse<EmailTemplateDto>.Fail("Subject is required.");
        }
        if (string.IsNullOrWhiteSpace(dto.BodyHtml))
        {
            return ApiResponse<EmailTemplateDto>.Fail("Email body HTML is required.");
        }

        template.Name = dto.Name.Trim();
        template.Description = dto.Description?.Trim() ?? string.Empty;
        template.Subject = dto.Subject.Trim();
        template.BodyHtml = dto.BodyHtml;
        template.AvailableVariables = dto.AvailableVariables?.Trim() ?? string.Empty;
        template.IsActive = dto.IsActive;
        template.UpdatedAtUtc = DateTime.UtcNow;
        template.UpdatedBy = command.CurrentUser ?? "System";

        _unitOfWork.EmailTemplates.Update(template);

        await _unitOfWork.AuditLogs.LogAsync(
            command.CurrentUser ?? "System",
            "UPDATE",
            "EmailTemplate",
            template.Id.ToString(),
            $"Updated email template '{template.Name}' ({template.TemplateKey})",
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var resultDto = new EmailTemplateDto
        {
            Id = template.Id,
            TemplateKey = template.TemplateKey,
            Name = template.Name,
            Description = template.Description,
            Subject = template.Subject,
            BodyHtml = template.BodyHtml,
            AvailableVariables = template.AvailableVariables,
            IsActive = template.IsActive,
            IsSystemTemplate = template.IsSystemTemplate,
            CreatedAtUtc = template.CreatedAtUtc,
            CreatedBy = template.CreatedBy,
            UpdatedAtUtc = template.UpdatedAtUtc,
            UpdatedBy = template.UpdatedBy
        };

        return ApiResponse<EmailTemplateDto>.Ok(resultDto, "Email template updated successfully.");
    }
}

// 5. Delete Email Template (Soft Delete)
public record DeleteEmailTemplateCommand(Guid Id, string? CurrentUser = null) 
    : IRequest<ApiResponse<bool>>;

public class DeleteEmailTemplateCommandHandler : IRequestHandler<DeleteEmailTemplateCommand, ApiResponse<bool>>
{
    private readonly IUnitOfWork _unitOfWork;

    public DeleteEmailTemplateCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<bool>> Handle(DeleteEmailTemplateCommand command, CancellationToken cancellationToken)
    {
        var template = await _unitOfWork.EmailTemplates.GetByIdAsync(command.Id, cancellationToken);

        if (template == null)
        {
            return ApiResponse<bool>.Fail("Email template not found.");
        }

        if (template.IsSystemTemplate)
        {
            return ApiResponse<bool>.Fail("System default email templates cannot be deleted.");
        }

        template.IsDeleted = true;
        template.DeletedAtUtc = DateTime.UtcNow;
        template.DeletedBy = command.CurrentUser ?? "System";

        _unitOfWork.EmailTemplates.Update(template);

        await _unitOfWork.AuditLogs.LogAsync(
            command.CurrentUser ?? "System",
            "DELETE",
            "EmailTemplate",
            template.Id.ToString(),
            $"Deleted email template '{template.Name}' ({template.TemplateKey})",
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ApiResponse<bool>.Ok(true, "Email template deleted successfully.");
    }
}

// 6. Send Test Email
public record SendTestEmailCommand(SendTestEmailDto Dto) : IRequest<ApiResponse<bool>>;

public class SendTestEmailCommandHandler : IRequestHandler<SendTestEmailCommand, ApiResponse<bool>>
{
    private readonly IEmailService _emailService;

    public SendTestEmailCommandHandler(IEmailService emailService)
    {
        _emailService = emailService;
    }

    public async Task<ApiResponse<bool>> Handle(SendTestEmailCommand command, CancellationToken cancellationToken)
    {
        var dto = command.Dto;
        if (string.IsNullOrWhiteSpace(dto.RecipientEmail))
        {
            return ApiResponse<bool>.Fail("Recipient email is required.");
        }
        if (string.IsNullOrWhiteSpace(dto.Subject))
        {
            return ApiResponse<bool>.Fail("Subject is required.");
        }
        if (string.IsNullOrWhiteSpace(dto.BodyHtml))
        {
            return ApiResponse<bool>.Fail("Email body HTML is required.");
        }

        var samplePlaceholders = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "UserName", "Alex Morgan" },
            { "Email", dto.RecipientEmail.Trim() },
            { "TempPassword", "Sample#Pass99" },
            { "ExpirationMinutes", "30" },
            { "ResetLink", "http://localhost:4200/reset-password?token=sample_test_token" },
            { "PortalUrl", "http://localhost:4200" },
            { "LoginUrl", "http://localhost:4200/login" },
            { "CompanyName", "Enterprise RBAC" }
        };

        if (dto.SampleData != null)
        {
            foreach (var kvp in dto.SampleData)
            {
                samplePlaceholders[kvp.Key] = kvp.Value;
            }
        }

        var subject = dto.Subject;
        var bodyHtml = dto.BodyHtml;

        foreach (var kvp in samplePlaceholders)
        {
            var pattern = @"\{\{\s*" + Regex.Escape(kvp.Key) + @"\s*\}\}";
            subject = Regex.Replace(subject, pattern, kvp.Value ?? string.Empty, RegexOptions.IgnoreCase);
            bodyHtml = Regex.Replace(bodyHtml, pattern, kvp.Value ?? string.Empty, RegexOptions.IgnoreCase);
        }

        var success = await _emailService.SendRawEmailAsync(
            dto.RecipientEmail.Trim(), 
            "[TEST EMAIL] " + subject, 
            bodyHtml, 
            cancellationToken);

        if (!success)
        {
            return ApiResponse<bool>.Fail("Failed to send test email. Please verify your SMTP credentials in appsettings.json.");
        }

        return ApiResponse<bool>.Ok(true, $"Test email successfully sent to {dto.RecipientEmail.Trim()}.");
    }
}
