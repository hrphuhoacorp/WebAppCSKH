using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IOrderStatusRepository : IRepository<OrderStatus>
{
    // Add custom methods for OrderStatus here if needed
}

public class OrderStatusRepository : Repository<OrderStatus>, IOrderStatusRepository
{
    public OrderStatusRepository(MemBerContext context)
        : base(context) { }
}
