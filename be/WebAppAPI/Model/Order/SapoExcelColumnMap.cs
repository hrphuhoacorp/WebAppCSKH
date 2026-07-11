public class SapoExcelColumnMap
{
    public int Date { get; set; } = -1;
    public int CustName { get; set; } = -1;
    public int Phone { get; set; } = -1;
    public int CustCode { get; set; } = -1;
    public int Category { get; set; } = -1;
    public int Product { get; set; } = -1;
    public int Sku { get; set; } = -1;
    public int UnitPrice { get; set; } = -1;
    public int Service { get; set; } = -1;
    public int Unit { get; set; } = -1;
    public int OrderCode { get; set; } = -1;
    public int Status { get; set; } = -1;
    public int Branch { get; set; } = -1;
    public int Source { get; set; } = -1;
    public int Revenue { get; set; } = -1;
    public int Shipping { get; set; } = -1;
    public int Tax { get; set; } = -1;
    public int GrossProfit { get; set; } = -1;
    public int QtyStr { get; set; } = -1;
    public int Qty { get; set; } = -1;

    public List<string> MissingColumns { get; set; } = new List<string>();
}
