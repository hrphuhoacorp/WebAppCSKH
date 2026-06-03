using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface ITodoTaskRepository : IRepository<TodoTask>
{
    // Add custom methods for TodoTask here if needed
}

public class TodoTaskRepository : Repository<TodoTask>, ITodoTaskRepository
{
    public TodoTaskRepository(MemBerContext context)
        : base(context) { }
}
