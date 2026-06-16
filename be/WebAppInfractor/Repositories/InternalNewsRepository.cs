using WebAppInfractor.Data;
using WebAppInfractor.Models;
using Microsoft.EntityFrameworkCore;

public interface IInternalNewsRepository : IRepository<InternalNews>
{
    Task UpdateSafeAsync(int id, Action<InternalNews> updateAction);
}

public class InternalNewsRepository : Repository<InternalNews>, IInternalNewsRepository
{
    public InternalNewsRepository(MemBerContext context)
        : base(context) { }

    public async Task UpdateSafeAsync(int id, Action<InternalNews> updateAction)
    {
        var news = await _dbSet.FindAsync(id);
        if (news == null) return;

        var createdAtBackup = news.CreatedAt;
        updateAction(news);

        await Update(news);
        await Task.CompletedTask;

        news.CreatedAt = createdAtBackup;
    }
}
