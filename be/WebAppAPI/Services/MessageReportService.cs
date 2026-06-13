using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models;

public interface IMessageReportService
{
    Task<List<MessageReportDTO>> GetListAsync(MessageReportFilter filter);
    Task<MessageReportDTO> CreateAsync(MessageReportCreateDTO dto, int userId);
    Task DeleteAsync(int id);
}

public class MessageReportService : IMessageReportService
{
    private readonly IMessageReportRepository _repo;
    private readonly IUnitOfWork _unitOfWork;

    public MessageReportService(IMessageReportRepository repo, IUnitOfWork unitOfWork)
    {
        _repo = repo;
        _unitOfWork = unitOfWork;
    }

    public async Task<List<MessageReportDTO>> GetListAsync(MessageReportFilter filter)
    {
        var query = _repo.GetAll().Include(x => x.CreatedByNavigation).AsNoTracking();

        if (filter.Month.HasValue)
            query = query.Where(x => x.ReportDate.Month == filter.Month.Value);

        if (filter.Year.HasValue)
            query = query.Where(x => x.ReportDate.Year == filter.Year.Value);

        if (!string.IsNullOrWhiteSpace(filter.Type))
            query = query.Where(x => x.Type == filter.Type);

        var items = await query
            .OrderByDescending(x => x.ReportDate)
            .ThenBy(x => x.Type)
            .ToListAsync();

        return items
            .Select(x => new MessageReportDTO
            {
                Id = x.Id,
                ReportDate = x.ReportDate,
                Type = x.Type,
                Count = x.Count,
                Note = x.Note,
                CreatedByName = x.CreatedByNavigation?.Name,
                CreatedAt = x.CreatedAt,
            })
            .ToList();
    }

    public async Task<MessageReportDTO> CreateAsync(MessageReportCreateDTO dto, int userId)
    {
        var entity = new MessageReport
        {
            ReportDate = dto.ReportDate,
            Type = dto.Type,
            Count = dto.Count,
            Note = dto.Note,
            CreatedBy = userId,
        };

        await _repo.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        return new MessageReportDTO
        {
            Id = entity.Id,
            ReportDate = entity.ReportDate,
            Type = entity.Type,
            Count = entity.Count,
            Note = entity.Note,
            CreatedByName = null,
            CreatedAt = entity.CreatedAt,
        };
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null)
            throw new NotFoundException("Không tìm thấy bản ghi");

        await _repo.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
    }
}
