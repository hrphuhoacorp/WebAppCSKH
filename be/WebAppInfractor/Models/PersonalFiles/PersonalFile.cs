using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.PersonalFiles;

[Index(nameof(OwnerId))]
[Index(nameof(FolderId))]
public class PersonalFile
{
    public int Id { get; set; }
    public int? FolderId { get; set; }
    public string FileName { get; set; } = null!;
    public string? OriginalName { get; set; }
    public string StoragePath { get; set; } = null!;
    public string? MimeType { get; set; }
    public long? FileSize { get; set; }
    public int OwnerId { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
