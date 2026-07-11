using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Reconciliation;

[Index(nameof(PeriodMonth), nameof(PeriodYear))]
public class ReconciliationRun
{
    public int Id { get; set; }
    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }
    public string SourceFileName { get; set; } = null!;
    public string? SourceFilePath { get; set; }
    public int RunBy { get; set; }
    public DateTime? RunAt { get; set; }
    public int TotalExcessRows { get; set; }
    public decimal TotalExcessAmount { get; set; }
    public int TotalMissingRows { get; set; }
    public decimal TotalMissingAmount { get; set; }
    public int TotalMismatchRows { get; set; }
    public decimal TotalMismatchAmount { get; set; }
}
