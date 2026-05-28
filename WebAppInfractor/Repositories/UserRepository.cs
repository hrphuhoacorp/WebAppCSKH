using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IUserRepository : IRepository<User>
{
    // Add custom methods for User here if needed
}

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(MemBerContext context)
        : base(context) { }
}
