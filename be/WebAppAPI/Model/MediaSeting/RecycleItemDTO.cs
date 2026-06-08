public class RecycleItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public bool IsFolder { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? CreatedBy { get; set; }
}
