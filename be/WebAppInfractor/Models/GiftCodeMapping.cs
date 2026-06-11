using System;

namespace WebAppInfractor.Models;

public partial class GiftCodeMapping
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string BaseCode { get; set; } = null!;
    public string BasketName { get; set; } = null!;
    public int? BranchId { get; set; }
    public int? BasketId { get; set; }
    public bool Active { get; set; } = true;
    public string Source { get; set; } = "library-sync";
    public DateTime? UpdatedAt { get; set; }

    public virtual Branch? Branch { get; set; }
    public virtual GiftBasket? Basket { get; set; }
}
