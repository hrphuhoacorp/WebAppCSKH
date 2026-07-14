using System.Text.Json.Serialization;

// Discriminated union theo field "type" — chỉ 3 loại điều kiện tính được từ dữ liệu đơn hàng
// hiện có. Kết hợp nhiều điều kiện trong 1 luật luôn là AND (xem lý do trong plan).
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(CategoryRevenueShareConditionDTO), "category_revenue_share")]
[JsonDerivedType(typeof(OrderFrequencyConditionDTO), "order_frequency")]
[JsonDerivedType(typeof(LunarDateRecurrenceConditionDTO), "lunar_date_recurrence")]
[JsonDerivedType(typeof(BusinessCustomerConditionDTO), "business_customer")]
[JsonDerivedType(typeof(TotalRevenueConditionDTO), "total_revenue")]
[JsonDerivedType(typeof(TotalOrderCountConditionDTO), "total_order_count")]
[JsonDerivedType(typeof(DaysSinceLastOrderConditionDTO), "days_since_last_order")]
[JsonDerivedType(typeof(DaysSinceFirstOrderConditionDTO), "days_since_first_order")]
public abstract class PersonaConditionDTO
{
}

// Không có tham số — khớp Customer.IsBusinessCustomer (được bật khi nạp file hóa đơn VAT
// khớp được mã đơn hàng với "Tên đơn vị" khác rỗng). Xem PersonaInvoiceService.
public class BusinessCustomerConditionDTO : PersonaConditionDTO
{
}

// Khớp Customer.TotalRevenue (tổng doanh thu lũy kế) — dùng cho tag kiểu "khách VIP".
public class TotalRevenueConditionDTO : PersonaConditionDTO
{
    public decimal MinRevenue { get; set; }
}

// Khớp Customer.TotalOrders (tổng số đơn lũy kế, không giới hạn thời gian) — MaxCount để trống
// nghĩa là không giới hạn trên (vd MinCount=1,MaxCount=1 cho "khách mua 1 lần").
public class TotalOrderCountConditionDTO : PersonaConditionDTO
{
    public int MinCount { get; set; }
    public int? MaxCount { get; set; }
}

// Khách "im ắng" — đơn gần nhất (Customer.LastOrderAt) đã cách hiện tại ít nhất MinDays ngày.
// MaxDays để trống = không giới hạn trên (vd MinDays=90 cho "lâu không quay lại"); có MaxDays
// để giới hạn thành khoảng (vd 60-180 cho "nguy cơ rời bỏ" — đã lâu nhưng chưa hẳn mất hẳn).
public class DaysSinceLastOrderConditionDTO : PersonaConditionDTO
{
    public int MinDays { get; set; }
    public int? MaxDays { get; set; }
}

// Khách mới — đơn ĐẦU TIÊN (MIN(Order.PurchaseDate)) nằm trong vòng MaxDays ngày gần đây.
public class DaysSinceFirstOrderConditionDTO : PersonaConditionDTO
{
    public int MaxDays { get; set; }
}

public class CategoryRevenueShareConditionDTO : PersonaConditionDTO
{
    public List<string> Categories { get; set; } = new();
    public double MinSharePercent { get; set; }
    public int? LookbackDays { get; set; }
}

public class OrderFrequencyConditionDTO : PersonaConditionDTO
{
    public int MinOrderCount { get; set; }
    public int LookbackDays { get; set; }
    public List<string>? Categories { get; set; }
}

public class LunarDateRecurrenceConditionDTO : PersonaConditionDTO
{
    public List<int> LunarDays { get; set; } = new();
    public int WindowDays { get; set; }
    public int MinOccurrences { get; set; }
    public int LookbackMonths { get; set; }
}

public class PersonaRuleConfigDTO
{
    public string Combinator { get; set; } = "AND";
    public List<PersonaConditionDTO> Conditions { get; set; } = new();
}

public class PersonaCustomerSampleDTO
{
    public int Id { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class PersonaRulePreviewDTO
{
    public int MatchedCount { get; set; }
    public List<PersonaCustomerSampleDTO> Sample { get; set; } = new();
}

public class PersonaClassificationRunDTO
{
    public int Id { get; set; }
    public int TagId { get; set; }
    public string TagName { get; set; } = string.Empty;
    public string RunByName { get; set; } = string.Empty;
    public DateTime? RunAt { get; set; }
    public int MatchedCustomerCount { get; set; }
    public int NewlyAddedCount { get; set; }
    public int RemovedCount { get; set; }
    public int UnchangedCount { get; set; }
}

public class PersonaClassificationRunDetailDTO : PersonaClassificationRunDTO
{
    public List<PersonaCustomerSampleDTO> AddedCustomers { get; set; } = new();
    public List<PersonaCustomerSampleDTO> RemovedCustomers { get; set; } = new();
}
