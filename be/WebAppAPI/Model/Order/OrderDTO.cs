public class OrderDTO
{
    public int Id { get; set; }
    public string OrderCode { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string? Source { get; set; }
    public string? Channel { get; set; }
    public decimal Revenue { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal TaxAmount { get; set; }
    public DateTime? CreatedAt { get; set; }

    // Flatten thông tin liên quan — không lồng cả entity vào
    public string CustomerName { get; set; }
    public string CustomerPhone { get; set; }
    public string StatusName { get; set; }
    public string BranchName { get; set; }

    public List<OrderItemDTO> Items { get; set; } = new();
}

public class OrderItemDTO
{
    public int Id { get; set; }
    public string? Category { get; set; }
    public string? ProductName { get; set; }
    public string? SKU { get; set; }
    public decimal UnitPrice { get; set; }
    public int? Quantity { get; set; }
    public string? ServiceName { get; set; }
    public string? Unit { get; set; }
}

public class StatusDTO
{
    public int Id { get; set; }
    public string Name { get; set; }
}

public class BranchDTO
{
    public int Id { get; set; }
    public string Name { get; set; }
}
