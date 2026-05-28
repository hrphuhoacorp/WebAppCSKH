using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface ICustomerRepository : IRepository<Customer>
{
    // Add custom methods for Customer here if needed
}

public class CustomerRepository : Repository<Customer>, ICustomerRepository
{
    public CustomerRepository(MemBerContext context)
        : base(context) { }
}
