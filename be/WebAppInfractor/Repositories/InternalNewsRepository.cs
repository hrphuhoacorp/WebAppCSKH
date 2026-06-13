using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IInternalNewsRepository : IRepository<InternalNews> { }

public class InternalNewsRepository : Repository<InternalNews>, IInternalNewsRepository
{
    public InternalNewsRepository(MemBerContext context)
        : base(context) { }

    public new async Task Update(InternalNews entity)
    {
        _dbSet.Update(entity);
        _context.Entry(entity).Property(x => x.CreatedAt).IsModified = false;
    }
}
