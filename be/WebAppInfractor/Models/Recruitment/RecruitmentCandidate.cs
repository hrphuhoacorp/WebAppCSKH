namespace WebAppInfractor.Models.Recruitment;

public class RecruitmentCandidate
{
    public int Id { get; set; }
    public int? CampaignId { get; set; }
    public string CandidateName { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Position { get; set; }
    public string? Source { get; set; }
    public string? SourceOtherNote { get; set; }
    public string? CvLink { get; set; }
    public string? CvFileName { get; set; }
    public string? CvFilePath { get; set; }
    public string? CvNote { get; set; }
    public string Status { get; set; } = "new";
    public string? WaitingFor { get; set; }
    public string? InterviewTime { get; set; }
    public string? InterviewNote { get; set; }
    public string? Result { get; set; }
    public string? OfferNote { get; set; }
    public string? OnboardDate { get; set; }
    public bool MailInviteSent { get; set; } = false;
    public bool MailResultSent { get; set; } = false;
    public string? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
