public class PersonaOverviewDTO
{
    public int TotalCustomers { get; set; }
    public int TaggedCustomers { get; set; }
    public int UntaggedCustomers { get; set; }
    public int OpenComplaints { get; set; }
    public int UpcomingReminders7Days { get; set; }
    public List<PersonaTagDistributionDTO> TagDistribution { get; set; } = new();
}

public class PersonaTagDistributionDTO
{
    public string TagName { get; set; } = string.Empty;
    public string TagColor { get; set; } = string.Empty;
    public int Count { get; set; }
}
