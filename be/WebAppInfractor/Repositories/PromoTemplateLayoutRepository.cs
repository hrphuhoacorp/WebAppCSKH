using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IPromoTemplateLayoutRepository : IRepository<PromoTemplateLayout> { }

public class PromoTemplateLayoutRepository : Repository<PromoTemplateLayout>, IPromoTemplateLayoutRepository
{
    public PromoTemplateLayoutRepository(MemBerContext context)
        : base(context) { }
}
