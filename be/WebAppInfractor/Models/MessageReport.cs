using System;

namespace WebAppInfractor.Models;

public partial class MessageReport
{
    public int Id { get; set; }

    public DateOnly ReportDate { get; set; }

    public string Type { get; set; } = null!; // "Zalo" | "Facebook" | "Khác"

    public int Count { get; set; }

    public string? Note { get; set; }

    public int? CreatedBy { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual User? CreatedByNavigation { get; set; }
}
