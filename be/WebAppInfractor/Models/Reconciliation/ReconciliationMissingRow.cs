using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Reconciliation;

[Index(nameof(RunId))]
public class ReconciliationMissingRow
{
    public int Id { get; set; }
    public int RunId { get; set; }
    public string OrderCode { get; set; } = null!;
    public DateTime PurchaseDate { get; set; }
    public string? Sku { get; set; }
    public string? ServiceName { get; set; }
    public decimal Quantity { get; set; }
    public decimal Revenue { get; set; }

    // Lấy thẳng từ dòng file nguồn (đã có sẵn trong SapoImportRowDTO) — không resolve FK vì
    // đây là dữ liệu phía file, không phải DB.
    public string? Source { get; set; }
    public string? BranchName { get; set; }
    public string? Note { get; set; }
}
