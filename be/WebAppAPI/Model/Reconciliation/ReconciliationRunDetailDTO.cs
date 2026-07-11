public class ReconciliationRunDetailDTO
{
    public ReconciliationRunSummaryDTO Run { get; set; } = new();
    public List<ReconciliationExcessRowDTO> ExcessRows { get; set; } = new();
    public List<ReconciliationMissingRowDTO> MissingRows { get; set; } = new();

    // Tổng hợp dòng dư + lệch giá trị theo nhóm — giúp khoanh vùng nhanh trước khi lật từng dòng.
    public List<ReconciliationBreakdownItemDTO> ByBranch { get; set; } = new();
    public List<ReconciliationBreakdownItemDTO> BySource { get; set; } = new();
    public List<ReconciliationBreakdownItemDTO> ByImporter { get; set; } = new();
}
