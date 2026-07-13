namespace WebAppInfractor.Models.Persona;

public class CustomerBusinessInvoice
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public int OrderId { get; set; }
    public string OrderCode { get; set; } = null!;
    public string? InvoiceNumber { get; set; }
    public string CompanyName { get; set; } = null!;
    public string? BuyerName { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public int ImportBatchId { get; set; }
    public DateTime? CreatedAt { get; set; }
}
