using System;

namespace WebAppInfractor.Models;

public class NxtSapoImport
{
    public int Id { get; set; }
    public string ImportId { get; set; } = null!;
    public string? FileName { get; set; }
    public DateTime ImportDate { get; set; }
    public int RowsRead { get; set; }
    public int RowsSaved { get; set; }
    public string? DateMin { get; set; }
    public string? DateMax { get; set; }
    public int TotalNetQty { get; set; }
    public decimal TotalRevenue { get; set; }
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
}
