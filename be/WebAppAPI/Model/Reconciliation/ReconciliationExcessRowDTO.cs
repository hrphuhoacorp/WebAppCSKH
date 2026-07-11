public class ReconciliationExcessRowDTO
{
    public int Id { get; set; }
    public int? OrderId { get; set; }
    public int? OrderItemId { get; set; }
    public string OrderCode { get; set; } = "";
    public DateTime PurchaseDate { get; set; }
    public string? Sku { get; set; }
    public string? ServiceName { get; set; }
    public decimal Quantity { get; set; }
    public decimal Revenue { get; set; }
    public decimal? SourceQuantity { get; set; }
    public decimal? SourceRevenue { get; set; }
    public string MatchType { get; set; } = "";
    public int? DuplicateOfOrderId { get; set; }
    public int? DuplicateOfImportHistoryId { get; set; }
    public string? Note { get; set; }
    public bool IsDeleted { get; set; }

    // Truy ra gốc
    public int? ImportHistoryId { get; set; }
    public int? BranchId { get; set; }
    public string? Source { get; set; }
    public string? BranchName { get; set; }
    public string? ImportedByName { get; set; }
    public string? ImportBatchStatus { get; set; }
    public bool WasEverRestored { get; set; }
}
