using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IMessageReportRepository : IRepository<MessageReport> { }

public class MessageReportRepository : Repository<MessageReport>, IMessageReportRepository
{
    public MessageReportRepository(MemBerContext context)
        : base(context) { }
}
