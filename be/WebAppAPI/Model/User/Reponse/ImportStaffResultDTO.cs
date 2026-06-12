public class ImportStaffResultDTO
{
    public int SuccessCount { get; set; }
    public int ErrorCount { get; set; }
    public List<ImportStaffRowErrorDTO> Errors { get; set; } = new();
}

public class ImportStaffRowErrorDTO
{
    public int Row { get; set; }
    public string? StaffCode { get; set; }
    public string Error { get; set; } = null!;
}
