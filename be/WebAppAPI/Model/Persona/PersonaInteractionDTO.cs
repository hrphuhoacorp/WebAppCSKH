public class PersonaInteractionDTO
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerCode { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Channel { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? ComplaintStatus { get; set; }
    public DateTime OccurredAt { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreatePersonaInteractionDTO
{
    public int CustomerId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Channel { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? ComplaintStatus { get; set; }
    public DateTime OccurredAt { get; set; }
}

public class UpdatePersonaInteractionDTO
{
    public string Type { get; set; } = string.Empty;
    public string? Channel { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? ComplaintStatus { get; set; }
    public DateTime OccurredAt { get; set; }
}
