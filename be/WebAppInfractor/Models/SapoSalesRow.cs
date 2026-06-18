namespace WebAppInfractor.Models;

public class SapoSalesRow
{
    public int Id { get; set; }
    public string BatchId { get; set; } = null!;
    public string Date { get; set; } = null!;
    public string Branch { get; set; } = null!;
    public string? ProductType { get; set; }
    public string? Sku { get; set; }
    public string? SapoCode { get; set; }
    public string? ReportCode { get; set; }
    public string? ReportName { get; set; }
    public string? ProductName { get; set; }
    public string? BasketGroup { get; set; }
    public string? PriceBucket { get; set; }
    public decimal Price { get; set; }
    public decimal Qty { get; set; }
    public decimal Orders { get; set; }
    public decimal Revenue { get; set; }
    public decimal NetRevenue { get; set; }
    public string? ResolveSource { get; set; }
    public string? MatchedCode { get; set; }
    public decimal? MappingPrice { get; set; }
    public string? MappingDate { get; set; }
    public string? MappingNote { get; set; }
    public string? AutoGroupNote { get; set; }
    public string? Warning { get; set; }
    public string? UploadedBy { get; set; }
    public string? UploadedAt { get; set; }
    public DateTime? CreatedAt { get; set; }
}
