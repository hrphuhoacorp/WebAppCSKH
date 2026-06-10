public class InternalNewsFilter
{
    public string? Search { get; set; }
    public string? Type { get; set; }
    public string? Status { get; set; }
    public bool? IsPinned { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
