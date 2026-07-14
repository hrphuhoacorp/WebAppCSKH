public class PersonaOverviewDTO
{
    public int TotalCustomers { get; set; }
    public int TaggedCustomers { get; set; }
    public int UntaggedCustomers { get; set; }
    public int OpenComplaints { get; set; }
    public int UpcomingReminders7Days { get; set; }
    public List<PersonaTagDistributionDTO> TagDistribution { get; set; } = new();
}

public class PersonaTagDistributionDTO
{
    public string TagName { get; set; } = string.Empty;
    public string TagColor { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class PersonaDashboardDTO
{
    public int TotalCustomers { get; set; }
    public int TaggedCustomers { get; set; }
    public int UntaggedCustomers { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TaggedRevenue { get; set; }
    public int BusinessCustomers { get; set; }
    public decimal BusinessRevenue { get; set; }
    public int OpenComplaints { get; set; }
    public int UpcomingReminders7Days { get; set; }
    public int NewTaggedCustomersThisMonth { get; set; }

    public List<PersonaTagStatsDTO> TagStats { get; set; } = new();
    public List<PersonaMonthlyRevenueDTO> MonthlyRevenue { get; set; } = new();
    public List<PersonaTagMonthlySeriesDTO> TopTagMonthlyRevenue { get; set; } = new();
    public List<PersonaTopCustomerDTO> TopCustomers { get; set; } = new();
    public List<PersonaCategoryStatsDTO> TopCategories { get; set; } = new();
}

public class PersonaTagStatsDTO
{
    public int TagId { get; set; }
    public string TagName { get; set; } = "";
    public string TagColor { get; set; } = "";
    public int CustomerCount { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal AvgRevenuePerCustomer { get; set; }
    public double RevenueSharePercent { get; set; }
}

public class PersonaMonthlyRevenueDTO
{
    public string Month { get; set; } = "";
    public decimal TotalRevenue { get; set; }
}

public class PersonaTagMonthlySeriesDTO
{
    public int TagId { get; set; }
    public string TagName { get; set; } = "";
    public string TagColor { get; set; } = "";
    public List<PersonaMonthlyRevenueDTO> Points { get; set; } = new();
}

public class PersonaTopCustomerDTO
{
    public int CustomerId { get; set; }
    public string CustomerCode { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TotalOrders { get; set; }
    public bool IsBusinessCustomer { get; set; }
    public List<string> TagNames { get; set; } = new();
}

public class PersonaCategoryStatsDTO
{
    public string Category { get; set; } = "";
    public decimal TotalRevenue { get; set; }
}

// Gộp từ trang "Tỉ Lệ Quay Lại" (đã retire) vào module Persona — cùng tính từ Order/Customer
// nhưng viết lại theo lối tổng hợp SQL-side, tránh load toàn bộ bảng orders vào bộ nhớ như
// cách làm cũ (CustomerService.GetReturnRateStatsAsync trước đây).
public class PersonaRetentionDTO
{
    public double AvgReturnRatePercent { get; set; }
    public double AvgDaysBetweenOrders { get; set; }
    public double AvgDaysToSecondPurchase { get; set; }
    public int AtRiskCount { get; set; }

    public List<PersonaRetentionMonthDTO> MonthlyTrend { get; set; } = new();
    public PersonaFrequencyDistributionDTO FrequencyDistribution { get; set; } = new();
    public PersonaDormancySegmentsDTO DormancySegments { get; set; } = new();
    public List<PersonaTopCustomerDTO> TopLoyalCustomers { get; set; } = new();
}

public class PersonaRetentionMonthDTO
{
    public string Month { get; set; } = "";
    public int NewCustomers { get; set; }
    public int ReturningCustomers { get; set; }
    public double ReturnRatePercent { get; set; }
    public decimal NewRevenue { get; set; }
    public decimal ReturningRevenue { get; set; }
}

public class PersonaFrequencyDistributionDTO
{
    public int Once { get; set; }
    public int TwoToThree { get; set; }
    public int FourToTen { get; set; }
    public int MoreThanTen { get; set; }
}

public class PersonaDormancySegmentsDTO
{
    public int Active30 { get; set; }
    public int Dormant30To60 { get; set; }
    public int Dormant60To90 { get; set; }
    public int Dormant90Plus { get; set; }
    public int NeverBought { get; set; }
}
