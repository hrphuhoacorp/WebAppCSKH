using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface INxtRowRepository : IRepository<NxtRow>
{
    // Add custom methods for NxtRow here if needed
}

public class NxtRowRepository : Repository<NxtRow>, INxtRowRepository
{
    public NxtRowRepository(MemBerContext context)
        : base(context) { }
}

public interface INxtSapoPendingRepository : IRepository<NxtSapoPending>
{
    // Add custom methods for NxtSapoPending here if needed
}

public class NxtSapoPendingRepository : Repository<NxtSapoPending>, INxtSapoPendingRepository
{
    public NxtSapoPendingRepository(MemBerContext context)
        : base(context) { }
}
