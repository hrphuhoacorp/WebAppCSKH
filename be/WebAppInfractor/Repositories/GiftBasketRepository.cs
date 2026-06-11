using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IGiftBasketRepository : IRepository<GiftBasket> { }

public class GiftBasketRepository : Repository<GiftBasket>, IGiftBasketRepository
{
    public GiftBasketRepository(MemBerContext context)
        : base(context) { }
}

public interface IGiftCodeMappingRepository : IRepository<GiftCodeMapping> { }

public class GiftCodeMappingRepository : Repository<GiftCodeMapping>, IGiftCodeMappingRepository
{
    public GiftCodeMappingRepository(MemBerContext context)
        : base(context) { }
}

public interface ISapoSaleRepository : IRepository<SapoSale> { }

public class SapoSaleRepository : Repository<SapoSale>, ISapoSaleRepository
{
    public SapoSaleRepository(MemBerContext context)
        : base(context) { }
}

public interface ISapoImportRepository : IRepository<SapoImport> { }

public class SapoImportRepository : Repository<SapoImport>, ISapoImportRepository
{
    public SapoImportRepository(MemBerContext context)
        : base(context) { }
}

public interface IGiftCodeChangeRequestRepository : IRepository<GiftCodeChangeRequest> { }

public class GiftCodeChangeRequestRepository
    : Repository<GiftCodeChangeRequest>,
        IGiftCodeChangeRequestRepository
{
    public GiftCodeChangeRequestRepository(MemBerContext context)
        : base(context) { }
}
