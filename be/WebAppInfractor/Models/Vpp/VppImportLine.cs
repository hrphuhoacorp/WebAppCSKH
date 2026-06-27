using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Vpp;

[Index(nameof(ImportId))]
[Index(nameof(ItemId))]
public class VppImportLine
{
    public int Id { get; set; }
    public int ImportId { get; set; }
    public int ItemId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Attachments { get; set; }
}
