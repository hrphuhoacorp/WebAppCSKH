namespace WebAppInfractor.Models.Recruitment;

public class RecruitmentSettings
{
    public int Id { get; set; }
    public string? DefaultContact { get; set; }
    public string? DefaultPhone { get; set; }
    public string? DefaultLocation { get; set; }
    public string? Signature { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
