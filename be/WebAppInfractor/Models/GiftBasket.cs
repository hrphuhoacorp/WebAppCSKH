using System;

namespace WebAppInfractor.Models;

public partial class GiftBasket
{
    public int Id { get; set; }
    public string BasketUid { get; set; } = null!;
    public int? BranchId { get; set; }
    public string BaseCode { get; set; } = null!;
    public string BasketName { get; set; } = null!;
    public string CurrentCode { get; set; } = null!;
    public decimal Price { get; set; }
    public string? EffectiveDate { get; set; }
    public string Status { get; set; } = "active";
    public string? FrontImageUrl { get; set; }
    public string? BackImageUrl { get; set; }
    public string? ImageOverlayText { get; set; }
    public string? Notice { get; set; }
    public string? Note { get; set; }
    public int? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public virtual Branch? Branch { get; set; }
}
