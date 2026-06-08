using System;
using System.Collections.Generic;

namespace WebAppInfractor.Models;

public partial class InternalNews
{
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Content { get; set; } = null!;

    public string? ThumbnailUrl { get; set; }

    public string? Type { get; set; }

    public string? Status { get; set; }

    public int? ViewCount { get; set; }

    public bool? IsPinned { get; set; }

    public int? CreatedBy { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public virtual User? CreatedByNavigation { get; set; }
}
