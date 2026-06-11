using System;

namespace WebAppInfractor.Models;

public partial class SapoImport
{
    public int Id { get; set; }
    public string ReportDate { get; set; } = null!;
    public string ImportBatchId { get; set; } = null!;
    public int? UploadedBy { get; set; }
    public DateTime? UploadedAt { get; set; }
    public int RowCount { get; set; }
    public decimal NetRevenue { get; set; }
    public int Orders { get; set; }
    public decimal Qty { get; set; }
    public string? Note { get; set; }
}
