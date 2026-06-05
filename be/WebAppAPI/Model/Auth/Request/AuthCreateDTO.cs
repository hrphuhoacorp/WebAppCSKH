public class AuthCreateDTO
{
    public string StaffCode { get; set; } = string.Empty;
    public int BranchesId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateTime? DayOfBirth { get; set; }
    public int RoleId { get; set; }
}
