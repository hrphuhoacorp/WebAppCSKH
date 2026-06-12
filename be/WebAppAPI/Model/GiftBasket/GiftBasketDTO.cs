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

public class GiftCodeChangeRequestDTO
{
    public int Id { get; set; }
    public string BatchId { get; set; } = null!;
    public string? BatchNote { get; set; }
    public string RequestUid { get; set; } = null!;
    public int? BranchId { get; set; }
    public string? BranchName { get; set; }
    public string? BasketCodeOrName { get; set; }
    public string? Reason { get; set; }
    public string? Note { get; set; }
    public string Priority { get; set; } = "normal";
    public string? GroupCode { get; set; }
    public decimal? Price { get; set; }
    public bool SentZaloPhoto { get; set; } = true;
    public string? FrontImageUrl { get; set; }
    public string? BackImageUrl { get; set; }
    public string Status { get; set; } = "pending";
    public int? HandledBy { get; set; }
    public string? HandledByName { get; set; }
    public DateTime? HandledAt { get; set; }
    public string? OldCode { get; set; }
    public string? NewCode { get; set; }
    public string? ApprovedDate { get; set; }
    public string? ResultNote { get; set; }
    public int? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime? CreatedAt { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreateCodeChangeRequestDTO
{
    public string? BatchNote { get; set; }
    public int? BranchId { get; set; }
    public string? BasketCodeOrName { get; set; }
    public string? Reason { get; set; }
    public string? Note { get; set; }
    public string Priority { get; set; } = "normal";
    public string? GroupCode { get; set; }
    public decimal? Price { get; set; }
    public bool SentZaloPhoto { get; set; } = true;
    public string? FrontImageUrl { get; set; }
    public string? BackImageUrl { get; set; }
}

public class HandleCodeChangeRequestDTO
{
    public int Id { get; set; }
    public string Status { get; set; } = null!;
    public string? OldCode { get; set; }
    public string? NewCode { get; set; }
    public decimal? Price { get; set; }
    public string? ApprovedDate { get; set; }
    public string? ResultNote { get; set; }
    public string? FrontImageUrl { get; set; }
    public string? BackImageUrl { get; set; }
}

public class ActivateCodeChangeRequestDTO
{
    public string? OldCode { get; set; }
    public string? NewCode { get; set; }
    public decimal? Price { get; set; }
    public string? ApprovedDate { get; set; }
    public string? ResultNote { get; set; }
    public string? Note { get; set; }
    public string? GroupCode { get; set; }
    public bool IsActive { get; set; } = true;
}
