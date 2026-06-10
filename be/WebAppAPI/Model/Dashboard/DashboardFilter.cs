public class DashboardFilter
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string RevenueGroupBy { get; set; } = "Month";
    public int? Month { get; set; }
    public int? Year { get; set; }
    public string? Source { get; set; }
    public int? branchId { get; set; }
}
