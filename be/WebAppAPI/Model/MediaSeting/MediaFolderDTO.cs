public class MediaFolderDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? ParentId { get; set; }
    public bool? IsPublic { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }

    public List<MediaFolderDto> Children { get; set; } = new();
}
