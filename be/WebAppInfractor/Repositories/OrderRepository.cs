using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IOrderRepository : IRepository<Order>
{
    // Add custom methods for Order here if needed
}

public class OrderRepository : Repository<Order>, IOrderRepository
{
    public OrderRepository(MemBerContext context)
        : base(context) { }
}
