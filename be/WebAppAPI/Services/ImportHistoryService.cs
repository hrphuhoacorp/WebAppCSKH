using Microsoft.EntityFrameworkCore;

public interface IImportHistoryService
{
    Task<PagedResult<ImportHistoryDTO>> GetAllImportHistoryAsync(ImportHistoryFilterDTO filter);
}

public class ImportHistoryService : IImportHistoryService
{
    private readonly IImportsHistoryRepository _importHistoryRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ImportHistoryService(
        IImportsHistoryRepository importHistoryRepository,
        IUserRepository userRepository,
        IUnitOfWork unitOfWork
    )
    {
        _importHistoryRepository = importHistoryRepository;
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<PagedResult<ImportHistoryDTO>> GetAllImportHistoryAsync(
        ImportHistoryFilterDTO filter
    )
    {
        var query = _importHistoryRepository.GetAll().AsNoTracking();

        if (!string.IsNullOrEmpty(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(i =>
                i.User.Name.ToLower().Contains(search) || i.FileName.ToLower().Contains(search)
            );
        }
        if (!string.IsNullOrEmpty(filter.Status))
        {
            query = query.Where(i => i.Status == filter.Status);
        }

        if (filter.FromDate.HasValue && filter.ToDate.HasValue)
        {
            if (filter.FromDate.Value > filter.ToDate.Value)
                throw new BadRequestException("Ngày Bắt Đầu phải nhỏ hơn Ngày Kết Thúc");
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(i => i.ImportDate >= filter.FromDate.Value);
        }
        if (filter.ToDate.HasValue)
        {
            query = query.Where(i => i.ImportDate <= filter.ToDate.Value);
        }
        var totalItems = await query.CountAsync();

        var importHistories = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(i => new ImportHistoryDTO
            {
                Id = i.Id,
                FileName = i.FileName,
                ImportBy = i.User.Name,
                Status = i.Status,
                SuccessCount = i.SuccessCount,
                ErrorCount = i.ErrorCount,
                ImportDate = i.ImportDate,
                RollbackAt = i.RollbackAt,
                RollbackBy = i.RollbackBy.HasValue
                    ? _userRepository
                        .GetAll()
                        .Where(u => u.Id == i.RollbackBy)
                        .Select(u => u.Name)
                        .FirstOrDefault()
                    : null,
            })
            .ToListAsync();
        return new PagedResult<ImportHistoryDTO>
        {
            Items = importHistories,
            TotalItems = totalItems,
            Page = filter.Page,
            PageSize = filter.PageSize,
        };
    }
}
