using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IPermissionRepository : IRepository<Permission> { }

public class PermissionRepository : Repository<Permission>, IPermissionRepository
{
    public PermissionRepository(MemBerContext context) : base(context) { }
}

public interface IUserPermissionRepository : IRepository<UserPermission> { }

public class UserPermissionRepository : Repository<UserPermission>, IUserPermissionRepository
{
    public UserPermissionRepository(MemBerContext context) : base(context) { }
}
