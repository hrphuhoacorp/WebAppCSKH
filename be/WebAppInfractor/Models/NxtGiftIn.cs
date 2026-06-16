using System;

namespace WebAppInfractor.Models;

public class NxtGiftIn
{
    public int Id { get; set; }
    public string ImportId { get; set; } = null!;
    public string Date { get; set; } = null!;
    public string Branch { get; set; } = null!;
    public string ItemCode { get; set; } = null!;
    public string? Sku { get; set; }
    public string? ItemName { get; set; }
    public int Qty { get; set; }
    public decimal? Price { get; set; }
    public string? CodeType { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
}
