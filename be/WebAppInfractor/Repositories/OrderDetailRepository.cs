using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IOrderItemRepository : IRepository<OrderItem>
{
    // Add custom methods for OrderItem here if needed
}

public class OrderItemRepository : Repository<OrderItem>, IOrderItemRepository
{
    public OrderItemRepository(MemBerContext context)
        : base(context) { }
}
