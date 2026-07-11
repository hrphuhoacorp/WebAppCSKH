namespace WebAppInfractor.Models.Persona;

public class PersonaCustomerInteraction
{
    public int Id { get; set; }
    public int CustomerId { get; set; }

    // 'note' | 'call' | 'complaint' | 'care_action'
    public string Type { get; set; } = null!;

    // 'phone' | 'zalo' | 'email' | 'in_person' | 'other'
    public string? Channel { get; set; }

    public string Content { get; set; } = null!;

    // 'open' | 'in_progress' | 'resolved' — chỉ có ý nghĩa khi Type = 'complaint'
    public string? ComplaintStatus { get; set; }

    // Thời điểm thực tế xảy ra (có thể nhập lùi ngày) — khác CreatedAt
    public DateTime OccurredAt { get; set; }

    public int CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
