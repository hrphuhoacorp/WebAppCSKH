public class ImportResultDTO
{
    public int TotalRows { get; set; }
    public int SuccessfulImports { get; set; }
    public int SkippedImports { get; set; }
    public int FailedImports { get; set; }
    public List<string> ErrorMessages { get; set; } = new List<string>();
    public List<string> SkippedMessages { get; set; } = new List<string>();
}
