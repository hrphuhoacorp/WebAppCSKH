using System;
using System.Collections.Generic;

namespace WebAppInfractor.Models;

public partial class ActivityLog
{
    public long Id { get; set; }

    public int? UserId { get; set; }

    public string? StaffCode { get; set; }

    public string Action { get; set; } = null!;

    public string TableName { get; set; } = null!;

    public int? RecordId { get; set; }

    public string? OldData { get; set; }

    public string? NewData { get; set; }

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual User? User { get; set; }
}
