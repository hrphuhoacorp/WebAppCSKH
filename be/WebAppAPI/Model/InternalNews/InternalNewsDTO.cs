public class InternalNewsDTO
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Content { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? Type { get; set; }
    public string? Status { get; set; }
    public int ViewCount { get; set; }
    public bool IsPinned { get; set; }
    public string? CreatedByName { get; set; } // tên người đăng
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
