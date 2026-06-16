using System;

namespace WebAppInfractor.Models;

public class NxtSapoSale
{
    public int Id { get; set; }
    public string ImportId { get; set; } = null!;
    public int RowNo { get; set; }
    public string Date { get; set; } = null!;
    public string? ProductType { get; set; }
    public string? Sku { get; set; }
    public string? VariantName { get; set; }
    public string ItemCode { get; set; } = null!;
    public string? WarehouseStatus { get; set; }
    public string? PaymentStatus { get; set; }
    public string? OrderStatus { get; set; }
    public string Branch { get; set; } = null!;
    public int SoldQty { get; set; }
    public int NetSoldQty { get; set; }
    public int OrderCount { get; set; }
    public decimal Revenue { get; set; }
    public decimal NetRevenue { get; set; }
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
}
