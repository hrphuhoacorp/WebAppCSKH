public class DashboardFilter
{
    private DateTime? _fromDate;
    private DateTime? _toDate;

    public DateTime? FromDate
    {
        get => _fromDate;
        set => _fromDate = value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : null;
    }

    public DateTime? ToDate
    {
        get => _toDate;
        set => _toDate = value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : null;
    }

    public string RevenueGroupBy { get; set; } = "Month";
    public int? Month { get; set; }
    public int? Year { get; set; }
    public string? Source { get; set; }
    public int? branchId { get; set; }
}
