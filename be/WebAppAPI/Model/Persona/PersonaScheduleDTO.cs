public class PersonaCareScheduleDTO
{
    public int Id { get; set; }
    public int? TagId { get; set; }
    public string? TagName { get; set; }
    public string Name { get; set; } = string.Empty;
    public string OccasionType { get; set; } = string.Empty;
    public int? LunarDay { get; set; }
    public int? LunarMonth { get; set; }
    public int? SolarMonth { get; set; }
    public int? SolarDay { get; set; }
    public int LeadDays { get; set; }
    public bool IsActive { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class CreatePersonaCareScheduleDTO
{
    public int? TagId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string OccasionType { get; set; } = string.Empty; // lunar_recurring | solar_recurring | customer_birthday
    public int? LunarDay { get; set; }
    public int? LunarMonth { get; set; }
    public int? SolarMonth { get; set; }
    public int? SolarDay { get; set; }
    public int LeadDays { get; set; }
}

public class UpdatePersonaCareScheduleDTO : CreatePersonaCareScheduleDTO
{
    public bool IsActive { get; set; } = true;
}

public class PersonaReminderDTO
{
    public int? ScheduleId { get; set; }
    public string OccasionName { get; set; } = string.Empty;
    public int? CustomerId { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateOnly OccasionDate { get; set; }
    public int DaysAway { get; set; }
    public bool AlreadyContacted { get; set; }
}
