using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Vpp;

[Index(nameof(RequesterId))]
[Index(nameof(Status))]
[Index(nameof(CreatedAt))]
public class VppRequest
{
    public int Id { get; set; }
    public int RequesterId { get; set; }
    public string Department { get; set; } = null!;
    public string? Reason { get; set; }
    public string? ReferencePrice { get; set; }
    public string Status { get; set; } = "pending";
    public string? AdminNote { get; set; }
    public int? DispatchId { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
