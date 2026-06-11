using Microsoft.EntityFrameworkCore;

public interface IDashboardService
{
    Task<DashboardDTO> GetDashboardAsync(DashboardFilter filter);
}

public class DashboardService : IDashboardService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IOrderRepository _orderRepository;
    private readonly ICustomerRepository _customerRepository;
    private readonly IOrderItemRepository _orderItemRepository;
    private readonly IOrderStatusRepository _orderStatusRepository;
    private readonly IBranchRepository _branchRepository;

    public DashboardService(
        IUnitOfWork unitOfWork,
        IOrderRepository orderRepository,
        ICustomerRepository customerRepository,
        IOrderItemRepository orderItemRepository,
        IOrderStatusRepository orderStatusRepository,
        IBranchRepository branchRepository
    )
    {
        _unitOfWork = unitOfWork;
        _orderRepository = orderRepository;
        _customerRepository = customerRepository;
        _orderItemRepository = orderItemRepository;
        _orderStatusRepository = orderStatusRepository;
        _branchRepository = branchRepository;
    }

    public async Task<DashboardDTO> GetDashboardAsync(DashboardFilter filter)
    {
        try
        {
            var ordersQuery = _orderRepository
                .GetAll()
                .Include(o => o.Customer)
                .Include(o => o.Status)
                .Include(o => o.Branches)
                .Where(o =>
                    o.DeletedAt == null && (o.Customer == null || o.Customer.DeletedAt == null)
                )
                .AsNoTracking();

            if (filter.FromDate.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.PurchaseDate >= filter.FromDate.Value);
            }

            if (filter.ToDate.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.PurchaseDate <= filter.ToDate.Value);
            }

            if (
                filter.FromDate.HasValue
                && filter.ToDate.HasValue
                && filter.FromDate > filter.ToDate
            )
            {
                throw new BadRequestException("Ngày bắt đầu phải nhỏ hơn ngày kết thúc");
            }
            if (filter.Month.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.PurchaseDate.Month == filter.Month.Value);
            }

            if (filter.Year.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.PurchaseDate.Year == filter.Year.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.Source))
            {
                ordersQuery = ordersQuery.Where(o => o.Source == filter.Source.Trim());
            }

            if (filter.branchId.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.BranchesId == filter.branchId.Value);
            }
            var totalOrders = await ordersQuery.CountAsync();
            var totalRevenue = Math.Round(await ordersQuery.SumAsync(o => o.Revenue), 0);
            var averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            var totalCustomers = await ordersQuery
                .Select(o => o.CustomerId)
                .Distinct()
                .CountAsync();

            var ordersByStatus = await ordersQuery
                .GroupBy(o => o.Status.TrangThai)
                .Select(g => new ChartItemDTO { Name = g.Key, Value = g.Count() })
                .ToListAsync();

            var customersBySource = await ordersQuery
                .GroupBy(o => o.Source)
                .Select(g => new ChartItemDTO
                {
                    Name = g.Key ?? "Không rõ",
                    Value = g.Select(x => x.CustomerId).Distinct().Count(),
                })
                .ToListAsync();

            var revenueGroupBy = filter.RevenueGroupBy?.Trim().ToLower() ?? "month";

            List<MonthlyRevenueDTO> revenueByPeriod;

            if (revenueGroupBy == "day")
            {
                revenueByPeriod = await ordersQuery
                    .GroupBy(o => o.PurchaseDate.Date)
                    .Select(g => new
                    {
                        Date = g.Key,
                        Revenue = Math.Round(g.Sum(x => x.Revenue), 0),
                    })
                    .OrderBy(x => x.Date)
                    .Select(x => new MonthlyRevenueDTO
                    {
                        Period = x.Date.ToString("dd/MM/yyyy"),
                        Revenue = x.Revenue,
                    })
                    .ToListAsync();
            }
            else if (revenueGroupBy == "week")
            {
                var revenueByPeriodRaw = await ordersQuery
                    .Select(o => new { o.PurchaseDate, o.Revenue })
                    .ToListAsync();

                revenueByPeriod = revenueByPeriodRaw
                    .GroupBy(x => new
                    {
                        x.PurchaseDate.Year,
                        Week = ((x.PurchaseDate.DayOfYear - 1) / 7) + 1,
                    })
                    .OrderBy(g => g.Key.Year)
                    .ThenBy(g => g.Key.Week)
                    .Select(g => new MonthlyRevenueDTO
                    {
                        Period = $"Tuần {g.Key.Week}/{g.Key.Year}",
                        Revenue = Math.Round(g.Sum(x => x.Revenue), 0),
                    })
                    .ToList();
            }
            else
            {
                revenueByPeriod = await ordersQuery
                    .GroupBy(o => new { o.PurchaseDate.Year, o.PurchaseDate.Month })
                    .Select(g => new
                    {
                        Year = g.Key.Year,
                        Month = g.Key.Month,
                        Revenue = Math.Round(g.Sum(x => x.Revenue), 0),
                    })
                    .OrderBy(x => x.Year)
                    .ThenBy(x => x.Month)
                    .Select(x => new MonthlyRevenueDTO
                    {
                        Period = $"{x.Month:00}/{x.Year}",
                        Revenue = x.Revenue,
                    })
                    .ToListAsync();
            }

            var topCustomersByRevenue = await ordersQuery
                .GroupBy(o => new
                {
                    o.CustomerId,
                    o.Customer.Name,
                    o.Customer.Phone,
                })
                .Select(g => new TopCustomerDTO
                {
                    CustomerId = g.Key.CustomerId,
                    CustomerName = g.Key.Name,
                    Phone = g.Key.Phone,
                    TotalRevenue = g.Sum(x => x.Revenue),
                    TotalOrders = g.Count(),
                })
                .OrderByDescending(x => x.TotalRevenue)
                .Take(10)
                .ToListAsync();

            var revenueByBranch = await ordersQuery
                .GroupBy(o => o.Branches.Name)
                .Select(g => new ChartItemDTO
                {
                    Name = g.Key ?? "Không rõ",
                    Value = g.Sum(x => x.Revenue),
                })
                .OrderByDescending(x => x.Value)
                .ToListAsync();

            var currentMonth = DateTime.UtcNow.Month;

            var birthdayCustomersThisMonth = await _customerRepository
                .GetAll()
                .Where(c =>
                    c.DeletedAt == null
                    && c.DayOfBirth.HasValue
                    && c.DayOfBirth.Value.Month == currentMonth
                )
                .Select(c => new BirthdayCustomerDTO
                {
                    CustomerId = c.Id,
                    CustomerName = c.Name,
                    Phone = c.Phone,
                    DayOfBirth = c.DayOfBirth,
                })
                .OrderBy(c => c.DayOfBirth.Value.Day)
                .ToListAsync();

            return new DashboardDTO
            {
                TotalOrders = totalOrders,
                TotalCustomers = totalCustomers,
                TotalRevenue = totalRevenue,
                AverageOrderValue = averageOrderValue,
                OrdersByStatus = ordersByStatus,
                CustomersBySource = customersBySource,
                RevenueByMonth = revenueByPeriod,
                TopCustomersByRevenue = topCustomersByRevenue,
                RevenueByBranch = revenueByBranch,
                BirthdayCustomersThisMonth = birthdayCustomersThisMonth,
            };
        }
        catch
        {
            throw;
        }
    }
}
