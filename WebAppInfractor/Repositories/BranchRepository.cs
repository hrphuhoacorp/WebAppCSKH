using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IBranchRepository : IRepository<Branch>
{
    // Add custom methods for Branch here if needed
}

public class BranchRepository : Repository<Branch>, IBranchRepository
{
    public BranchRepository(MemBerContext context)
        : base(context) { }
}
