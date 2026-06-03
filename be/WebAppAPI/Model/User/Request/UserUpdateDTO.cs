public class UserUpdateDTO
{
    public int BranchesId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public List<int> RoleIds { get; set; }
    public DateTime? DayOfBirth { get; set; }
    public DateTime UpdatedAt { get; set; }
}
