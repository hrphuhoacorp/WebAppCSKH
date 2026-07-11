using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Reconciliation;

[Index(nameof(RunId))]
public class ReconciliationExcessRow
{
    public int Id { get; set; }
    public int RunId { get; set; }
    public int? OrderId { get; set; }
    public int? OrderItemId { get; set; }
    public string OrderCode { get; set; } = null!;
    public DateTime PurchaseDate { get; set; }
    public string? Sku { get; set; }
    public string? ServiceName { get; set; }
    public decimal Quantity { get; set; }
    public decimal Revenue { get; set; }

    // Snapshot tại thời điểm chạy rà soát — dòng có thể bị xóa sau đó (mất OrderItemId) nên
    // không thể luôn JOIN sống lại Order/ImportsHistory để lấy các field này.
    public int? ImportHistoryId { get; set; }
    public int? BranchId { get; set; }
    public string? Source { get; set; }

    // Chỉ có giá trị khi MatchType = 'value_mismatch' — số liệu tương ứng bên file nguồn,
    // để so sánh với Quantity/Revenue (số liệu hiện có trong app) ở trên.
    public decimal? SourceQuantity { get; set; }
    public decimal? SourceRevenue { get; set; }

    // 'duplicate' | 'not_in_source' | 'value_mismatch'
    public string MatchType { get; set; } = null!;
    public int? DuplicateOfOrderId { get; set; }
    public int? DuplicateOfImportHistoryId { get; set; }
    public string? Note { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public int? DeletedBy { get; set; }
}
