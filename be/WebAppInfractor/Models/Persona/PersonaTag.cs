namespace WebAppInfractor.Models.Persona;

public class PersonaTag
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string Color { get; set; } = "#086839";

    // jsonb — null nếu tag chỉ gắn thủ công, không có luật tự động
    public string? RuleConfig { get; set; }

    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }

    public int? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
