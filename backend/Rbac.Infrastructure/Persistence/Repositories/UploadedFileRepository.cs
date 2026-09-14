using Microsoft.EntityFrameworkCore;
using Rbac.Application.Common.Interfaces.Repositories;
using Rbac.Domain.Entities;

namespace Rbac.Infrastructure.Persistence.Repositories;

public class UploadedFileRepository : Repository<UploadedFile>, IUploadedFileRepository
{
    public UploadedFileRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<UploadedFile?> GetActiveFileByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted, cancellationToken);
    }
}
