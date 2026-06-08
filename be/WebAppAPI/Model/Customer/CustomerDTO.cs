public class CustomerDTO
{
    public int Id { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public decimal TotalRevenue { get; set; }
    public DateTime? LastOrderAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public int? CreatedBy { get; set; }
    public string? CreatedName { get; set; }
    public DateOnly? DayOfBirth { get; set; }
    public List<OrderDTO> Orders { get; set; }
}
