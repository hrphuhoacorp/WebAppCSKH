public class MessageReportDTO
{
    public int Id { get; set; }
    public DateOnly ReportDate { get; set; }
    public string Type { get; set; } = null!;
    public int Count { get; set; }
    public string? Note { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class MessageReportCreateDTO
{
    public DateOnly ReportDate { get; set; }
    public string Type { get; set; } = null!;
    public int Count { get; set; }
    public string? Note { get; set; }
}

public class MessageReportFilter
{
    public int? Month { get; set; }
    public int? Year { get; set; }
    public string? Type { get; set; }
}
