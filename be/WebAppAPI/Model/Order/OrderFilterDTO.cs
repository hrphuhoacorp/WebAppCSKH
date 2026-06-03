public class OrderFilterDTO
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;

    public string? Search { get; set; } // mã đơn / tên KH / SĐT

    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }

    public int? StatusId { get; set; }
    public int? BranchId { get; set; }
    public string? Source { get; set; }

    public string SortBy { get; set; } = "purchaseDate"; // purchaseDate | revenue
    public string SortDir { get; set; } = "desc"; // asc | desc
}
