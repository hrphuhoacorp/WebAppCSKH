using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Recruitment;

[Index(nameof(Status))]
[Index(nameof(DeletedAt))]
public class RecruitmentCampaign
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Position { get; set; } = null!;
    public int? QuantityNeeded { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? PostContent { get; set; }
    public string? Requirements { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "open";
    public string? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
