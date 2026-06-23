public class OrderFilterDTO
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;

    public string? Search { get; set; }

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

    public int? StatusId { get; set; }
    public int? BranchId { get; set; }
    public string? Source { get; set; }

    public string SortBy { get; set; } = "purchaseDate";
    public string SortDir { get; set; } = "desc";
}
