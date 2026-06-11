using System;

namespace WebAppInfractor.Models;

public partial class GiftCodeChangeRequest
{
    public int Id { get; set; }
    public string BatchId { get; set; } = null!;
    public string? BatchNote { get; set; }
    public string RequestUid { get; set; } = null!;
    public int? BranchId { get; set; }
    public string? BasketCodeOrName { get; set; }
    public string? Reason { get; set; }
    public string? Note { get; set; }
    public string Priority { get; set; } = "normal";
    public string? GroupCode { get; set; }
    public decimal? Price { get; set; }
    public bool SentZaloPhoto { get; set; } = true;
    public string? FrontImageUrl { get; set; }
    public string? BackImageUrl { get; set; }
    public string Status { get; set; } = "pending";
    public int? HandledBy { get; set; }
    public DateTime? HandledAt { get; set; }
    public string? OldCode { get; set; }
    public string? NewCode { get; set; }
    public string? ApprovedDate { get; set; }
    public string? ResultNote { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }

    public virtual Branch? Branch { get; set; }
}
