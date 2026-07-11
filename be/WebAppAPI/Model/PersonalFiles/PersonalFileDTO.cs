public class PersonalFileDTO
{
    public int Id { get; set; }
    public int? FolderId { get; set; }
    public string FileName { get; set; } = "";
    public string? OriginalName { get; set; }
    public string? MimeType { get; set; }
    public long? FileSize { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
