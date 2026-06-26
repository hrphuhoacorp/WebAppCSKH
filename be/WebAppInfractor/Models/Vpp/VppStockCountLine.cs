using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Vpp;

[Index(nameof(StockCountId))]
[Index(nameof(ItemId))]
public class VppStockCountLine
{
    public int Id { get; set; }
    public int StockCountId { get; set; }
    public int ItemId { get; set; }
    public decimal SystemQty { get; set; }
    public decimal ActualQty { get; set; }
    public decimal Difference { get; set; }
    public string? Note { get; set; }
}
