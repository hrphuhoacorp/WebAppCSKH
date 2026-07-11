namespace WebAppInfractor.Models.Persona;

public class PersonaTagAssignment
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public int TagId { get; set; }

    // 'auto' | 'manual'
    public string Source { get; set; } = null!;

    public int? RunId { get; set; }
    public string? Note { get; set; }
    public int? AssignedBy { get; set; }
    public DateTime? AssignedAt { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime? DeactivatedAt { get; set; }
    public int? DeactivatedByRunId { get; set; }
    public int? RemovedBy { get; set; }
}
