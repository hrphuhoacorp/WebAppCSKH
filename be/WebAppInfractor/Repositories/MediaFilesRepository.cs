using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IMediaFileRepository : IRepository<MediaFile>
{
    // Add custom methods for MediaFile here if needed
}

public class MediaFileRepository : Repository<MediaFile>, IMediaFileRepository
{
    public MediaFileRepository(MemBerContext context)
        : base(context) { }
}
