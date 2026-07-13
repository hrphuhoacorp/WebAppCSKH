using System.Text.Json.Serialization;

// Discriminated union theo field "type" — chỉ 3 loại điều kiện tính được từ dữ liệu đơn hàng
// hiện có. Kết hợp nhiều điều kiện trong 1 luật luôn là AND (xem lý do trong plan).
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(CategoryRevenueShareConditionDTO), "category_revenue_share")]
[JsonDerivedType(typeof(OrderFrequencyConditionDTO), "order_frequency")]
[JsonDerivedType(typeof(LunarDateRecurrenceConditionDTO), "lunar_date_recurrence")]
[JsonDerivedType(typeof(BusinessCustomerConditionDTO), "business_customer")]
public abstract class PersonaConditionDTO
{
}

// Không có tham số — khớp Customer.IsBusinessCustomer (được bật khi nạp file hóa đơn VAT
// khớp được mã đơn hàng với "Tên đơn vị" khác rỗng). Xem PersonaInvoiceService.
public class BusinessCustomerConditionDTO : PersonaConditionDTO
{
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
