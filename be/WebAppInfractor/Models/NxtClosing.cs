using System;

namespace WebAppInfractor.Models;

public class NxtClosing
{
    public int Id { get; set; }
    public string Date { get; set; } = null!;
    public string Branch { get; set; } = null!;
    public string Status { get; set; } = "closed";
    public string? Note { get; set; }
    public DateTime ClosedAt { get; set; }
    public string? ClosedBy { get; set; }
}
