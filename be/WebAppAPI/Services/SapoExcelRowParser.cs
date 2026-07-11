using System.Globalization;
using System.Text;
using ClosedXML.Excel;

// Parser dùng chung cho định dạng Excel xuất từ Sapo — được cả ImportExcelAsync
// (OrderService) và ReconciliationService dùng, đảm bảo đọc đúng CÙNG 1 format cột.
public static class SapoExcelRowParser
{
    public static SapoExcelColumnMap ParseHeader(IXLRangeRow headerRow)
    {
        var rawHeaders = Enumerable
            .Range(1, headerRow.LastCellUsed()?.Address.ColumnNumber ?? 30)
            .Select(c => NormalizeImportHeader(headerRow.Cell(c).GetString()))
            .ToList();

        var map = new SapoExcelColumnMap
        {
            Date = FindImportCol(rawHeaders, "ngay mua", "ngay dat hang", "ngay"),
            CustName = FindImportCol(rawHeaders, "ten khach hang", "ten khach", "khach hang"),
            Phone = FindImportCol(rawHeaders, "dien thoai", "so dien thoai", "sdt"),
            CustCode = FindImportCol(rawHeaders, "ma khach hang", "ma khach"),
            Category = FindImportCol(rawHeaders, "loai san pham", "nhom hang", "danh muc", "loai hang"),
            Product = FindImportCol(rawHeaders, "ten hang", "ten san pham"),
            Sku = FindImportCol(rawHeaders, "ma hang", "sku", "ma sku"),
            UnitPrice = FindImportCol(rawHeaders, "don gia", "gia ban"),
            Service = FindImportCol(rawHeaders, "ten dich vu", "dich vu"),
            Unit = FindImportCol(rawHeaders, "dvt", "don vi tinh", "don vi"),
            OrderCode = FindImportCol(rawHeaders, "ma don hang", "ma don", "so don"),
            Status = FindImportCol(rawHeaders, "trang thai"),
            Branch = FindImportCol(rawHeaders, "chi nhanh"),
            Source = FindImportCol(rawHeaders, "kenh ban", "nguon", "kenh"),
            Revenue = FindImportCol(rawHeaders, "doanh thu", "thanh tien"),
            Shipping = FindImportCol(rawHeaders, "phi van chuyen", "phi ship", "phi giao"),
            Tax = FindImportCol(rawHeaders, "thue", "vat", "tien thue"),
            GrossProfit = FindImportCol(rawHeaders, "loi nhuan gop", "loi nhuan"),
            // Số lượng: ưu tiên "SL hàng thực bán" (cột thực tế), fallback "SL hàng bán ra"
            QtyStr = FindImportCol(rawHeaders, "sl hang ban ra", "so luong hang ban", "so luong"),
            Qty = FindImportCol(
                rawHeaders,
                "sl hang thuc ban",
                "sl thuc ban",
                "so luong thuc ban",
                "sl hang ban ra",
                "so luong"
            ),
        };

        var missingCols = new List<string>();
        if (map.Date < 0) missingCols.Add("Ngày");
        if (map.CustName < 0) missingCols.Add("Tên khách hàng");
        if (map.Phone < 0) missingCols.Add("SĐT khách hàng");
        if (map.CustCode < 0) missingCols.Add("Mã khách hàng");
        if (map.Category < 0) missingCols.Add("Loại sản phẩm");
        if (map.Product < 0) missingCols.Add("Tên sản phẩm");
        if (map.Sku < 0) missingCols.Add("Mã SKU");
        if (map.UnitPrice < 0) missingCols.Add("Đơn giá bán");
        if (map.Service < 0) missingCols.Add("Tên dịch vụ");
        if (map.Unit < 0) missingCols.Add("Đơn vị tính");
        if (map.OrderCode < 0) missingCols.Add("Mã đơn hàng");
        if (map.Status < 0) missingCols.Add("Trạng thái đơn hàng");
        if (map.Branch < 0) missingCols.Add("Tên chi nhánh");
        if (map.Source < 0) missingCols.Add("Tên nguồn đơn hàng");
        if (map.QtyStr < 0) missingCols.Add("SL hàng bán ra");
        if (map.Qty < 0) missingCols.Add("SL hàng thực bán");
        if (map.Tax < 0) missingCols.Add("Tiền thuế");
        if (map.Shipping < 0) missingCols.Add("Phí giao hàng");
        if (map.Revenue < 0) missingCols.Add("Doanh thu");
        map.MissingColumns = missingCols;

        return map;
    }

    public static void EnsureNoMissingColumns(SapoExcelColumnMap map)
    {
        if (map.MissingColumns.Any())
            throw new BadRequestException(
                $"File Excel không đúng định dạng — không tìm thấy {map.MissingColumns.Count} cột: {string.Join(", ", map.MissingColumns)}. "
                    + "Vui lòng xuất lại file từ Sapo đúng mẫu."
            );
    }

