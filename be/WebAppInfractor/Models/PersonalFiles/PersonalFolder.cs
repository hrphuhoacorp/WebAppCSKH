using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.PersonalFiles;

[Index(nameof(OwnerId))]
[Index(nameof(ParentId))]
public class PersonalFolder
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public string Name { get; set; } = null!;
    public int OwnerId { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
