namespace WebAppInfractor.Models.Recruitment;

public class RecruitmentCategory
{
    public int Id { get; set; }
    public string Type { get; set; } = null!;
    public string Value { get; set; } = null!;
    public int SortOrder { get; set; } = 0;
}
