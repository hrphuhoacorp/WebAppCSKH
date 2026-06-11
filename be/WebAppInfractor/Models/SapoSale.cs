using System;

namespace WebAppInfractor.Models;

public partial class SapoSale
{
    public int Id { get; set; }
    public string? ReportDate { get; set; }
    public string? Branch { get; set; }
    public string? ProductType { get; set; }
    public string? Sku { get; set; }
    public string? BasketCode { get; set; }
    public string? ReportCode { get; set; }
    public string? ReportName { get; set; }
    public string? ProductName { get; set; }
    public decimal Price { get; set; }
    public decimal Qty { get; set; }
    public int Orders { get; set; }
    public decimal Revenue { get; set; }
    public decimal NetRevenue { get; set; }
    public string? ImportBatchId { get; set; }
    public int? UploadedBy { get; set; }
    public DateTime? UploadedAt { get; set; }
    public DateTime? ImportedAt { get; set; }
}
