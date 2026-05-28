using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Data;

// using dotnet03_Ebay.Infrastructure.Models.EbayContext;

public interface IRepository<T>
    where T : class
{
    IQueryable<T> GetAll();
    Task<IEnumerable<T>> GetAllAsync();
    Task<T?> GetByIdAsync(int id);
    Task AddAsync(T entity);
    Task Update(T entity);
    Task DeleteAsync(int id);
    void RemoveRange(IEnumerable<T> entities);
    Task DeleteAsync(T entity);
    Task<T?> SingleOrDefaultAsync(Expression<Func<T, bool>> predicate);
    Task<IEnumerable<T>> WhereAsync(Expression<Func<T, bool>> predicate);
    IQueryable<T> Query();
}

public class Repository<T> : IRepository<T>
    where T : class
{
    protected readonly MemBerContext _context;
    protected readonly DbSet<T> _dbSet;

    public Repository(MemBerContext context)
    {
        _context = context;
        _dbSet = _context.Set<T>();
    }

    public async Task<IEnumerable<T>> GetAllAsync() => await _dbSet.AsNoTracking().ToListAsync();

    public async Task<T?> GetByIdAsync(int id) => await _dbSet.FindAsync(id);

    public async Task AddAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
    }

    public IQueryable<T> GetAll()
    {
        return _context.Set<T>();
    }

    public void RemoveRange(IEnumerable<T> entities)
    {
        _dbSet.RemoveRange(entities);
    }

    public async Task Update(T entity)
    {
        _dbSet.Update(entity);
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _dbSet.FindAsync(id);
        if (entity is not null)
        {
            _dbSet.Remove(entity);
        }
    }

    public async Task DeleteAsync(T entity)
    {
        _dbSet.Remove(entity);
        await Task.CompletedTask; // không cần await thật vì Remove là sync
    }

    public async Task<T?> SingleOrDefaultAsync(Expression<Func<T, bool>> predicate) =>
        await _dbSet.AsNoTracking().SingleOrDefaultAsync(predicate);

    public async Task<IEnumerable<T>> WhereAsync(Expression<Func<T, bool>> predicate) =>
        await _dbSet.AsNoTracking().Where(predicate).ToListAsync();

    public IQueryable<T> Query()
    {
        return _context.Set<T>().AsQueryable();
    }
}
