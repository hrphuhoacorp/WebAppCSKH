using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Vpp;

[Index(nameof(Status))]
[Index(nameof(CountDate))]
public class VppStockCount
{
    public int Id { get; set; }
    public DateTime CountDate { get; set; }
    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }
    public string Status { get; set; } = "draft";
    public string? Note { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
