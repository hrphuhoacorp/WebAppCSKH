public class PersonaInvoiceImportDTO
{
    public int Id { get; set; }
    public string FileName { get; set; } = "";
    public string ImportedByName { get; set; } = "";
    public DateTime? ImportedAt { get; set; }
    public int TotalRows { get; set; }
    public int MatchedRows { get; set; }
    public int UnmatchedRows { get; set; }
}

public class PersonaInvoiceImportResultDTO : PersonaInvoiceImportDTO
{
    public List<string> SampleUnmatchedOrderCodes { get; set; } = new();
}

public class BusinessCustomerDTO
{
    public int CustomerId { get; set; }
    public string CustomerCode { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public decimal TotalRevenue { get; set; }
    public string? LatestCompanyName { get; set; }
    public int InvoiceCount { get; set; }
    public DateTime? LatestInvoiceDate { get; set; }
}
