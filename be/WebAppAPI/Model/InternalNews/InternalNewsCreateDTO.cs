public class InternalNewsCreateDTO
{
    public string Title { get; set; }
    public string Content { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? Type { get; set; } // "announcement", "news", "event"
    public string? Status { get; set; } // "draft" hoặc "published"
    public bool IsPinned { get; set; }
}
