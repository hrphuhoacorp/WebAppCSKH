public class GiftBasketDTO
{
    public int Id { get; set; }
    public string BasketUid { get; set; } = null!;
    public int? BranchId { get; set; }
    public string? BranchName { get; set; }
    public string BaseCode { get; set; } = null!;
    public string BasketName { get; set; } = null!;
    public string CurrentCode { get; set; } = null!;
    public decimal Price { get; set; }
    public string? EffectiveDate { get; set; }
    public string Status { get; set; } = "active";
    public string? FrontImageUrl { get; set; }
    public string? BackImageUrl { get; set; }
    public string? ImageOverlayText { get; set; }
    public string? Notice { get; set; }
    public string? Note { get; set; }
    public int? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class CreateGiftBasketDTO
{
    public int? BranchId { get; set; }
    public string BaseCode { get; set; } = null!;
    public string BasketName { get; set; } = null!;
    public string CurrentCode { get; set; } = null!;
    public decimal Price { get; set; }
    public string? EffectiveDate { get; set; }
    public string Status { get; set; } = "active";
    public string? FrontImageUrl { get; set; }
    public string? BackImageUrl { get; set; }
    public string? ImageOverlayText { get; set; }
    public string? Notice { get; set; }
    public string? Note { get; set; }
}

public class UpdateGiftBasketDTO : CreateGiftBasketDTO
{
    public int Id { get; set; }
}

public class GiftBasketFilterDTO
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public int? BranchId { get; set; }
    public string? Status { get; set; }
}

public class GiftCodeMappingDTO
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string BaseCode { get; set; } = null!;
    public string BasketName { get; set; } = null!;
    public int? BranchId { get; set; }
    public string? BranchName { get; set; }
    public int? BasketId { get; set; }
    public bool Active { get; set; }
    public string Source { get; set; } = null!;
    public DateTime? UpdatedAt { get; set; }
}

public class SapoImportDTO
{
    public int Id { get; set; }
    public string ReportDate { get; set; } = null!;
    public string ImportBatchId { get; set; } = null!;
    public int? UploadedBy { get; set; }
    public string? UploadedByName { get; set; }
    public DateTime? UploadedAt { get; set; }
    public int RowCount { get; set; }
    public decimal NetRevenue { get; set; }
    public int Orders { get; set; }
    public decimal Qty { get; set; }
    public string? Note { get; set; }
}

public class SapoDashboardDTO
{
    public string FilterKey { get; set; } = "all";
    public decimal TotalNetRevenue { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalQty { get; set; }
    public List<SapoBucketDTO> ByCode { get; set; } = new();
    public List<SapoBucketDTO> ByDay { get; set; } = new();
    public List<SapoBucketDTO> ByBranch { get; set; } = new();
    public List<SapoImportDTO> RecentImports { get; set; } = new();
}

public class SapoBucketDTO
{
    public string Key { get; set; } = null!;
    public string Label { get; set; } = null!;
    public decimal NetRevenue { get; set; }
    public decimal Revenue { get; set; }
    public int Orders { get; set; }
    public decimal Qty { get; set; }
}

public class GiftCodeChangeRequestDTO
{
    public int Id { get; set; }
    public string BatchId { get; set; } = null!;
    public string? BatchNote { get; set; }
    public string RequestUid { get; set; } = null!;
    public int? BranchId { get; set; }
    public string? BranchName { get; set; }
    public string BasketCodeOrName { get; set; } = null!;
    public string Reason { get; set; } = null!;
    public string? Note { get; set; }
    public string Priority { get; set; } = "normal";
    public string? FrontImageUrl { get; set; }
    public string? BackImageUrl { get; set; }
    public string Status { get; set; } = "pending";
    public int? HandledBy { get; set; }
    public string? HandledByName { get; set; }
    public DateTime? HandledAt { get; set; }
    public string? ResultNote { get; set; }
    public int? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class CreateCodeChangeRequestDTO
{
    public string? BatchNote { get; set; }
    public int? BranchId { get; set; }
    public string BasketCodeOrName { get; set; } = null!;
    public string Reason { get; set; } = null!;
    public string? Note { get; set; }
    public string Priority { get; set; } = "normal";
    public string? FrontImageUrl { get; set; }
    public string? BackImageUrl { get; set; }
}

public class HandleCodeChangeRequestDTO
{
    public int Id { get; set; }
    public string Status { get; set; } = null!;
    public string? ResultNote { get; set; }
}
