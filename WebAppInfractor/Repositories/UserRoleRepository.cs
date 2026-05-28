using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IUserRoleRepository : IRepository<UserRole>
{
    // Add custom methods for UserRole here if needed
}

public class UserRoleRepository : Repository<UserRole>, IUserRoleRepository
{
    public UserRoleRepository(MemBerContext context)
        : base(context) { }
}
