public class SapoImportRowDTO
{
    public int RowNumber { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string CustomerName { get; set; } = "";
    public string CustomerPhone { get; set; } = "";
    public string CustomerCode { get; set; } = "";
    public string Category { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string Sku { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public string ServiceName { get; set; } = "";
    public string Unit { get; set; } = "";
    public string OrderCode { get; set; } = "";
    public string StatusName { get; set; } = "";
    public string BranchName { get; set; } = "";
    public string Source { get; set; } = "";
    public string QuantityStr { get; set; } = "";
    public decimal Revenue { get; set; }
    public decimal NetRevenue { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Quantity { get; set; }
}
