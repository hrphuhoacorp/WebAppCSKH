public class ReturnRateStatsDTO
{
    public List<MonthlyReturnRateDTO> MonthlyReturnRate { get; set; } = new();
    public List<MonthlyRevenueBreakdownDTO> MonthlyRevenueBreakdown { get; set; } = new();
    public FrequencyDistributionDTO FrequencyDistribution { get; set; } = new();
    public DormancySegmentDTO DormancySegments { get; set; } = new();
    public List<LoyalCustomerDTO> TopLoyalCustomers { get; set; } = new();
    public ProductStatsDTO ProductStats { get; set; } = new();
    public double AvgDaysBetweenOrders { get; set; }
    public double AvgTimeToSecondPurchase { get; set; }
    public int AtRiskCustomers { get; set; }
}

public class ProductStatsDTO
{
    public int TotalItemsSold { get; set; }
    public decimal TotalProductRevenue { get; set; }
    public double AvgItemsPerOrder { get; set; }
    public int UniqueCategories { get; set; }
    public string? TopCategory { get; set; }
    public int TopCategoryCount { get; set; }
    public List<CategoryStatDTO> CategoryBreakdown { get; set; } = new();
}

public class CategoryStatDTO
{
    public string Category { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public decimal Revenue { get; set; }
}

public class SegmentCustomerDTO
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string CustomerCode { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal AvgOrderValue { get; set; }
    public DateTime? LastOrderAt { get; set; }
    public DateTime? FirstOrderAt { get; set; }
    public int DaysSinceLastOrder { get; set; }
}

public class MonthlyReturnRateDTO
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int NewCustomers { get; set; }
    public int ReturningCustomers { get; set; }
    public int TotalBuyers { get; set; }
    public double ReturnRate { get; set; }
}

public class MonthlyRevenueBreakdownDTO
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal ReturningRevenue { get; set; }
    public decimal NewRevenue { get; set; }
}

public class FrequencyDistributionDTO
{
    public int Once { get; set; }
    public int TwoToThree { get; set; }
    public int FourToTen { get; set; }
    public int MoreThanTen { get; set; }
}

public class DormancySegmentDTO
{
    public int Active30 { get; set; }
    public int Dormant30To60 { get; set; }
    public int Dormant60To90 { get; set; }
    public int Dormant90Plus { get; set; }
    public int NeverBought { get; set; }
}

public class LoyalCustomerDTO
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string CustomerCode { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal AvgOrderValue { get; set; }
    public double AvgDaysBetweenOrders { get; set; }
    public DateTime? LastOrderAt { get; set; }
    public DateTime? FirstOrderAt { get; set; }
    public int DaysSinceLastOrder { get; set; }
    public string? Phone { get; set; }
}
