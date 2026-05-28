using Microsoft.EntityFrameworkCore.Storage;
using WebAppInfractor.Data;

public interface IUnitOfWork : IAsyncDisposable
{
    IRepository<T> Repository<T>()
        where T : class;
    Task<int> SaveChangesAsync();
    Task<IDbContextTransaction> BeginTransactionAsync();
    MemBerContext GetDbContext();
}

public class UnitOfWork : IUnitOfWork
{
    private readonly MemBerContext _context;
    private readonly Dictionary<Type, object> _repositories = new();

    public UnitOfWork(MemBerContext context)
    {
        _context = context;
    }

    public IRepository<T> Repository<T>()
        where T : class
    {
        if (!_repositories.ContainsKey(typeof(T)))
        {
            var repositoryInstance = new Repository<T>(_context);
            _repositories[typeof(T)] = repositoryInstance;
        }
        return (IRepository<T>)_repositories[typeof(T)];
    }

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();

    public async Task<IDbContextTransaction> BeginTransactionAsync()
    {
        return await _context.Database.BeginTransactionAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await _context.DisposeAsync();
    }

    public MemBerContext GetDbContext() => _context;
}
