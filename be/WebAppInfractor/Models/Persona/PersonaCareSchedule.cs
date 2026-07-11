namespace WebAppInfractor.Models.Persona;

public class PersonaCareSchedule
{
    public int Id { get; set; }

    // null = áp dụng cho mọi khách (vd sinh nhật), không gắn theo 1 tag cụ thể
    public int? TagId { get; set; }

    public string Name { get; set; } = null!;

    // 'lunar_recurring' | 'solar_recurring' | 'customer_birthday'
    public string OccasionType { get; set; } = null!;

    // jsonb — cấu hình chi tiết theo OccasionType (vd { lunarDay, lunarMonth? } / { solarMonth, solarDay })
    public string OccasionConfig { get; set; } = null!;

    public int LeadDays { get; set; }
    public bool IsActive { get; set; } = true;

    public int? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
