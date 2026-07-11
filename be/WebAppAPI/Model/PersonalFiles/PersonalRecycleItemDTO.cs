public class PersonalRecycleItemDTO
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public bool IsFolder { get; set; }
    public DateTime? DeletedAt { get; set; }
}
