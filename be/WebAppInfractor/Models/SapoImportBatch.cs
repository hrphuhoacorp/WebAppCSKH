namespace WebAppInfractor.Models;

public class SapoImportBatch
{
    public int Id { get; set; }
    public string BatchId { get; set; } = null!;
    public string ImportedAt { get; set; } = null!;
    public string SapoFileName { get; set; } = null!;
    public string? MappingFileName { get; set; }
    public int RowCount { get; set; }
    public string? DateRange { get; set; }
    public decimal NetRevenue { get; set; }
    public decimal Revenue { get; set; }
    public decimal Qty { get; set; }
    public decimal Orders { get; set; }
    public int MappingCount { get; set; }
    public int WarningCount { get; set; }
    public string? UploadedBy { get; set; }
    public string? Version { get; set; }
    public DateTime? CreatedAt { get; set; }
}
