using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Vpp;

[Index(nameof(ItemId), nameof(UnitPrice), nameof(Status))]
[Index(nameof(ItemId), nameof(Status), nameof(PeriodYear), nameof(PeriodMonth))]
public class VppItemLot
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public int LotNumber { get; set; }
    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal InitialQty { get; set; }
    public decimal RemainingQty { get; set; }
    public string Status { get; set; } = "active"; // active | depleted
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public VppItem Item { get; set; } = null!;
}
