using System;
using System.Collections.Generic;

namespace WebAppInfractor.Models;

public partial class Order
{
    public int Id { get; set; }

    public string OrderCode { get; set; } = null!;

    public int? CustomerId { get; set; }

    public int? BranchesId { get; set; }

    public int? StatusId { get; set; }

    public DateTime PurchaseDate { get; set; }

    public string? Source { get; set; }

    public string? Channel { get; set; }

    public decimal Revenue { get; set; }

    public decimal GrossProfit { get; set; }

    public decimal ShippingFee { get; set; }

    public decimal TaxAmount { get; set; }

    public int? ImportHistoryId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public int? CreatedBy { get; set; }

    public virtual Branch? Branches { get; set; }

    public virtual User? CreatedByNavigation { get; set; }

    public virtual Customer? Customer { get; set; }

    public virtual ImportsHistory? ImportHistory { get; set; }

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual OrderStatus? Status { get; set; }
}
