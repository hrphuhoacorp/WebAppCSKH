public class AuthProfile
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public List<string> Roles { get; set; } = new List<string>();
    public int? BranchesId { get; set; }
    public string BranchesName { get; set; } = null!;
}
