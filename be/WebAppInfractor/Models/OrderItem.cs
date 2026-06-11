using System;
using System.Collections.Generic;

namespace WebAppInfractor.Models;

public partial class OrderItem
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public string? Category { get; set; }

    public string? ProductName { get; set; }

    public string? Sku { get; set; }

    public decimal UnitPrice { get; set; }

    public string? ServiceName { get; set; }

    public string? Unit { get; set; }

    public int? ImportHistoryId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public decimal? Quantity { get; set; }

    public decimal Revenue { get; set; }

    public decimal GrossProfit { get; set; }

    public decimal ShippingFee { get; set; }

    public decimal TaxAmount { get; set; }

    public virtual ImportsHistory? ImportHistory { get; set; }

    public virtual Order Order { get; set; } = null!;
}
