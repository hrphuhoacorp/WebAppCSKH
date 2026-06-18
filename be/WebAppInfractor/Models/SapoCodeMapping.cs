namespace WebAppInfractor.Models;

public class SapoCodeMapping
{
    public int Id { get; set; }
    public string OldCode { get; set; } = null!;
    public string NewCode { get; set; } = null!;
    public decimal? Price { get; set; }
    public string? EffectiveDate { get; set; }
    public string? Note { get; set; }
    public string Active { get; set; } = "TRUE";
    public string? UploadedAt { get; set; }
    public string? Source { get; set; }
    public DateTime? CreatedAt { get; set; }
}
