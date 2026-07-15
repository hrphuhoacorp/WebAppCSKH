public class PersonaTagDTO
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = string.Empty;
    public bool HasAutoRule { get; set; }
    public bool IsActive { get; set; }
    public int DisplayOrder { get; set; }
    public int ActiveAssignmentCount { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreatePersonaTagDTO
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "#086839";
}

public class UpdatePersonaTagDTO
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "#086839";
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}

public class PersonaTagAssignmentDTO
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public int TagId { get; set; }
    public string TagName { get; set; } = string.Empty;
    public string TagColor { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string? Note { get; set; }
    public string? AssignedByName { get; set; }
    public DateTime? AssignedAt { get; set; }
}

public class AssignPersonaTagRequestDTO
{
    public int CustomerId { get; set; }
    public int TagId { get; set; }
    public string? Note { get; set; }
}

public class CustomerWithTagsDTO
{
    public int Id { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal PeriodRevenue { get; set; }
    public List<PersonaTagAssignmentDTO> Tags { get; set; } = new();
    public List<CustomerSignatureCategoryDTO> Signature { get; set; } = new();
}

// "Chữ ký" mua hàng của khách — top 3 nhóm hàng (OrderItem.Category) theo doanh thu, dùng để
// nhận diện nhanh khách này thường mua gì mà không cần mở từng đơn hàng ra xem. Nền tảng cho
// hướng phát triển sau này: ghép với dữ liệu chiến dịch marketing để gợi ý danh sách liên hệ
// theo đúng sở thích, hoặc gợi ý ưu đãi phù hợp cho khách lâu không quay lại.
public class CustomerSignatureCategoryDTO
{
    public string Category { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public double SharePercent { get; set; }
}
