using System.Text;
using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Data;
using WebAppInfractor.Models;

namespace WebAppAPI.Services;

public class SapoService
{
    private readonly MemBerContext _db;
    private const string APP_VERSION = "1.0.0-csharp";

    public SapoService(MemBerContext db)
    {
        _db = db;
    }

    // ─── UTILS ────────────────────────────────────────────────────────────────

    private static string RemoveDiacritics(string s)
    {
        if (string.IsNullOrEmpty(s))
            return "";
        var normalized = s.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in normalized)
        {
            if (
                System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c)
                != System.Globalization.UnicodeCategory.NonSpacingMark
            )
                sb.Append(c);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC).Replace('đ', 'd').Replace('Đ', 'D');
    }

    private static string NormalizeHeaderSimple(string s)
    {
        var r = RemoveDiacritics(s ?? "").ToLower().Trim();
        return System.Text.RegularExpressions.Regex.Replace(r, @"\s+", " ");
    }

    private static int FindIdx(List<string> header, params string[] keys)
    {
        foreach (var k in keys)
        {
            var idx = header.IndexOf(NormalizeHeaderSimple(k));
            if (idx >= 0)
                return idx;
        }
        return -1;
    }

    private static string Cell(List<string> row, int idx) =>
        idx >= 0 && idx < row.Count ? (row[idx] ?? "").Trim() : "";

    private static decimal Number(string v)
    {
        if (string.IsNullOrWhiteSpace(v))
            return 0;
        var s = v.Trim().Replace(" ", "").Replace(".", "").Replace(",", ".");
        s = System.Text.RegularExpressions.Regex.Replace(s, @"[^0-9.\-]", "");
        return decimal.TryParse(
            s,
            System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture,
            out var n
        )
            ? n
            : 0;
    }

    private static string NormalizeDate(string? v)
    {
        if (string.IsNullOrWhiteSpace(v))
            return "";
        var s = v.Trim();
        if (System.Text.RegularExpressions.Regex.IsMatch(s, @"^\d{4}-\d{2}-\d{2}"))
            return s[..10];

        // yyyy 4 digits: dd/mm/yyyy
        var m4 = System.Text.RegularExpressions.Regex.Match(
            s,
            @"^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})"
        );
        if (m4.Success)
        {
            var a = int.Parse(m4.Groups[1].Value);
            var b = int.Parse(m4.Groups[2].Value);
            var y = int.Parse(m4.Groups[3].Value);
            if (a > 12)
                return $"{y}-{b:D2}-{a:D2}";
            if (b > 12)
                return $"{y}-{a:D2}-{b:D2}";
            return $"{y}-{b:D2}-{a:D2}"; // dd/mm/yyyy default
        }
        // 2-digit year: mm/dd/yy
        var m2 = System.Text.RegularExpressions.Regex.Match(
            s,
            @"^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$"
        );
        if (m2.Success)
        {
            var year = 2000 + int.Parse(m2.Groups[3].Value);
            var month = int.Parse(m2.Groups[1].Value);
            var day = int.Parse(m2.Groups[2].Value);
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31)
                return $"{year}-{month:D2}-{day:D2}";
        }
        return "";
    }

    private static string AddDays(string yyyyMmDd, int days)
    {
        if (!DateTime.TryParse(yyyyMmDd, out var dt))
            return yyyyMmDd;
        return dt.AddDays(days).ToString("yyyy-MM-dd");
    }

    private static string FormatDisplayDate(string? v)
    {
        var d = NormalizeDate(v);
        if (string.IsNullOrEmpty(d) || d.Length < 10)
            return "";
        return $"{d[8..10]}/{d[5..7]}/{d[..4]}";
    }

    private static string NormalizeSapoCode(string? value)
    {
        var r = RemoveDiacritics(value ?? "").ToUpper().Trim();
        r = r.Replace(" ", "");
        r = System.Text.RegularExpressions.Regex.Replace(r, @"[–—]", "-");
        r = System.Text.RegularExpressions.Regex.Replace(r, @"[^A-Z0-9\-]", "");
        return r;
    }

    private static string ExtractGiftCodeFromName(string? name)
    {
        var s = NormalizeSapoCode(name);
        // (?:-Z[A-Z]*)? — nhận "-Z" hoặc "-Z" kèm bất kỳ chữ nào theo sau (vd "-ZB"), tránh
        // cắt mất chữ cuối như trước đây (bug thật: H1175-ZB bị cắt còn H1175-Z).
        var patterns = new[]
        {
            @"(GN\d{1,4}[A-Z]?(?:-Z[A-Z]*)?)",
            @"(H\d{2,5}[A-Z]?(?:-Z[A-Z]*)?)",
            @"(AT\d{1,3}[A-Z]?(?:-Z[A-Z]*)?)",
            @"(GT\d{2,5}[A-Z]?(?:-Z[A-Z]*)?)",
            @"(BK\d{1,4}[A-Z]?(?:-Z[A-Z]*)?)",
        };
        foreach (var p in patterns)
        {
            var m = System.Text.RegularExpressions.Regex.Match(s, p);
            if (m.Success)
                return m.Groups[1].Value;
        }
        return "";
    }

    private static bool IsGiftMaterialRow(string? productType, string? sku, string? name)
    {
        var skuText = NormalizeSapoCode(sku);
        var hay = RemoveDiacritics($"{productType} {name}").ToLower();
        if (System.Text.RegularExpressions.Regex.IsMatch(skuText, @"^600"))
            return true;
        if (hay.Contains("vat lieu") || hay.Contains("bao bi"))
            return true;
        var words = new[]
        {
            "khay",
            "hop",
            "tui",
            "sot",
            "gio bau duc",
            "gio mat cao",
            "gio tron",
            "mieng lot",
            "ruy bang",
            "no",
            "mang co",
            "de gio",
        };
        return words.Any(w => hay.Contains(w));
    }

    private static string ClassifyBasket(string? sku, string? name)
    {
        var code = (sku ?? "").Trim();
        var map = new Dictionary<string, string>
        {
            ["200-000-000"] = "Giỏ trái cây",
            ["200-000-001"] = "Giỏ trái cây có hoa",
            ["200-000-002"] = "Giỏ trái cây có bánh kẹo",
            ["200-000-003"] = "Giỏ trái cây có hoa và bánh kẹo",
            ["200-000-004"] = "Giỏ trái cây bó hoa",
            ["200-000-005"] = "Giỏ trái cây tráp cưới hỏi",
            ["200-001"] = "Giỏ bánh kẹo",
            ["200-002"] = "Giỏ rượu trái cây",
            ["200-003"] = "Giỏ rau củ",
        };
        if (map.TryGetValue(code, out var val))
            return val;
        foreach (var k in map.Keys.OrderByDescending(k => k.Length))
        {
            if (code.StartsWith(k))
                return map[k];
        }
        return "Nhóm khác";
    }

    private static string PriceBucket(decimal p)
    {
        if (p < 300000)
            return "Dưới 300k";
        if (p < 400000)
            return "300k++";
        if (p < 500000)
            return "400k++";
        if (p < 600000)
            return "500k++";
        if (p < 700000)
            return "600k++";
        if (p < 800000)
            return "700k++";
        if (p < 900000)
            return "800k++";
        if (p < 1000000)
            return "900k++";
        if (p < 1200000)
            return "1tr++";
        if (p < 1500000)
            return "1.2tr++";
        if (p < 2000000)
            return "1.5tr++";
        if (p < 3000000)
            return "2tr++";
        return "3tr++";
    }

    private static int PriceBucketOrder(string label) =>
        label switch
        {
            "Dưới 300k" => 10,
            "300k++" => 20,
            "400k++" => 30,
            "500k++" => 40,
            "600k++" => 50,
            "700k++" => 60,
            "800k++" => 70,
            "900k++" => 80,
            "1tr++" => 90,
            "1.2tr++" => 100,
            "1.5tr++" => 110,
            "2tr++" => 120,
            "3tr++" => 130,
            _ => 999,
        };

    private static string GetNearCodeBase(string code)
    {
        var key = NormalizeSapoCode(code);
        var m = System.Text.RegularExpressions.Regex.Match(
            key,
            @"^((?:H|GN|GT|AT)\d{1,5})([A-Z])$"
        );
        if (m.Success)
            return m.Groups[1].Value;
        m = System.Text.RegularExpressions.Regex.Match(key, @"^((?:H|GN|GT|AT)\d{1,5})-Z[A-Z]*$");
        if (m.Success)
            return m.Groups[1].Value;
        return "";
    }

    private static string NowText()
    {
        var d = DateTime.UtcNow.AddHours(7);
        return d.ToString("yyyy-MM-dd HH:mm:ss");
    }

    // ─── MAPPING ──────────────────────────────────────────────────────────────

    private async Task<Dictionary<string, List<SapoCodeMapping>>> BuildMappingIndexAsync()
    {
        var rows = await _db
            .SapoCodeMappings.Where(r => r.Active)
            .ToListAsync();

        var index = new Dictionary<string, List<SapoCodeMapping>>();
        foreach (var r in rows)
        {
            var newCode = NormalizeSapoCode(r.NewCode);
            if (!index.ContainsKey(newCode))
                index[newCode] = new List<SapoCodeMapping>();
            index[newCode].Add(r);
        }
        foreach (var k in index.Keys)
            index[k] = index[k].OrderByDescending(r => r.EffectiveDate ?? "").ToList();
        return index;
    }

    private static ResolveResult ResolveCode(
        string code,
        Dictionary<string, List<SapoCodeMapping>> index,
        string saleDate
    )
    {
        var key = NormalizeSapoCode(code);
        if (!index.TryGetValue(key, out var list) || list.Count == 0)
            return new ResolveResult
            {
                ReportCode = key,
                ResolveSource = "original",
                MatchedCode = key,
            };

        var saleDateNorm = NormalizeDate(saleDate);
        SapoCodeMapping? chosen = null;
        foreach (var m in list)
        {
            if (
                string.IsNullOrEmpty(m.EffectiveDate)
                || string.IsNullOrEmpty(saleDateNorm)
                || string.Compare(m.EffectiveDate, saleDateNorm) <= 0
            )
            {
                chosen = m;
                break;
            }
        }
        if (chosen == null)
            return new ResolveResult
            {
                ReportCode = key,
                ResolveSource = "original_before_mapping_date",
                MatchedCode = key,
            };

        var oldNorm = NormalizeSapoCode(chosen.OldCode);
        var newNorm = NormalizeSapoCode(chosen.NewCode);
        return new ResolveResult
        {
            ReportCode = oldNorm,
            ResolveSource = "mapping",
            MatchedCode = newNorm,
            MappingPrice = chosen.Price,
            MappingDate = chosen.EffectiveDate,
            MappingNote = chosen.Note,
            AutoGroupNote = $"Gộp từ mã Sapo: {newNorm}; Báo cáo về: {oldNorm}",
        };
    }

    private static List<SapoSalesRow> ApplyNearCodeAutoGrouping(List<SapoSalesRow> salesRows)
    {
        var directBasePrices = new Dictionary<string, HashSet<long>>();
        foreach (var r in salesRows)
        {
            var code = NormalizeSapoCode(r.ReportCode ?? r.SapoCode ?? "");
            if (string.IsNullOrEmpty(code) || !string.IsNullOrEmpty(GetNearCodeBase(code)))
                continue;
            if (!directBasePrices.ContainsKey(code))
                directBasePrices[code] = new HashSet<long>();
            directBasePrices[code].Add((long)Math.Round(r.Price));
        }
        foreach (var r in salesRows)
        {
            if ((r.ResolveSource ?? "").StartsWith("mapping"))
                continue;
            var code = NormalizeSapoCode(r.ReportCode ?? r.SapoCode ?? "");
            var baseCode = GetNearCodeBase(code);
            if (string.IsNullOrEmpty(baseCode) || baseCode == code)
                continue;
            if (!directBasePrices.TryGetValue(baseCode, out var prices) || prices.Count != 1)
                continue;
            var basePrice = prices.First();
            if (Math.Round(r.Price) != basePrice)
                continue;
            r.ReportCode = baseCode;
            r.ReportName = baseCode;
            r.ResolveSource = "auto_same_base_same_price";
            r.MatchedCode = code;
            r.AutoGroupNote = $"Gộp từ mã Sapo: {code}; Báo cáo về: {baseCode}";
        }
        return salesRows;
    }

    // ─── AUTO-GENERATE TỪ ORDER IMPORT ──────────────────────────────────────────
    // Chỉ xử lý SKU bắt đầu bằng 200 (giỏ mẫu), 600 (giỏ tự chọn), hoặc 700 mà tên
    // sản phẩm có "Túi vải" (giỏ tự chọn đóng bằng túi vải, không có mã 600 riêng).
    // Kết quả được group-by (ngày, chi nhánh, sku, sapoCode) rồi cộng qty/doanh thu.
    // Caller chịu trách nhiệm AddRangeAsync + SaveChangesAsync (để nằm trong cùng transaction).
    // Đơn có "DỊCH VỤ ĐÓNG GÓI" hoặc "DỊCH VỤ GÓI QUÀ" trong cột Tên dịch vụ (ServiceName)
    // nhưng không có SKU 600 → giỏ tự chọn không có mã chuẩn; dùng mã đơn hàng làm định danh
    // giống SKU 600. Trước đây chỉ nhận "đóng gói", bỏ sót đơn dùng tên "gói quà" — đơn đó
    // không khớp Nhánh 1 (Sku rỗng) lẫn Nhánh 2, nên bị rớt hoàn toàn khỏi Sapo bán.
    private static bool IsPackagingServiceRow(string? serviceName)
    {
        var normalized = RemoveDiacritics((serviceName ?? "").ToUpperInvariant());
        return normalized.Contains("DICH VU DONG GOI") || normalized.Contains("DICH VU GOI QUA");
    }

    public async Task<List<SapoSalesRow>> BuildRowsFromOrderItemsAsync(
        IEnumerable<SapoImportRowDTO> rows,
        int importHistoryId,
        string uploadedBy
    )
    {
        var uploadedAt = NowText();
        var batchId = $"ORDER-{importHistoryId}";
        var mappingIndex = await BuildMappingIndexAsync();
        var rowList = rows.ToList();

        // ── Nhánh 1: SKU 200 (giỏ mẫu) / SKU 600 (giỏ tự chọn có mã) ──────────
        // Aggregate: (date, branch, sku, sapoCode) → sum qty / revenue / count orders
        var handledOrderCodes = rowList
            .Where(r =>
            {
                var s = (r.Sku ?? "").Trim();
                var isTuiVai = RemoveDiacritics((r.ProductName ?? "").ToUpperInvariant()).Contains("TUI VAI");
                if (s.StartsWith("200")) return true;
                if (s.StartsWith("600")) return !isTuiVai;
                return false;
            })
            .Select(r => r.OrderCode)
            .ToHashSet();

        var grouped = rowList
            .Where(r =>
            {
                var sku = (r.Sku ?? "").Trim();
                var isTuiVai = RemoveDiacritics((r.ProductName ?? "").ToUpperInvariant()).Contains("TUI VAI");
                if (sku.StartsWith("200")) return true;
                // SKU 600 mà tên SP là "Túi vải" → phụ kiện đóng gói, không phải giỏ → bỏ qua
                if (sku.StartsWith("600")) return !isTuiVai;
                return false;
            })
            .Select(r =>
            {
                var sku = (r.Sku ?? "").Trim();
                string sapoCode;
                if (sku.StartsWith("200"))
                {
                    sapoCode = ExtractGiftCodeFromName(r.ProductName);
                    if (string.IsNullOrEmpty(sapoCode))
                        sapoCode = ExtractGiftCodeFromName(sku);
                    if (string.IsNullOrEmpty(sapoCode))
                        sapoCode = sku;
                }
                else
                {
                    // SKU 600 (giỏ tự chọn) — dùng mã đơn hàng làm mã định danh
                    sapoCode = r.OrderCode;
                }
                return new
                {
                    Date = r.PurchaseDate.ToString("yyyy-MM-dd"),
                    Branch = string.IsNullOrEmpty(r.BranchName) ? "Chưa rõ" : r.BranchName,
                    r.Category,
                    Sku = sku,
                    SapoCode = sapoCode,
                    r.ProductName,
                    r.UnitPrice,
                    r.Quantity,
                    r.Revenue,
                };
            })
            .GroupBy(x => (x.Date, x.Branch, x.Sku, x.SapoCode))
            .ToList();

        var result = new List<SapoSalesRow>(grouped.Count);
        foreach (var g in grouped)
        {
            var first = g.First();
            var qty = g.Sum(x => x.Quantity);
            var revenue = g.Sum(x => x.Revenue);
            var price = qty != 0 ? Math.Abs(revenue / qty) : first.UnitPrice;
            var date = g.Key.Date;
            var sapoCode = g.Key.SapoCode;

            var resolved = ResolveCode(sapoCode, mappingIndex, date);
            var reportCode = resolved.ReportCode ?? sapoCode;

            result.Add(new SapoSalesRow
            {
                BatchId = batchId,
                Date = date,
                Branch = g.Key.Branch,
                ProductType = first.Category,
                Sku = g.Key.Sku,
                SapoCode = sapoCode,
                ReportCode = reportCode,
                ReportName = reportCode,
                ProductName = first.ProductName,
                BasketGroup = ClassifyBasket(g.Key.Sku, first.ProductName),
                PriceBucket = PriceBucket(price),
                Price = price,
                Qty = qty,
                Orders = g.Count(),
                Revenue = revenue,
                NetRevenue = revenue,
                ResolveSource = resolved.ResolveSource,
                MatchedCode = resolved.MatchedCode,
                MappingPrice = resolved.MappingPrice,
                MappingDate = resolved.MappingDate,
                MappingNote = resolved.MappingNote,
                AutoGroupNote = resolved.AutoGroupNote,
                Warning = "",
                UploadedBy = uploadedBy,
                UploadedAt = uploadedAt,
                ImportHistoryId = importHistoryId,
            });
        }

        // ── Nhánh 2: Đơn có "DỊCH VỤ ĐÓNG GÓI" nhưng không có SKU 200/600 ──────
        // Mỗi đơn = 1 giỏ tự chọn, qty=1, revenue = tổng tất cả dòng trong đơn.
        var packagingOrderCodes = rowList
            .Where(r => IsPackagingServiceRow(r.ServiceName) && !handledOrderCodes.Contains(r.OrderCode))
            .Select(r => r.OrderCode)
            .ToHashSet();

        if (packagingOrderCodes.Count > 0)
        {
            var packagingGrouped = rowList
                .Where(r => packagingOrderCodes.Contains(r.OrderCode))
                .GroupBy(r => (
                    Date: r.PurchaseDate.ToString("yyyy-MM-dd"),
                    Branch: string.IsNullOrEmpty(r.BranchName) ? "Chưa rõ" : r.BranchName,
                    OrderCode: r.OrderCode
                ))
                .ToList();

            foreach (var g in packagingGrouped)
            {
                var revenue = g.Sum(x => x.Revenue);
                var sapoCode = g.Key.OrderCode;
                var date = g.Key.Date;
                var resolved = ResolveCode(sapoCode, mappingIndex, date);
                var reportCode = resolved.ReportCode ?? sapoCode;

                result.Add(new SapoSalesRow
                {
                    BatchId = batchId,
                    Date = date,
                    Branch = g.Key.Branch,
                    ProductType = "Giỏ tự chọn",
                    Sku = "",
                    SapoCode = sapoCode,
                    ReportCode = reportCode,
                    ReportName = reportCode,
                    ProductName = "DỊCH VỤ ĐÓNG GÓI",
                    BasketGroup = "Nhóm khác",
                    PriceBucket = PriceBucket(revenue),
                    Price = revenue,
                    Qty = 1,
                    Orders = 1,
                    Revenue = revenue,
                    NetRevenue = revenue,
                    ResolveSource = resolved.ResolveSource,
                    MatchedCode = resolved.MatchedCode,
                    MappingPrice = resolved.MappingPrice,
                    MappingDate = resolved.MappingDate,
                    MappingNote = resolved.MappingNote,
                    AutoGroupNote = resolved.AutoGroupNote,
                    Warning = "",
                    UploadedBy = uploadedBy,
                    UploadedAt = uploadedAt,
                    ImportHistoryId = importHistoryId,
                });
            }
        }

        return ApplyNearCodeAutoGrouping(result);
    }

    // Đồng bộ NxtRow.SapoSold TRỰC TIẾP từ Order/OrderItem — KHÔNG qua SapoSalesRow, không
    // ResolveCode/ApplyNearCodeAutoGrouping. Lý do: các cột khác trên cùng dòng NxtRow (GiftIn,
    // Tồn CN, Chuyển CN, Hủy giỏ, Điều chỉnh) đều dùng mã THÔ do nhân viên tự gõ tay
    // (NormalizeItemCode chỉ trim/uppercase, không quy đổi qua bảng mapping) — nếu SapoSold dùng
    // mã đã gộp/đổi tên (ReportCode) sẽ lệch khóa (CloseDate, Branch, ItemCode) với các cột kia
    // mỗi khi có mã từng đổi tên, làm sai công thức tồn kho thực tế. Việc quy đổi/gộp mã biến
    // thể vẫn có ý nghĩa riêng cho Dashboard Giỏ Quà (xem BuildRowsFromOrderItemsAsync/ResolveCode),
    // chỉ không áp dụng cho NxtRow.
    // Gọi sau import (sau khi OrderItem đã SaveChanges) VÀ sau rollback (sau khi OrderItem đã xóa).
    public async Task SyncNxtSapoSoldFromOrdersAsync(IEnumerable<DateTime> affectedPurchaseDates)
    {
        var dateSet = affectedPurchaseDates.Select(d => d.Date).Distinct().ToHashSet();
        if (dateSet.Count == 0) return;

        var minDate = dateSet.Min();
        var maxDate = dateSet.Max().AddDays(1);

        var rows = await (
            from oi in _db.OrderItems
            join o in _db.Orders on oi.OrderId equals o.Id
            where o.DeletedAt == null && o.PurchaseDate >= minDate && o.PurchaseDate < maxDate
            select new
            {
                oi.Sku,
                oi.ProductName,
                oi.ServiceName,
                oi.Quantity,
                oi.Revenue,
                o.OrderCode,
                o.PurchaseDate,
                BranchName = o.Branches != null ? o.Branches.Name : null,
            }
        ).AsNoTracking().ToListAsync();

        var relevantRows = rows.Where(r => dateSet.Contains(r.PurchaseDate.Date)).ToList();

        // Nhánh 1: SKU 200 (giỏ mẫu) / 600 (giỏ tự chọn, trừ "Túi vải") — mã THÔ
        bool IsRelevantSku(string sku, string productName)
        {
            var isTuiVai = RemoveDiacritics((productName ?? "").ToUpperInvariant()).Contains("TUI VAI");
            if (sku.StartsWith("200")) return true;
            if (sku.StartsWith("600")) return !isTuiVai;
            return false;
        }

        var handledOrderCodes = relevantRows
            .Where(r => IsRelevantSku((r.Sku ?? "").Trim(), r.ProductName))
            .Select(r => r.OrderCode)
            .ToHashSet();

        var branch1 = relevantRows
            .Where(r => IsRelevantSku((r.Sku ?? "").Trim(), r.ProductName))
            .Select(r =>
            {
                var sku = (r.Sku ?? "").Trim();
                string rawCode;
                if (sku.StartsWith("200"))
                {
                    rawCode = ExtractGiftCodeFromName(r.ProductName);
                    if (string.IsNullOrEmpty(rawCode))
                        rawCode = ExtractGiftCodeFromName(sku);
                    if (string.IsNullOrEmpty(rawCode))
                        rawCode = sku;
                }
                else
                {
                    // SKU 600 (giỏ tự chọn) — dùng mã đơn hàng làm mã định danh
                    rawCode = r.OrderCode;
                }
                return new
                {
                    CloseDate = r.PurchaseDate.ToString("dd/MM/yyyy"),
                    Branch = string.IsNullOrEmpty(r.BranchName) ? "Chưa rõ" : r.BranchName,
                    RawCode = rawCode,
                    r.Quantity,
                    r.Revenue,
                };
            });

        // Nhánh 2: đơn có "DỊCH VỤ ĐÓNG GÓI/GÓI QUÀ" nhưng không có SKU 200/600/700-túi-vải nào
        // trong đơn — mỗi đơn = 1 giỏ tự chọn, qty=1, doanh thu = tổng các dòng trong đơn.
        var branch2 = relevantRows
            .Where(r => IsPackagingServiceRow(r.ServiceName) && !handledOrderCodes.Contains(r.OrderCode))
            .GroupBy(r => new
            {
                r.OrderCode,
                CloseDate = r.PurchaseDate.ToString("dd/MM/yyyy"),
                Branch = string.IsNullOrEmpty(r.BranchName) ? "Chưa rõ" : r.BranchName,
            })
            .Select(g => new
            {
                g.Key.CloseDate,
                g.Key.Branch,
                RawCode = g.Key.OrderCode,
                Quantity = 1m,
                Revenue = g.Sum(x => x.Revenue),
            });

        var aggregated = branch1.Concat(branch2)
            .GroupBy(x => (x.CloseDate, x.Branch, ItemCode: (x.RawCode ?? "").Trim()))
            .Where(g => !string.IsNullOrEmpty(g.Key.ItemCode))
            .Select(g => new
            {
                g.Key.CloseDate,
                g.Key.Branch,
                g.Key.ItemCode,
                SapoSold = g.Sum(x => x.Quantity),
                Revenue = g.Sum(x => x.Revenue),
                OrderCount = (decimal)g.Count(),
            })
            .ToList();

        var activeKeys = new HashSet<(string, string, string)>(
            aggregated.Select(a => (a.CloseDate, a.Branch, a.ItemCode))
        );

        // Load NxtRows cho MỌI closeDate nằm trong dateSet (kể cả khi rollback xóa hết dữ liệu
        // của ngày đó và aggregated không còn entry nào cho ngày đó nữa) để zero-out đúng.
        var closeDatesToLoad = dateSet.Select(d => d.ToString("dd/MM/yyyy")).ToHashSet();
        var nxtRows = await _db.NxtRows
            .Where(r => closeDatesToLoad.Contains(r.CloseDate))
            .ToListAsync();

        // SET SapoSold cho từng aggregated group
        foreach (var agg in aggregated)
        {
            var existing = nxtRows.FirstOrDefault(r =>
                r.CloseDate == agg.CloseDate &&
                r.Branch == agg.Branch &&
                r.ItemCode == agg.ItemCode
            );

            if (existing != null)
            {
                existing.SapoSold = agg.SapoSold;
                existing.Revenue = agg.Revenue;
                existing.OrderCount = agg.OrderCount;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _db.NxtRows.Add(new WebAppInfractor.Models.NxtRow
                {
                    CloseDate = agg.CloseDate,
                    Branch = agg.Branch,
                    ItemCode = agg.ItemCode,
                    SapoSold = agg.SapoSold,
                    Revenue = agg.Revenue,
                    OrderCount = agg.OrderCount,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
            }
        }

        // Với NxtRows cũ có SapoSold != 0 nhưng không còn nằm trong aggregated → reset về 0
        // (không xóa NxtRow vì các cột khác như GiftIn/Tồn CN có thể vẫn còn dữ liệu).
        foreach (var nxt in nxtRows.Where(r => r.SapoSold != 0))
        {
            var key = (nxt.CloseDate, nxt.Branch, nxt.ItemCode);
            if (!activeKeys.Contains(key))
            {
                nxt.SapoSold = 0;
                nxt.Revenue = 0;
                nxt.OrderCount = 0;
                nxt.UpdatedAt = DateTime.UtcNow;
            }
        }
    }

    private static string ToCloseDate(string isoDate)
    {
        if (DateTime.TryParseExact(isoDate, "yyyy-MM-dd",
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None, out var d))
            return d.ToString("dd/MM/yyyy");
        return isoDate;
    }

    // ─── DASHBOARD ────────────────────────────────────────────────────────────

    public async Task<object> GetDashboardAsync(string filterKey = "last7")
    {
        var allRows = await _db.SapoSalesRows.ToListAsync();
        var reportRows = allRows.Where(IsDashboardReportRow).ToList();
        var filtered = FilterRows(reportRows, filterKey);
        return BuildDashboardState(filtered, allRows, reportRows, filterKey);
    }

    public async Task<object> GetDashboardByRangeAsync(string fromDate, string toDate)
    {
        var from = NormalizeDate(fromDate);
        var to = NormalizeDate(toDate);
        if (string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to))
            throw new BadRequestException("Vui lòng chọn đủ Từ ngày và Đến ngày.");
        if (string.Compare(from, to) > 0)
            throw new BadRequestException("Từ ngày không được lớn hơn Đến ngày.");
        var allRows = await _db.SapoSalesRows.ToListAsync();
        var reportRows = allRows.Where(IsDashboardReportRow).ToList();
        var filtered = reportRows
            .Where(r => string.Compare(r.Date, from) >= 0 && string.Compare(r.Date, to) <= 0)
            .ToList();
        return BuildDashboardState(
            filtered,
            allRows,
            filtered,
            "custom_range",
            new Dictionary<string, object> { ["fromDate"] = from, ["toDate"] = to }
        );
    }

    public async Task<object> GetDashboardByMonthAsync(string month)
    {
        var ym = (month ?? "").Trim();
        if (ym.Length >= 7)
            ym = ym[..7];
        if (!System.Text.RegularExpressions.Regex.IsMatch(ym, @"^\d{4}-\d{2}$"))
            throw new BadRequestException("Vui lòng chọn tháng hợp lệ.");
        var parts = ym.Split('-');
        int y = int.Parse(parts[0]),
            m = int.Parse(parts[1]);
        int lastDay = DateTime.DaysInMonth(y, m);
        return await GetDashboardByRangeAsync($"{ym}-01", $"{ym}-{lastDay:D2}");
    }

    // ─── DASHBOARD HELPERS ────────────────────────────────────────────────────

    private static bool IsDashboardReportRow(SapoSalesRow row)
    {
        if (row == null)
            return false;
        // Dùng Warning field đã lưu khi import — tránh re-evaluate IsGiftMaterialRow
        // vì rows từ order import (SKU 600 = giỏ tự chọn) không phải vật liệu bao bì.
        if (row.Warning == "MATERIAL_EXCLUDED_FROM_DASHBOARD")
            return false;
        var code = (row.ReportCode ?? row.SapoCode ?? "").Trim();
        return !string.IsNullOrEmpty(code);
    }

    private static SapoSalesRow NormalizeRowForDashboard(SapoSalesRow r)
    {
        var copy = new SapoSalesRow
        {
            Id = r.Id,
            BatchId = r.BatchId,
            Date = r.Date,
            Branch = r.Branch,
            ProductType = r.ProductType,
            Sku = r.Sku,
            SapoCode = r.SapoCode,
            ReportCode = r.ReportCode,
            ReportName = r.ReportName,
            ProductName = r.ProductName,
            Price = r.Price,
            Qty = r.Qty,
            Orders = r.Orders,
            Revenue = r.Revenue,
            NetRevenue = r.NetRevenue,
            ResolveSource = r.ResolveSource,
            MatchedCode = r.MatchedCode,
            MappingPrice = r.MappingPrice,
            MappingDate = r.MappingDate,
            MappingNote = r.MappingNote,
            AutoGroupNote = r.AutoGroupNote,
            Warning = r.Warning,
            UploadedBy = r.UploadedBy,
            UploadedAt = r.UploadedAt,
            CreatedAt = r.CreatedAt,
        };
        copy.BasketGroup = ClassifyBasket(copy.Sku, copy.ProductName);
        copy.PriceBucket = PriceBucket(
            copy.Price != 0 ? copy.Price : (copy.Qty != 0 ? Math.Abs(copy.Revenue / copy.Qty) : 0)
        );
        return copy;
    }

    private static List<SapoSalesRow> FilterRows(List<SapoSalesRow> rows, string filterKey)
    {
        var dates = rows.Select(r => NormalizeDate(r.Date))
            .Where(d => !string.IsNullOrEmpty(d))
            .Distinct()
            .OrderBy(d => d)
            .ToList();
        if (dates.Count == 0)
            return new List<SapoSalesRow>();
        var latest = dates.Last();
        if (filterKey == "all")
            return rows;
        if (filterKey == "latest_month")
        {
            var ym = latest[..7];
            return rows.Where(r => (r.Date ?? "").Length >= 7 && r.Date![..7] == ym).ToList();
        }
        if (filterKey == "latest")
            return rows.Where(r => NormalizeDate(r.Date) == latest).ToList();
        if (filterKey == "last30")
        {
            var from = AddDays(latest, -29);
            return rows.Where(r =>
                {
                    var d = NormalizeDate(r.Date);
                    return string.Compare(d, from) >= 0 && string.Compare(d, latest) <= 0;
                })
                .ToList();
        }
        // default last7
        {
            var from = AddDays(latest, -6);
            return rows.Where(r =>
                {
                    var d = NormalizeDate(r.Date);
                    return string.Compare(d, from) >= 0 && string.Compare(d, latest) <= 0;
                })
                .ToList();
        }
    }

    private static List<AggregateItem> Aggregate(
        List<SapoSalesRow> rows,
        Func<SapoSalesRow, string> keyFn
    )
    {
        var map = new Dictionary<string, AggregateItem>();
        foreach (var r in rows)
        {
            var k = keyFn(r) ?? "Chưa rõ";
            if (!map.ContainsKey(k))
                map[k] = new AggregateItem { Key = k, Label = k };
            map[k].NetRevenue += r.NetRevenue;
            map[k].Revenue += r.Revenue;
            map[k].Qty += r.Qty;
            map[k].Orders += r.Orders;
            map[k].RowCount++;
            var note = (r.AutoGroupNote ?? "").Trim();
            if (!string.IsNullOrEmpty(note))
                map[k].GroupNotes.Add(note);
        }
        foreach (var item in map.Values)
        {
            item.GroupNote =
                item.GroupNotes.Count > 0 ? string.Join("; ", item.GroupNotes.OrderBy(n => n)) : "";
            item.Aov = item.Qty != 0 ? (double)(item.Revenue / item.Qty) : 0;
        }
        return map.Values.ToList();
    }

    private static MetricsSummary SummarizeRows(List<SapoSalesRow> rows)
    {
        var m = new MetricsSummary { RowCount = rows.Count };
        foreach (var r in rows)
        {
            m.NetRevenue += r.NetRevenue;
            m.Revenue += r.Revenue;
            m.Qty += r.Qty;
            m.Orders += r.Orders;
        }
        m.Aov = m.Qty != 0 ? m.Revenue / m.Qty : 0;
        return m;
    }

    private object BuildDashboardState(
        List<SapoSalesRow> filtered,
        List<SapoSalesRow> allRows,
        List<SapoSalesRow> reportRows,
        string filterKey,
        Dictionary<string, object>? extra = null
    )
    {
        var normalizedFiltered = filtered.Select(NormalizeRowForDashboard).ToList();
        var normalizedReportRows = reportRows.Select(NormalizeRowForDashboard).ToList();
        var metrics = SummarizeRows(normalizedFiltered);

        // Add material/ accessory revenue to the 2 total cards only (to match Sapo file totals)
        var filteredDateSet = new HashSet<string>(
            normalizedFiltered
                .Select(r => (r.Date ?? "").Length >= 10 ? r.Date![..10] : (r.Date ?? ""))
                .Where(d => !string.IsNullOrEmpty(d))
        );
        foreach (
            var r in allRows.Where(r =>
                IsGiftMaterialRow(r.ProductType, r.Sku, r.ProductName)
                && !string.IsNullOrEmpty(r.Date)
                && filteredDateSet.Contains(r.Date.Length >= 10 ? r.Date[..10] : r.Date)
            )
        )
        {
            metrics.Revenue += r.Revenue;
            metrics.NetRevenue += r.NetRevenue;
        }

        var allDataDates = normalizedReportRows
            .Select(r => NormalizeDate(r.Date))
            .Where(d => !string.IsNullOrEmpty(d))
            .Distinct()
            .OrderBy(d => d)
            .ToList();
        var latestDataDate = allDataDates.LastOrDefault() ?? "";
        var firstDataDate = allDataDates.FirstOrDefault() ?? "";
        var allDataDateRange = string.IsNullOrEmpty(firstDataDate)
            ? "Chưa có dữ liệu"
            : firstDataDate
                + (
                    !string.IsNullOrEmpty(latestDataDate) && latestDataDate != firstDataDate
                        ? " đến " + latestDataDate
                        : ""
                );

        var filteredDates = normalizedFiltered
            .Select(r => (r.Date ?? "")[..Math.Min(10, (r.Date ?? "").Length)])
            .Where(d => !string.IsNullOrEmpty(d))
            .Distinct()
            .OrderBy(d => d)
            .ToList();
        var dateRange =
            filteredDates.Count > 0
                ? filteredDates.First()
                    + (filteredDates.Count > 1 ? " đến " + filteredDates.Last() : "")
                : "Chưa có dữ liệu";

        var byDay = Aggregate(normalizedFiltered, r => r.Date ?? "").OrderBy(a => a.Key).ToList();
        var monthRows = normalizedReportRows
            .Where(r => (r.Date ?? "").Length >= 7)
            .Select(r => new SapoSalesRow
            {
                Date = r.Date![..7],
                Branch = r.Branch,
                Sku = r.Sku,
                ProductName = r.ProductName,
                BasketGroup = r.BasketGroup,
                PriceBucket = r.PriceBucket,
                ReportCode = r.ReportCode,
                Qty = r.Qty,
                Orders = r.Orders,
                Revenue = r.Revenue,
                NetRevenue = r.NetRevenue,
                AutoGroupNote = r.AutoGroupNote,
            })
            .ToList();
        var byMonth = Aggregate(monthRows, r => r.Date ?? "")
            .OrderBy(a => a.Key)
            .TakeLast(12)
            .ToList();
        var byGroup = Aggregate(normalizedFiltered, r => r.BasketGroup ?? "Nhóm khác")
            .OrderByDescending(a => a.Qty)
            .ThenByDescending(a => a.NetRevenue)
            .ToList();
        var byPrice = Aggregate(normalizedFiltered, r => r.PriceBucket ?? "Dưới 300k")
            .OrderBy(a => PriceBucketOrder(a.Key))
            .ToList();
        var byCode = Aggregate(normalizedFiltered, r => r.ReportCode ?? "")
            .OrderByDescending(a => a.NetRevenue)
            .ToList();

        // "Cập nhật" = lần gần nhất có SapoSalesRow được sinh ra (từ import đơn hàng) — không
        // còn phụ thuộc SapoImportBatch (flow upload file Sapo độc lập đã gỡ bỏ).
        var lastImportedAt = allRows.Count > 0 ? allRows.Max(r => r.UploadedAt) : "Chưa có";
        var mappingCount = _db.SapoCodeMappings.Count();

        var result = new Dictionary<string, object?>
        {
            ["ok"] = true,
            ["appVersion"] = APP_VERSION,
            ["filterKey"] = filterKey,
            ["totalSalesRows"] = allRows.Count,
            ["dateRange"] = dateRange,
            ["latestDataDate"] = latestDataDate,
            ["firstDataDate"] = firstDataDate,
            ["allDataDateRange"] = allDataDateRange,
            ["allDataDateRangeText"] = System.Text.RegularExpressions.Regex.Replace(
                allDataDateRange,
                @"\d{4}-\d{2}-\d{2}",
                d =>
                    FormatDisplayDate(d.Value) is var fd && !string.IsNullOrEmpty(fd) ? fd : d.Value
            ),
            ["latestDataDateText"] = FormatDisplayDate(latestDataDate),
            ["lastImportedAt"] = lastImportedAt,
            ["mappingCount"] = mappingCount,
            ["metrics"] = metrics,
            ["quickInsights"] = BuildQuickInsights(normalizedFiltered, byGroup, byPrice, byCode),
            ["usefulAnalysis"] = BuildUsefulAnalysis(normalizedFiltered, byCode, byGroup, byPrice),
            ["byDay"] = byDay,
            ["byMonth"] = byMonth,
            ["byGroup"] = byGroup,
            ["byBasketType"] = byGroup,
            ["byBranch"] = Aggregate(normalizedFiltered, r => r.Branch ?? "")
                .OrderByDescending(a => a.NetRevenue)
                .ToList(),
            ["byPrice"] = byPrice,
            ["byCode"] = byCode,
        };
        if (extra != null)
            foreach (var kv in extra)
                result[kv.Key] = kv.Value;
        return result;
    }

    private static object BuildQuickInsights(
        List<SapoSalesRow> filtered,
        List<AggregateItem> byGroup,
        List<AggregateItem> byPrice,
        List<AggregateItem> byCode
    )
    {
        var byDay = Aggregate(filtered, r => r.Date ?? "")
            .OrderByDescending(a => a.NetRevenue)
            .ToList();
        var bestDay = byDay.FirstOrDefault();
        var bestGroup = byGroup.FirstOrDefault();
        var bestCode = byCode.FirstOrDefault();
        var bestPrice = byPrice.OrderByDescending(a => a.NetRevenue).FirstOrDefault();
        return new
        {
            bestDay = bestDay != null
                ? new
                {
                    date = bestDay.Key,
                    label = FormatDisplayDate(bestDay.Key) is var l && !string.IsNullOrEmpty(l)
                        ? l
                        : bestDay.Key,
                    value = bestDay.NetRevenue,
                }
                : null,
            bestGroup = bestGroup != null
                ? new
                {
                    label = bestGroup.Label,
                    qty = bestGroup.Qty,
                    value = bestGroup.NetRevenue,
                }
                : null,
            bestCode = bestCode != null
                ? new
                {
                    label = bestCode.Key,
                    sub = bestCode.GroupNote,
                    value = bestCode.NetRevenue,
                }
                : null,
            bestPrice = bestPrice != null
                ? new { label = bestPrice.Label, value = bestPrice.NetRevenue }
                : null,
        };
    }

    private static object BuildUsefulAnalysis(
        List<SapoSalesRow> filtered,
        List<AggregateItem> byCode,
        List<AggregateItem> byGroup,
        List<AggregateItem> byPrice
    )
    {
        var totalRevenue = filtered.Sum(r => r.NetRevenue);
        var totalQty = filtered.Sum(r => r.Qty);
        var avgAov = totalQty != 0 ? totalRevenue / totalQty : 0;
        var topCode = byCode.FirstOrDefault();
        var topShare =
            topCode != null && totalRevenue != 0
                ? Math.Round((double)(topCode.NetRevenue / totalRevenue) * 1000) / 10
                : 0;

        var codeDayMap =
            new Dictionary<
                string,
                (
                    string code,
                    HashSet<string> days,
                    decimal qty,
                    decimal orders,
                    decimal netRevenue,
                    decimal revenue
                )
            >();
        foreach (var r in filtered)
        {
            var code = (r.ReportCode ?? "").Trim();
            var d = NormalizeDate(r.Date);
            if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(d))
                continue;
            if (!codeDayMap.ContainsKey(code))
                codeDayMap[code] = (code, new HashSet<string>(), 0, 0, 0, 0);
            var v = codeDayMap[code];
            v.days.Add(d);
            codeDayMap[code] = (
                v.code,
                v.days,
                v.qty + r.Qty,
                v.orders + r.Orders,
                v.netRevenue + r.NetRevenue,
                v.revenue + r.Revenue
            );
        }
        var repeatList = codeDayMap
            .Values.Select(x => new
            {
                x.code,
                dayCount = x.days.Count,
                x.orders,
                x.qty,
                x.netRevenue,
            })
            .Where(x => x.dayCount >= 2)
            .OrderByDescending(x => x.dayCount)
            .ThenByDescending(x => x.orders)
            .ThenByDescending(x => x.netRevenue)
            .ToList();
        var repeatByDay = repeatList.FirstOrDefault();

        var codeWithAov = byCode
            .Where(x => x.Orders > 0 && x.Qty > 0)
            .Select(x => new
            {
                x.Key,
                x.NetRevenue,
                x.Revenue,
                x.Qty,
                x.Orders,
                revenuePerOrder = x.NetRevenue / x.Orders,
                aovByBasket = x.Revenue / x.Qty,
            })
            .ToList();

        var highValueCode = codeWithAov
            .OrderByDescending(x => x.aovByBasket)
            .ThenByDescending(x => x.NetRevenue)
            .FirstOrDefault();
        var volumeLowAov = codeWithAov
            .Where(x => x.Qty >= 2 && (avgAov == 0 || x.aovByBasket < avgAov))
            .OrderByDescending(x => x.Qty)
            .ThenByDescending(x => x.Orders)
            .FirstOrDefault();

        var bestGroup = byGroup.FirstOrDefault();
        var bestPrice = byPrice.OrderByDescending(a => a.NetRevenue).FirstOrDefault();

        return new
        {
            topShare = topCode != null
                ? new
                {
                    code = topCode.Key,
                    share = topShare,
                    revenue = topCode.NetRevenue,
                }
                : null,
            repeatByDay = repeatByDay != null
                ? new
                {
                    code = repeatByDay.code,
                    dayCount = repeatByDay.dayCount,
                    orders = repeatByDay.orders,
                    qty = repeatByDay.qty,
                    netRevenue = repeatByDay.netRevenue,
                    note = $"Mã giỏ này có phát sinh bán trong {repeatByDay.dayCount} ngày của kỳ xem.",
                }
                : null,
            repeatList = repeatList
                .Take(5)
                .Select(x => new
                {
                    x.code,
                    x.dayCount,
                    x.orders,
                    x.qty,
                    x.netRevenue,
                }),
            highValueCode = highValueCode != null
                ? new
                {
                    code = highValueCode.Key,
                    value = highValueCode.aovByBasket,
                    qty = highValueCode.Qty,
                    orders = highValueCode.Orders,
                    netRevenue = highValueCode.NetRevenue,
                }
                : null,
            volumeLowAov = volumeLowAov != null
                ? new
                {
                    code = volumeLowAov.Key,
                    value = volumeLowAov.aovByBasket,
                    qty = volumeLowAov.Qty,
                    orders = volumeLowAov.Orders,
                    netRevenue = volumeLowAov.NetRevenue,
                }
                : null,
            bestGroup = bestGroup != null
                ? new
                {
                    label = bestGroup.Label,
                    qty = bestGroup.Qty,
                    netRevenue = bestGroup.NetRevenue,
                }
                : null,
            bestPrice = bestPrice != null
                ? new
                {
                    label = bestPrice.Label,
                    qty = bestPrice.Qty,
                    netRevenue = bestPrice.NetRevenue,
                }
                : null,
            dataReadiness = new
            {
                repeatCustomer = "Chỉ số bán lặp lại đang tính theo số ngày mã giỏ phát sinh bán, không tính theo từng khách hàng.",
            },
        };
    }

    // ─── DTOs / HELPERS ───────────────────────────────────────────────────────

    private record ResolveResult
    {
        public string? ReportCode { get; init; }
        public string? ResolveSource { get; init; }
        public string? MatchedCode { get; init; }
        public decimal? MappingPrice { get; init; }
        public string? MappingDate { get; init; }
        public string? MappingNote { get; init; }
        public string? AutoGroupNote { get; init; }
    }

    private class AggregateItem
    {
        public string Key { get; set; } = "";
        public string Label { get; set; } = "";
        public decimal NetRevenue { get; set; }
        public decimal Revenue { get; set; }
        public decimal Qty { get; set; }
        public decimal Orders { get; set; }
        public int RowCount { get; set; }
        public HashSet<string> GroupNotes { get; } = new();
        public string GroupNote { get; set; } = "";
        public double Aov { get; set; }
    }

    public class MetricsSummary
    {
        public int RowCount { get; set; }
        public decimal NetRevenue { get; set; }
        public decimal Revenue { get; set; }
        public decimal Qty { get; set; }
        public decimal Orders { get; set; }
        public decimal Aov { get; set; }
    }

}
