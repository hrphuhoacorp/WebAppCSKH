using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IMediaFolderRepository : IRepository<MediaFolder>
{
    // Add custom methods for MediaFolder here if needed
}

public class MediaFolderRepository : Repository<MediaFolder>, IMediaFolderRepository
{
    public MediaFolderRepository(MemBerContext context)
        : base(context) { }
}
