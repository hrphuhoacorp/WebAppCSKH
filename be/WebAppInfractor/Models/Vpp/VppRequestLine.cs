using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Vpp;

[Index(nameof(RequestId))]
[Index(nameof(ItemId))]
public class VppRequestLine
{
    public int Id { get; set; }
    public int RequestId { get; set; }
    public int ItemId { get; set; }
    public decimal Quantity { get; set; }
    public string? Note { get; set; }
}
