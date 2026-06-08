using System;
using System.Collections.Generic;

namespace WebAppInfractor.Models;

public partial class MediaFolder
{
    public int Id { get; set; }

    public int? ParentId { get; set; }

    public string Name { get; set; } = null!;

    public bool? IsPublic { get; set; }

    public int? CreatedBy { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public virtual User? CreatedByNavigation { get; set; }

    public virtual ICollection<MediaFolder> InverseParent { get; set; } = new List<MediaFolder>();

    public virtual ICollection<MediaFile> MediaFiles { get; set; } = new List<MediaFile>();

    public virtual MediaFolder? Parent { get; set; }
}
