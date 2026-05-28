using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IImportsHistoryRepository : IRepository<ImportsHistory>
{
    // Add custom methods for ImportsHistory here if needed
}

public class ImportsHistoryRepository : Repository<ImportsHistory>, IImportsHistoryRepository
{
    public ImportsHistoryRepository(MemBerContext context)
        : base(context) { }
}
