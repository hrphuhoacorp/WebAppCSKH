using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IRoleRepository : IRepository<Role>
{
    // Add custom methods for Role here if needed
}

public class RoleRepository : Repository<Role>, IRoleRepository
{
    public RoleRepository(MemBerContext context)
        : base(context) { }
}
