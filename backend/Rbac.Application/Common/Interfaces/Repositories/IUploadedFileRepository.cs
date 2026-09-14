using Rbac.Domain.Entities;

namespace Rbac.Application.Common.Interfaces.Repositories;

public interface IUploadedFileRepository : IRepository<UploadedFile>
{
    Task<UploadedFile?> GetActiveFileByIdAsync(Guid id, CancellationToken cancellationToken = default);
}
