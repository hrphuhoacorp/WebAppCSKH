using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Recruitment;

[Index(nameof(CandidateId))]
public class RecruitmentCandidateHistory
{
    public int Id { get; set; }
    public int CandidateId { get; set; }
    public DateTime ActedAt { get; set; }
    public string? ActedBy { get; set; }
    public string Action { get; set; } = null!;
    public string? Note { get; set; }
}
