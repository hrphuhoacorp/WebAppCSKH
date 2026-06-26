using WebAppInfractor.Data;
using WebAppInfractor.Models.Vpp;

public interface IVppItemRepository : IRepository<VppItem> { }

public class VppItemRepository : Repository<VppItem>, IVppItemRepository
{
    public VppItemRepository(MemBerContext context)
        : base(context) { }
}

public interface IVppRequestRepository : IRepository<VppRequest> { }

public class VppRequestRepository : Repository<VppRequest>, IVppRequestRepository
{
    public VppRequestRepository(MemBerContext context)
        : base(context) { }
}

public interface IVppRequestLineRepository : IRepository<VppRequestLine> { }

public class VppRequestLineRepository : Repository<VppRequestLine>, IVppRequestLineRepository
{
    public VppRequestLineRepository(MemBerContext context)
        : base(context) { }
}

public interface IVppImportRepository : IRepository<VppImport> { }

public class VppImportRepository : Repository<VppImport>, IVppImportRepository
{
    public VppImportRepository(MemBerContext context)
        : base(context) { }
}

public interface IVppImportLineRepository : IRepository<VppImportLine> { }

public class VppImportLineRepository : Repository<VppImportLine>, IVppImportLineRepository
{
    public VppImportLineRepository(MemBerContext context)
        : base(context) { }
}

public interface IVppDispatchRepository : IRepository<VppDispatch> { }

public class VppDispatchRepository : Repository<VppDispatch>, IVppDispatchRepository
{
    public VppDispatchRepository(MemBerContext context)
        : base(context) { }
}

public interface IVppDispatchLineRepository : IRepository<VppDispatchLine> { }

public class VppDispatchLineRepository : Repository<VppDispatchLine>, IVppDispatchLineRepository
{
    public VppDispatchLineRepository(MemBerContext context)
        : base(context) { }
}

public interface IVppStockCountRepository : IRepository<VppStockCount> { }

public class VppStockCountRepository : Repository<VppStockCount>, IVppStockCountRepository
{
    public VppStockCountRepository(MemBerContext context)
        : base(context) { }
}

public interface IVppStockCountLineRepository : IRepository<VppStockCountLine> { }

public class VppStockCountLineRepository
    : Repository<VppStockCountLine>,
        IVppStockCountLineRepository
{
    public VppStockCountLineRepository(MemBerContext context)
        : base(context) { }
}
