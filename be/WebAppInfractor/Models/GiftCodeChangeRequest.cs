using System;

namespace WebAppInfractor.Models;

public partial class GiftCodeChangeRequest
{
    public int Id { get; set; }
    public string BatchId { get; set; } = null!;
    public string? BatchNote { get; set; }
    public string RequestUid { get; set; } = null!;
    public int? BranchId { get; set; }
    public string BasketCodeOrName { get; set; } = null!;
    public string Reason { get; set; } = null!;
    public string? Note { get; set; }
    public string Priority { get; set; } = "normal";
    public string? FrontImageUrl { get; set; }
    public string? BackImageUrl { get; set; }
    public string Status { get; set; } = "pending";
    public int? HandledBy { get; set; }
    public DateTime? HandledAt { get; set; }
    public string? ResultNote { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }

    public virtual Branch? Branch { get; set; }
}
