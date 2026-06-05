public class AuthProfile
{
    public int Id { get; set; }
    public string? StaffCode { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Phone { get; set; } = null!;
    public DateTime? DayOfBirth { get; set; }
    public List<string> Roles { get; set; } = new List<string>();
    public int? BranchesId { get; set; }
    public string BranchesName { get; set; } = null!;
}
