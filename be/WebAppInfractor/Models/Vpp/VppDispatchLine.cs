using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Vpp;

[Index(nameof(DispatchId))]
[Index(nameof(ItemId))]
public class VppDispatchLine
{
    public int Id { get; set; }
    public int DispatchId { get; set; }
    public int ItemId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
}
