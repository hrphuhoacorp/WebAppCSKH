public class UpdateCustomerDTO
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateTime? DayOfBirth { get; set; }
    public DateTime UpdatedAt { get; set; }
}