    public static SapoImportRowDTO ParseRow(IXLRangeRow row, SapoExcelColumnMap map)
    {
        // Đọc dữ liệu thô theo index động (chống lệch cột)
        var dateCell = row.Cell(map.Date + 1).GetString().Trim();
        if (
            !DateTime.TryParseExact(
                dateCell,
                "dd/MM/yyyy",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var orderDate
            )
        )
        {
            throw new BadRequestException($"Ngày mua không hợp lệ: '{dateCell}'");
        }

        var customerCode = row.Cell(map.CustCode + 1).GetString().Trim();
        var orderCode = row.Cell(map.OrderCode + 1).GetString().Trim();

        // Validate dữ liệu bắt buộc
        if (string.IsNullOrWhiteSpace(customerCode))
            throw new BadRequestException("Mã khách hàng không được để trống");
        if (string.IsNullOrWhiteSpace(orderCode))
            throw new BadRequestException("Mã đơn hàng không được để trống");

        return new SapoImportRowDTO
        {
            RowNumber = row.RowNumber(),
            PurchaseDate = orderDate,
            CustomerName = map.CustName >= 0 ? row.Cell(map.CustName + 1).GetString().Trim() : "",
            CustomerPhone = map.Phone >= 0 ? row.Cell(map.Phone + 1).GetString().Trim() : "",
            CustomerCode = customerCode,
            Category = map.Category >= 0 ? row.Cell(map.Category + 1).GetString().Trim() : "",
            ProductName = map.Product >= 0 ? row.Cell(map.Product + 1).GetString().Trim() : "",
            Sku = map.Sku >= 0 ? row.Cell(map.Sku + 1).GetString().Trim() : "",
            UnitPrice = map.UnitPrice >= 0 ? GetDecimal(row.Cell(map.UnitPrice + 1)) : 0,
            ServiceName = map.Service >= 0 ? row.Cell(map.Service + 1).GetString().Trim() : "",
            Unit = map.Unit >= 0 ? row.Cell(map.Unit + 1).GetString().Trim() : "",
            OrderCode = orderCode,
            StatusName = row.Cell(map.Status + 1).GetString().Trim(),
            BranchName = row.Cell(map.Branch + 1).GetString().Trim(),
            Source = map.Source >= 0 ? row.Cell(map.Source + 1).GetString().Trim() : "",
            QuantityStr = map.QtyStr >= 0 ? row.Cell(map.QtyStr + 1).GetString().Trim() : "",
            Revenue = GetDecimal(row.Cell(map.Revenue + 1)),
            GrossProfit = map.GrossProfit >= 0 ? GetDecimal(row.Cell(map.GrossProfit + 1)) : 0,
            ShippingFee = map.Shipping >= 0 ? GetDecimal(row.Cell(map.Shipping + 1)) : 0,
            TaxAmount = map.Tax >= 0 ? GetDecimal(row.Cell(map.Tax + 1)) : 0,
            Quantity = GetDecimal(row.Cell(map.Qty + 1)),
        };
    }

    // Chuẩn hoá fingerprint để tránh precision mismatch (320714.50 vs 320714.5)
    public static string MakeFingerprint(string code, DateTime date, decimal rev, decimal qty, string sku, string svc) =>
        $"{code}|{date:yyyyMMdd}|{Math.Round(rev, 0, MidpointRounding.AwayFromZero)}|{Math.Round(qty, 4)}|{sku}|{svc}";

    public static string NormalizeImportHeader(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return "";
        var normalized = raw.Trim().ToLowerInvariant();
        var sb = new StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            if (
                c
                is 'à'
                    or 'á'
                    or 'ả'
                    or 'ã'
                    or 'ạ'
                    or 'ă'
                    or 'ắ'
                    or 'ặ'
                    or 'ằ'
                    or 'ẳ'
                    or 'ẵ'
                    or 'â'
                    or 'ấ'
                    or 'ầ'
                    or 'ẩ'
                    or 'ẫ'
                    or 'ậ'
            )
                sb.Append('a');
            else if (c is 'è' or 'é' or 'ẻ' or 'ẽ' or 'ẹ' or 'ê' or 'ế' or 'ề' or 'ể' or 'ễ' or 'ệ')
                sb.Append('e');
            else if (c is 'ì' or 'í' or 'ỉ' or 'ĩ' or 'ị')
                sb.Append('i');
            else if (
                c
                is 'ò'
                    or 'ó'
                    or 'ỏ'
                    or 'õ'
                    or 'ọ'
                    or 'ô'
                    or 'ố'
                    or 'ồ'
                    or 'ổ'
                    or 'ỗ'
                    or 'ộ'
                    or 'ơ'
                    or 'ớ'
                    or 'ờ'
                    or 'ở'
                    or 'ỡ'
                    or 'ợ'
            )
                sb.Append('o');
            else if (c is 'ù' or 'ú' or 'ủ' or 'ũ' or 'ụ' or 'ư' or 'ứ' or 'ừ' or 'ử' or 'ữ' or 'ự')
                sb.Append('u');
            else if (c is 'ỳ' or 'ý' or 'ỷ' or 'ỹ' or 'ỵ')
                sb.Append('y');
            else if (c == 'đ')
                sb.Append('d');
            else if (char.IsLetterOrDigit(c))
                sb.Append(c);
            else if (c == ' ' || c == '_' || c == '-')
                sb.Append(' ');
        }
        return string.Join(" ", sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private static int FindImportCol(List<string> headers, params string[] candidates)
    {
        foreach (var candidate in candidates)
            for (int i = 0; i < headers.Count; i++)
                if (headers[i] == candidate || headers[i].Contains(candidate))
                    return i;
        return -1;
    }

    public static decimal GetDecimal(IXLCell cell)
    {
        try
        {
            if (cell.IsEmpty())
                return 0;

            return cell.GetValue<decimal>();
        }
        catch
        {
            var str = cell.GetString()?.Trim().Replace(",", ".");
            if (
                !string.IsNullOrEmpty(str)
                && decimal.TryParse(
                    str,
                    NumberStyles.Any,
                    CultureInfo.InvariantCulture,
                    out var parsed
                )
            )
                return parsed;
            Console.WriteLine(
                $"[Import] Không đọc được số tại cell {cell.Address}: '{cell.GetString()}'"
            );
            return 0;
        }
    }
}
