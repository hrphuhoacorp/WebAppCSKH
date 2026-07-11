public class ReconciliationMissingRowDTO
{
    public int Id { get; set; }
    public string OrderCode { get; set; } = "";
    public DateTime PurchaseDate { get; set; }
    public string? Sku { get; set; }
    public string? ServiceName { get; set; }
    public decimal Quantity { get; set; }
    public decimal Revenue { get; set; }
    public string? Source { get; set; }
    public string? BranchName { get; set; }
    public string? Note { get; set; }
}
