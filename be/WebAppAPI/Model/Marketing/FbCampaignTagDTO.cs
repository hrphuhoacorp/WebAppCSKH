public class FbCampaignTagDTO
{
    public int Id { get; set; }
    public string CampaignId { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public List<string> Categories { get; set; } = new();
    // Rỗng = tất cả chi nhánh.
    public List<int> BranchIds { get; set; } = new();
    public DateTime DateFrom { get; set; }
    public DateTime DateTo { get; set; }
    public string? Note { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateFbCampaignTagDTO
{
    public string CampaignId { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public List<string> Categories { get; set; } = new();
    public List<int> BranchIds { get; set; } = new();
    public DateTime DateFrom { get; set; }
    public DateTime DateTo { get; set; }
    public string? Note { get; set; }
}

public class UpdateFbCampaignTagDTO
{
    public List<string> Categories { get; set; } = new();
    public List<int> BranchIds { get; set; } = new();
    public DateTime DateFrom { get; set; }
    public DateTime DateTo { get; set; }
    public string? Note { get; set; }
}

public class TagCountDTO
{
    public int TagId { get; set; }
    public int Count { get; set; }
}

public class CampaignTagCountsDTO
{
    // Giao của tag × khách mua trong kỳ chiến dịch (dùng cho tab "Khách đã mua")
    public List<TagCountDTO> PeriodCounts { get; set; } = new();
    // Giao của tag × khách từng mua danh mục bất kỳ lúc nào (dùng cho tab "Tái kích hoạt")
    public List<TagCountDTO> AllTimeCounts { get; set; } = new();
}

// Khách hàng có sở thích mua danh mục campaign, ưu tiên người lâu không quay lại lên đầu.
public class CareOpportunityCustomerDTO
{
    public int Id { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal CategoryAffinityRevenue { get; set; }
    public int DaysSinceLastOrder { get; set; }
    public List<CustomerSignatureCategoryDTO> Signature { get; set; } = new();
    public List<PersonaTagAssignmentDTO> Tags { get; set; } = new();
}

// Hiệu suất ước lượng gián tiếp: đối chiếu số đơn/doanh thu thuộc đúng nhóm hàng đã gắn tag
// trong khoảng ngày chiến dịch chạy, so với cùng độ dài thời gian ngay trước đó (baseline) —
// không phải số đo chính xác vì đơn hàng Sapo hiện không có mã theo dõi nối trực tiếp tới quảng cáo.
public class FbCampaignPerformanceDTO
{
    public int TagId { get; set; }
    public string CampaignId { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public List<string> Categories { get; set; } = new();
    public List<int> BranchIds { get; set; } = new();

    public DateTime PeriodFrom { get; set; }
    public DateTime PeriodTo { get; set; }
    public int PeriodOrderCount { get; set; }
    public decimal PeriodRevenue { get; set; }
    public int PeriodCustomerCount { get; set; }

    public DateTime BaselineFrom { get; set; }
    public DateTime BaselineTo { get; set; }
    public int BaselineOrderCount { get; set; }
    public decimal BaselineRevenue { get; set; }

    public double? OrderCountLiftPercent { get; set; }
    public double? RevenueLiftPercent { get; set; }

    public decimal FbSpend { get; set; }
    public long FbImpressions { get; set; }
    public long FbClicks { get; set; }
    public long FbReach { get; set; }
    public decimal? CostPerOrderInCategory { get; set; }
}
