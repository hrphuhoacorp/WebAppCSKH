namespace WebAppInfractor.Models;

public class NxtRow
{
    public int Id { get; set; }
    public string CloseDate { get; set; } = null!;
    public string Branch { get; set; } = null!;
    public string ItemCode { get; set; } = null!;
    public decimal OpeningStock { get; set; }
    public string? OpeningSource { get; set; }
    public decimal GiftIn { get; set; }
    public decimal ReceiveBranch { get; set; }
    public decimal TransferBranch { get; set; }
    public decimal CancelBasket { get; set; }
    public decimal SapoSold { get; set; }
    public decimal Adjustment { get; set; }
    public decimal ActualStock { get; set; }
    public decimal SoldNotPicked { get; set; }
    public decimal Revenue { get; set; }
    public decimal OrderCount { get; set; }
    public string? TransferNotes { get; set; }
    public bool Inactive { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
