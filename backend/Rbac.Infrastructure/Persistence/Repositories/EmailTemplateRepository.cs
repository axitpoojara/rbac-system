using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Domain.Entities;

namespace Rbac.Infrastructure.Persistence.Repositories;

public class EmailTemplateRepository : Repository<EmailTemplate>, IEmailTemplateRepository
{
    public EmailTemplateRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<EmailTemplate?> GetByTemplateKeyAsync(string templateKey, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FirstOrDefaultAsync(t => t.TemplateKey == templateKey && t.IsActive && !t.IsDeleted, cancellationToken);
    }
}
