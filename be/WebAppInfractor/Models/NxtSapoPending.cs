namespace WebAppInfractor.Models;

public class NxtSapoPending
{
    public int Id { get; set; }
    public string CloseDate { get; set; } = null!;
    public string Branch { get; set; } = null!;
    public string ItemCode { get; set; } = null!;
    public decimal Qty { get; set; }
    public string? Reason { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "pending";
    public string? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime? CreatedAt { get; set; }
    public string? SapoDate { get; set; }
    public string? SapoOrderCode { get; set; }
    public string? CompletedBy { get; set; }
    public string? CompletedByName { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? CompletionNote { get; set; }
    public string? PositiveAdjDate { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
