namespace WebAppInfractor.Models.Persona;

public class PersonaBusinessInvoiceImport
{
    public int Id { get; set; }
    public string FileName { get; set; } = null!;
    public int? ImportedBy { get; set; }
    public DateTime? ImportedAt { get; set; }

    public int TotalRows { get; set; }
    public int MatchedRows { get; set; }
    public int UnmatchedRows { get; set; }
}
