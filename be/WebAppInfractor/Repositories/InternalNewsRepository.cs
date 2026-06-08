using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IInternalNewsRepository : IRepository<InternalNews>
{
    // Add custom methods for InternalNews here if needed
}

public class InternalNewsRepository : Repository<InternalNews>, IInternalNewsRepository
{
    public InternalNewsRepository(MemBerContext context)
        : base(context) { }
}
