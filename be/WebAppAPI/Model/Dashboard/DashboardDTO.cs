public class DashboardDTO
{
    public int TotalOrders { get; set; }
    public int TotalCustomers { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal AverageOrderValue { get; set; }

    public List<ChartItemDTO> OrdersByStatus { get; set; } = new();
    public List<ChartItemDTO> CustomersBySource { get; set; } = new();
    public List<MonthlyRevenueDTO> RevenueByMonth { get; set; } = new();
    public List<TopCustomerDTO> TopCustomersByRevenue { get; set; } = new();
    public List<ChartItemDTO> RevenueByBranch { get; set; } = new();
    public List<BirthdayCustomerDTO> BirthdayCustomersThisMonth { get; set; } = new();
}

public class ChartItemDTO
{
    public string Name { get; set; }
    public decimal Value { get; set; }
}

public class MonthlyRevenueDTO
{
    public string Period { get; set; }
    public decimal Revenue { get; set; }
}

public class TopCustomerDTO
{
    public int? CustomerId { get; set; }
    public string CustomerName { get; set; }
    public string Phone { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TotalOrders { get; set; }
}

public class BirthdayCustomerDTO
{
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateOnly? DayOfBirth { get; set; }
}
