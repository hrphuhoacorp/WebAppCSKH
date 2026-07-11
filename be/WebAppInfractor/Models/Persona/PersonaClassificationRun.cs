namespace WebAppInfractor.Models.Persona;

public class PersonaClassificationRun
{
    public int Id { get; set; }
    public int TagId { get; set; }

    // jsonb — đóng băng luật tại thời điểm chạy, không phụ thuộc vào việc tag bị sửa sau này
    public string RuleConfigSnapshot { get; set; } = null!;

    public int RunBy { get; set; }
    public DateTime? RunAt { get; set; }

    public int MatchedCustomerCount { get; set; }
    public int NewlyAddedCount { get; set; }
    public int RemovedCount { get; set; }
    public int UnchangedCount { get; set; }
}
