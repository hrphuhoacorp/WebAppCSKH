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

    public DateTime? CreatedAt { get; set; }

    public short? Quantity { get; set; }

    public virtual Order Order { get; set; } = null!;
}
