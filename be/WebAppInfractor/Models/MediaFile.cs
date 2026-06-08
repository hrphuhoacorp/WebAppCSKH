using System;
using System.Collections.Generic;

namespace WebAppInfractor.Models;

public partial class MediaFile
{
    public int Id { get; set; }

    public int? FolderId { get; set; }

    public string FileName { get; set; } = null!;

    public string? OriginalName { get; set; }

    public string FileUrl { get; set; } = null!;

    public string? MimeType { get; set; }

    public long? FileSize { get; set; }

    public int? CreatedBy { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public virtual User? CreatedByNavigation { get; set; }

    public virtual MediaFolder? Folder { get; set; }
}
