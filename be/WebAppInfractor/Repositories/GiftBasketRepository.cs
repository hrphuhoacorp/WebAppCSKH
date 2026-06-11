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

public interface IGiftCodeChangeRequestRepository : IRepository<GiftCodeChangeRequest> { }

public class GiftCodeChangeRequestRepository
    : Repository<GiftCodeChangeRequest>,
        IGiftCodeChangeRequestRepository
{
    public GiftCodeChangeRequestRepository(MemBerContext context)
        : base(context) { }
}
