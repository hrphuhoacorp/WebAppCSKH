using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Recruitment;

[Index(nameof(TemplateType), IsUnique = true)]
public class RecruitmentMailTemplate
{
    public int Id { get; set; }
    public string TemplateType { get; set; } = null!;
    public string Subject { get; set; } = null!;
    public string Content { get; set; } = null!;
    public DateTime? UpdatedAt { get; set; }
}
