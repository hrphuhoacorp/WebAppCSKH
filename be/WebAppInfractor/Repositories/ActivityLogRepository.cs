using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IActivityLogRepository : IRepository<ActivityLog>
{
    // Add custom methods for ActivityLog here if needed
}

public class ActivityLogRepository : Repository<ActivityLog>, IActivityLogRepository
{
    public ActivityLogRepository(MemBerContext context)
        : base(context) { }
}
