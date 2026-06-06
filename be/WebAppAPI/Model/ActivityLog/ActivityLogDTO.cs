public class ActivityLogDTO
{
    public long Id { get; set; }
    public int? UserId { get; set; }
    public string StaffCode { get; set; }
    public string Name { get; set; }
    public string? Action { get; set; }
    public string? TableName { get; set; }
    public int? RecordId { get; set; }
    public string? OldData { get; set; }
    public string? NewData { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime? CreatedAt { get; set; }
}
