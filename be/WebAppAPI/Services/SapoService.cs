using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
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
        if (string.IsNullOrEmpty(s)) return "";
        var normalized = s.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in normalized)
        {
            if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) !=
                System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC)
            .Replace('đ', 'd').Replace('Đ', 'D');
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
            if (idx >= 0) return idx;
        }
        return -1;
    }

    private static string Cell(List<string> row, int idx) =>
        idx >= 0 && idx < row.Count ? (row[idx] ?? "").Trim() : "";

    private static decimal Number(string v)
    {
        if (string.IsNullOrWhiteSpace(v)) return 0;
        var s = v.Trim().Replace(" ", "").Replace(".", "").Replace(",", ".");
        s = System.Text.RegularExpressions.Regex.Replace(s, @"[^0-9.\-]", "");
        return decimal.TryParse(s, System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var n) ? n : 0;
    }

    private static string NormalizeDate(string? v)
    {
        if (string.IsNullOrWhiteSpace(v)) return "";
        var s = v.Trim();
        if (System.Text.RegularExpressions.Regex.IsMatch(s, @"^\d{4}-\d{2}-\d{2}"))
            return s[..10];

        // yyyy 4 digits: dd/mm/yyyy
        var m4 = System.Text.RegularExpressions.Regex.Match(s, @"^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})");
        if (m4.Success)
        {
            var a = int.Parse(m4.Groups[1].Value);
            var b = int.Parse(m4.Groups[2].Value);
            var y = int.Parse(m4.Groups[3].Value);
            if (a > 12) return $"{y}-{b:D2}-{a:D2}";
            if (b > 12) return $"{y}-{a:D2}-{b:D2}";
            return $"{y}-{b:D2}-{a:D2}"; // dd/mm/yyyy default
        }
        // 2-digit year: mm/dd/yy
        var m2 = System.Text.RegularExpressions.Regex.Match(s, @"^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$");
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
        if (!DateTime.TryParse(yyyyMmDd, out var dt)) return yyyyMmDd;
        return dt.AddDays(days).ToString("yyyy-MM-dd");
    }

    private static string FormatDisplayDate(string? v)
    {
        var d = NormalizeDate(v);
        if (string.IsNullOrEmpty(d) || d.Length < 10) return "";
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
        var patterns = new[]
        {
            @"(GN\d{1,4}[A-Z]?(?:-Z)?)",
            @"(H\d{2,5}[A-Z]?(?:-Z)?)",
            @"(AT\d{1,3}[A-Z]?(?:-Z)?)",
            @"(GT\d{2,5}[A-Z]?(?:-Z)?)"
        };
        foreach (var p in patterns)
        {
            var m = System.Text.RegularExpressions.Regex.Match(s, p);
            if (m.Success) return m.Groups[1].Value;
        }
        return "";
    }

    private static bool IsGiftMaterialRow(string? productType, string? sku, string? name)
    {
        var skuText = NormalizeSapoCode(sku);
        var hay = RemoveDiacritics($"{productType} {name}").ToLower();
        if (System.Text.RegularExpressions.Regex.IsMatch(skuText, @"^600")) return true;
        if (hay.Contains("vat lieu") || hay.Contains("bao bi")) return true;
        var words = new[] { "khay", "hop", "tui", "sot", "gio bau duc", "gio mat cao", "gio tron", "mieng lot", "ruy bang", "no", "mang co", "de gio" };
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
            ["200-003"] = "Giỏ rau củ"
        };
        if (map.TryGetValue(code, out var val)) return val;
        foreach (var k in map.Keys.OrderByDescending(k => k.Length))
        {
            if (code.StartsWith(k)) return map[k];
        }
        return "Nhóm khác";
    }

    private static string PriceBucket(decimal p)
    {
        if (p < 300000) return "Dưới 300k";
        if (p < 400000) return "300k++";
        if (p < 500000) return "400k++";
        if (p < 600000) return "500k++";
        if (p < 700000) return "600k++";
        if (p < 800000) return "700k++";
        if (p < 900000) return "800k++";
        if (p < 1000000) return "900k++";
        if (p < 1200000) return "1tr++";
        if (p < 1500000) return "1.2tr++";
        if (p < 2000000) return "1.5tr++";
        if (p < 3000000) return "2tr++";
        return "3tr++";
    }

    private static int PriceBucketOrder(string label) => label switch
    {
        "Dưới 300k" => 10, "300k++" => 20, "400k++" => 30, "500k++" => 40,
        "600k++" => 50, "700k++" => 60, "800k++" => 70, "900k++" => 80,
        "1tr++" => 90, "1.2tr++" => 100, "1.5tr++" => 110, "2tr++" => 120,
        "3tr++" => 130, _ => 999
    };

    private static string GetNearCodeBase(string code)
    {
        var key = NormalizeSapoCode(code);
        var m = System.Text.RegularExpressions.Regex.Match(key, @"^((?:H|GN|GT|AT)\d{1,5})([A-Z])$");
        if (m.Success) return m.Groups[1].Value;
        m = System.Text.RegularExpressions.Regex.Match(key, @"^((?:H|GN|GT|AT)\d{1,5})-Z$");
        if (m.Success) return m.Groups[1].Value;
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
        var rows = await _db.SapoCodeMappings
            .Where(r => r.Active.ToUpper() != "FALSE")
            .ToListAsync();

        var index = new Dictionary<string, List<SapoCodeMapping>>();
        foreach (var r in rows)
        {
            var newCode = NormalizeSapoCode(r.NewCode);
            if (!index.ContainsKey(newCode)) index[newCode] = new List<SapoCodeMapping>();
            index[newCode].Add(r);
        }
        foreach (var k in index.Keys)
            index[k] = index[k].OrderByDescending(r => r.EffectiveDate ?? "").ToList();
        return index;
    }

    private static ResolveResult ResolveCode(string code, Dictionary<string, List<SapoCodeMapping>> index, string saleDate)
    {
        var key = NormalizeSapoCode(code);
        if (!index.TryGetValue(key, out var list) || list.Count == 0)
            return new ResolveResult { ReportCode = key, ResolveSource = "original", MatchedCode = key };

        var saleDateNorm = NormalizeDate(saleDate);
        SapoCodeMapping? chosen = null;
        foreach (var m in list)
        {
            if (string.IsNullOrEmpty(m.EffectiveDate) || string.IsNullOrEmpty(saleDateNorm) ||
                string.Compare(m.EffectiveDate, saleDateNorm) <= 0)
            { chosen = m; break; }
        }
        if (chosen == null)
            return new ResolveResult { ReportCode = key, ResolveSource = "original_before_mapping_date", MatchedCode = key };

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
            AutoGroupNote = $"Gộp từ mã Sapo: {newNorm}; Báo cáo về: {oldNorm}"
        };
    }

    // ─── PARSE EXCEL / CSV ────────────────────────────────────────────────────

    private static List<List<string>> MatrixFromBytes(byte[] bytes, string fileName)
    {
        if (System.Text.RegularExpressions.Regex.IsMatch(fileName, @"\.xlsx?$", System.Text.RegularExpressions.RegexOptions.IgnoreCase))
            return ParseXlsx(bytes);
        return ParseCsvSmart(Encoding.UTF8.GetString(bytes));
    }

    private static List<List<string>> ParseXlsx(byte[] bytes)
    {
        var result = new List<List<string>>();
        using var ms = new MemoryStream(bytes);
        using var wb = new XLWorkbook(ms);
        var ws = wb.Worksheets.First();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
        var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
        for (int r = 1; r <= lastRow; r++)
        {
            var row = new List<string>();
            for (int c = 1; c <= lastCol; c++)
                row.Add((ws.Cell(r, c).GetString() ?? "").Trim());
            if (row.Any(v => !string.IsNullOrWhiteSpace(v)))
                result.Add(row);
        }
        return result;
    }

    private static List<List<string>> ParseCsvSmart(string text)
    {
        text = text.TrimStart('﻿').Replace("\r\n", "\n").Replace("\r", "\n");
        var first = string.Join("\n", text.Split('\n').Take(3));
        var delimiter = (first.Count(c => c == ';') > first.Count(c => c == ',')) ? ';' : ',';
        var rows = new List<List<string>>();
        var row = new List<string>();
        var cur = new StringBuilder();
        bool q = false;
        for (int i = 0; i < text.Length; i++)
        {
            var ch = text[i];
            if (ch == '"') { if (q && i + 1 < text.Length && text[i + 1] == '"') { cur.Append('"'); i++; } else q = !q; }
            else if (ch == delimiter && !q) { row.Add(cur.ToString()); cur.Clear(); }
            else if (ch == '\n' && !q) { row.Add(cur.ToString()); rows.Add(row); row = new List<string>(); cur.Clear(); }
            else cur.Append(ch);
        }
        if (cur.Length > 0 || row.Count > 0) { row.Add(cur.ToString()); rows.Add(row); }
        return rows.Where(r => r.Any(c => !string.IsNullOrWhiteSpace(c))).ToList();
    }

    // ─── IMPORT LOGIC ─────────────────────────────────────────────────────────

    private static List<SapoSalesRow> ParseSalesRows(
        List<List<string>> matrix,
        string batchId, string uploadedAt, string uploadedBy,
        Dictionary<string, List<SapoCodeMapping>> mappingIndex,
        ImportStats stats)
    {
        var rows = new List<SapoSalesRow>();
        if (matrix.Count == 0) return rows;
        var header = matrix[0].Select(NormalizeHeaderSimple).ToList();

        bool hasAny(params string[] keys) => keys.Any(k => header.Contains(NormalizeHeaderSimple(k)));
        var hasAJ = hasAny("ngay") && hasAny("ma sku", "sku") && hasAny("ten phien ban") && hasAny("sl hang thuc ban");
        var hasAlt = hasAny("ngay tao don", "ngay") && hasAny("ma sku", "sku") && hasAny("ten san pham", "san pham") && hasAny("so luong", "sl hang thuc ban");
        if (!hasAJ && !hasAlt) return rows;

        var idx = new
        {
            date = FindIdx(header, hasAJ ? "ngay" : "ngay tao don", "ngay"),
            branch = FindIdx(header, "chi nhanh", "cua hang", "kho"),
            productType = FindIdx(header, "loai san pham", "nhom san pham", "danh muc"),
            sku = FindIdx(header, "ma sku", "sku"),
            name = hasAJ
                ? FindIdx(header, "ten phien ban", "ten san pham", "san pham")
                : FindIdx(header, "ten san pham", "san pham", "ten phien ban"),
            price = FindIdx(header, "don gia ban", "gia ban", "don gia"),
            qty = FindIdx(header, "sl hang thuc ban", "so luong", "sl ban"),
            orders = FindIdx(header, "sl don hang", "so don hang", "don hang"),
            revenue = FindIdx(header, "doanh thu"),
            netRevenue = FindIdx(header, "doanh thu thuan")
        };

        for (int i = 1; i < matrix.Count; i++)
        {
            var r = matrix[i];
            var date = NormalizeDate(Cell(r, idx.date));
            var productName = Cell(r, idx.name);
            var sku = Cell(r, idx.sku);
            var productType = Cell(r, idx.productType);
            if (string.IsNullOrEmpty(date) || string.IsNullOrEmpty(productName)) continue;

            var qty = Number(Cell(r, idx.qty));
            var orders = Number(Cell(r, idx.orders));
            var revenue = Number(Cell(r, idx.revenue));
            var netRevenue = Number(Cell(r, idx.netRevenue));
            if ((qty != 0 || orders != 0) && revenue == 0 && netRevenue == 0) { stats.ZeroRevenueSkipped++; continue; }

            var price = Number(Cell(r, idx.price));
            if (price == 0 && qty != 0) price = Math.Abs(revenue / qty);

            var sapoCode = ExtractGiftCodeFromName(sku);
            if (string.IsNullOrEmpty(sapoCode)) sapoCode = ExtractGiftCodeFromName(productName ?? "");
            if (string.IsNullOrEmpty(sapoCode)) sapoCode = sku;
            var resolved = ResolveCode(sapoCode, mappingIndex, date);
            var reportCode = resolved.ReportCode ?? sapoCode;
            var material = IsGiftMaterialRow(productType, sku, productName);

            rows.Add(new SapoSalesRow
            {
                BatchId = batchId,
                Date = date,
                Branch = Cell(r, idx.branch) is var br && !string.IsNullOrEmpty(br) ? br : "Chưa rõ",
                ProductType = productType,
                Sku = sku,
                SapoCode = sapoCode,
                ReportCode = reportCode,
                ReportName = reportCode,
                ProductName = productName,
                BasketGroup = ClassifyBasket(sku, productName),
                PriceBucket = PriceBucket(price),
                Price = price,
                Qty = qty,
                Orders = orders,
                Revenue = revenue,
                NetRevenue = netRevenue,
                ResolveSource = resolved.ResolveSource,
                MatchedCode = resolved.MatchedCode,
                MappingPrice = resolved.MappingPrice,
                MappingDate = resolved.MappingDate,
                MappingNote = resolved.MappingNote,
                AutoGroupNote = resolved.AutoGroupNote,
                Warning = material ? "MATERIAL_EXCLUDED_FROM_DASHBOARD" : "",
                UploadedBy = uploadedBy,
                UploadedAt = uploadedAt
            });
        }
        return rows;
    }

    private static List<SapoSalesRow> ApplyNearCodeAutoGrouping(List<SapoSalesRow> salesRows)
    {
        var directBasePrices = new Dictionary<string, HashSet<long>>();
        foreach (var r in salesRows)
        {
            var code = NormalizeSapoCode(r.ReportCode ?? r.SapoCode ?? "");
            if (string.IsNullOrEmpty(code) || !string.IsNullOrEmpty(GetNearCodeBase(code))) continue;
            if (!directBasePrices.ContainsKey(code)) directBasePrices[code] = new HashSet<long>();
            directBasePrices[code].Add((long)Math.Round(r.Price));
        }
        foreach (var r in salesRows)
        {
            if ((r.ResolveSource ?? "").StartsWith("mapping")) continue;
            var code = NormalizeSapoCode(r.ReportCode ?? r.SapoCode ?? "");
            var baseCode = GetNearCodeBase(code);
            if (string.IsNullOrEmpty(baseCode) || baseCode == code) continue;
            if (!directBasePrices.TryGetValue(baseCode, out var prices) || prices.Count != 1) continue;
            var basePrice = prices.First();
            if (Math.Round(r.Price) != basePrice) continue;
            r.ReportCode = baseCode;
            r.ReportName = baseCode;
            r.ResolveSource = "auto_same_base_same_price";
            r.MatchedCode = code;
            r.AutoGroupNote = $"Gộp từ mã Sapo: {code}; Báo cáo về: {baseCode}";
        }
        return salesRows;
    }

    private static (List<SapoSalesRow> rows, int skipped) DedupeSalesRows(List<SapoSalesRow> rows)
    {
        var seen = new HashSet<string>();
        var kept = new List<SapoSalesRow>();
        int skipped = 0;
        foreach (var r in rows)
        {
            var key = JsonSerializer.Serialize(new
            {
                date = r.Date, branch = r.Branch, productType = r.ProductType, sku = r.Sku,
                sapoCode = r.SapoCode, productName = r.ProductName,
                price = (long)Math.Round(r.Price), qty = r.Qty, orders = r.Orders,
                revenue = (long)Math.Round(r.Revenue), netRevenue = (long)Math.Round(r.NetRevenue),
                reportCode = r.ReportCode
            });
            if (seen.Contains(key)) { skipped++; continue; }
            seen.Add(key);
            kept.Add(r);
        }
        return (kept, skipped);
    }

    // ─── PUBLIC IMPORT ────────────────────────────────────────────────────────

    public async Task<ImportDashboardResult> ImportDashboardFilesAsync(
        byte[] sapoBytes, string sapoFileName,
        byte[]? mappingBytes, string? mappingFileName,
        string uploadedBy = "webapp.local")
    {
        var uploadedAt = NowText();
        var batchId = "IMP-" + uploadedAt.Replace("-", "").Replace(":", "").Replace(" ", "").Substring(0, 14)
                      + "-" + Random.Shared.Next(10000);

        var matrix = MatrixFromBytes(sapoBytes, sapoFileName);

        var mappingResult = new MappingImportResult { MappingCount = await _db.SapoCodeMappings.CountAsync() };
        if (mappingBytes != null && !string.IsNullOrEmpty(mappingFileName))
            mappingResult = await ImportMappingBytesAsync(mappingBytes, mappingFileName, uploadedAt);

        var mappingIndex = await BuildMappingIndexAsync();
        var stats = new ImportStats();
        var parsed = ApplyNearCodeAutoGrouping(ParseSalesRows(matrix, batchId, uploadedAt, uploadedBy, mappingIndex, stats));
        var (salesRows, dupSkipped) = DedupeSalesRows(parsed);
        stats.DuplicateRowsSkipped = dupSkipped;

        if (salesRows.Count == 0)
            return new ImportDashboardResult
            {
                Ok = false, AppVersion = APP_VERSION,
                Message = "Backend đã đọc file nhưng chưa nhận ra dòng bán hàng.",
                ImportResult = new ImportResultInfo { RowCount = 0, MappingCount = mappingResult.MappingCount, MappingResult = mappingResult }
            };

        var dates = salesRows.Select(r => r.Date).Distinct().Where(d => !string.IsNullOrEmpty(d)).ToList();
        var existingInDates = await _db.SapoSalesRows.Where(r => dates.Contains(r.Date)).ToListAsync();
        bool changed = !SameSignature(existingInDates, salesRows);
        bool mappingChanged = mappingResult.Added > 0;

        var metrics = SummarizeRows(salesRows);
        var dateRange = dates.Count > 0 ? dates.Min() + (dates.Count > 1 ? " đến " + dates.Max() : "") : "";
        var warningCount = salesRows.Count(r => !string.IsNullOrEmpty(r.Warning)) + stats.ZeroRevenueSkipped + dupSkipped + mappingResult.Changed;

        if (!changed && !mappingChanged)
        {
            return new ImportDashboardResult
            {
                Ok = true, AppVersion = APP_VERSION, Time = uploadedAt,
                Message = $"File đã được kiểm tra. Không có dữ liệu Sapo mới cần cập nhật cho {dates.Count} ngày.",
                ImportResult = new ImportResultInfo
                {
                    BatchId = batchId, SapoFileName = sapoFileName, RowCount = salesRows.Count,
                    DateRange = dateRange, NetRevenue = metrics.NetRevenue, Revenue = metrics.Revenue,
                    Qty = metrics.Qty, Orders = metrics.Orders, MappingCount = mappingResult.MappingCount,
                    WarningCount = warningCount, UploadedBy = uploadedBy, SkippedNoChange = true,
                    MappingResult = mappingResult
                }
            };
        }

        if (changed)
        {
            var toRemove = existingInDates;
            _db.SapoSalesRows.RemoveRange(toRemove);
            await _db.SapoSalesRows.AddRangeAsync(salesRows);
        }

        var batchRow = new SapoImportBatch
        {
            BatchId = batchId, ImportedAt = uploadedAt, SapoFileName = sapoFileName,
            MappingFileName = mappingFileName, RowCount = salesRows.Count, DateRange = dateRange,
            NetRevenue = metrics.NetRevenue, Revenue = metrics.Revenue, Qty = metrics.Qty,
            Orders = metrics.Orders, MappingCount = mappingResult.MappingCount,
            WarningCount = warningCount, UploadedBy = uploadedBy, Version = APP_VERSION
        };
        await _db.SapoImportBatches.AddAsync(batchRow);
        await _db.SaveChangesAsync();

        var msgParts = new List<string>
        {
            changed
                ? $"Đã cập nhật {salesRows.Count} dòng bán hàng cho {dates.Count} ngày dữ liệu."
                : "Dữ liệu Sapo không thay đổi, giữ nguyên dữ liệu cũ.",
            $"Đã bỏ {stats.ZeroRevenueSkipped} dòng doanh thu = 0. Đã bỏ {dupSkipped} dòng trùng giống hệt."
        };
        if (mappingBytes != null)
            msgParts.Add($"Mapping: thêm {mappingResult.Added}, bỏ qua {mappingResult.Skipped}, cảnh báo {mappingResult.Changed}.");

        return new ImportDashboardResult
        {
            Ok = true, AppVersion = APP_VERSION, Time = uploadedAt,
            Message = string.Join("\n", msgParts),
            ImportResult = new ImportResultInfo
            {
                BatchId = batchId, SapoFileName = sapoFileName, RowCount = salesRows.Count,
                DateRange = dateRange, NetRevenue = metrics.NetRevenue, Revenue = metrics.Revenue,
                Qty = metrics.Qty, Orders = metrics.Orders, MappingCount = mappingResult.MappingCount,
                WarningCount = warningCount, UploadedBy = uploadedBy, MappingResult = mappingResult
            }
        };
    }

    private static bool SameSignature(List<SapoSalesRow> a, List<SapoSalesRow> b)
    {
        static object Key(SapoSalesRow r) => new
        {
            r.Date, r.Branch, r.ProductType, r.Sku, r.SapoCode, r.ProductName,
            price = (long)Math.Round(r.Price), r.Qty, r.Orders,
            revenue = (long)Math.Round(r.Revenue), netRevenue = (long)Math.Round(r.NetRevenue),
            r.ReportCode
        };
        var sigA = JsonSerializer.Serialize(a.Select(Key).OrderBy(k => JsonSerializer.Serialize(k)));
        var sigB = JsonSerializer.Serialize(b.Select(Key).OrderBy(k => JsonSerializer.Serialize(k)));
        return sigA == sigB;
    }

    // ─── MAPPING IMPORT ───────────────────────────────────────────────────────

    private async Task<MappingImportResult> ImportMappingBytesAsync(byte[] bytes, string fileName, string uploadedAt)
    {
        var matrix = MatrixFromBytes(bytes, fileName);
        var result = new MappingImportResult { MappingCount = await _db.SapoCodeMappings.CountAsync() };
        if (matrix.Count == 0) return result;

        // Find header row
        int headerRow = 0;
        for (int i = 0; i < Math.Min(matrix.Count, 12); i++)
        {
            var h = matrix[i].Select(NormalizeHeaderSimple).ToList();
            var oldIdx = FindIdx(h, "oldCode", "old code", "ma truoc", "ma goc", "ma bao cao", "ma cu");
            var newIdx = FindIdx(h, "newCode", "new code", "ma sau", "ma moi", "ma sapo", "ma dang ban");
            if (oldIdx >= 0 && newIdx >= 0) { headerRow = i; break; }
        }

        var header = matrix[headerRow].Select(NormalizeHeaderSimple).ToList();
        var idxOld = FindIdx(header, "oldCode", "old code", "ma truoc", "ma goc", "ma bao cao", "ma cu");
        var idxNew = FindIdx(header, "newCode", "new code", "ma sau", "ma moi", "ma sapo", "ma dang ban");
        var idxPrice = FindIdx(header, "price", "gia", "don gia", "gia ban");
        var idxDate = FindIdx(header, "effectiveDate", "effective date", "ngay ap dung", "ngay", "tu ngay");
        var idxNote = FindIdx(header, "note", "ghi chu", "dien giai", "noi dung");
        var idxActive = FindIdx(header, "active", "kich hoat", "trang thai");

        if (idxOld < 0) idxOld = 0;
        if (idxNew < 0) idxNew = 1;
        if (idxPrice < 0) idxPrice = 2;
        if (idxDate < 0) idxDate = 3;
        if (idxNote < 0) idxNote = 4;

        var incoming = new List<SapoCodeMapping>();
        for (int i = headerRow + 1; i < matrix.Count; i++)
        {
            var r = matrix[i];
            var oldCode = NormalizeSapoCode(Cell(r, idxOld));
            var newCode = NormalizeSapoCode(Cell(r, idxNew));
            if (string.IsNullOrEmpty(oldCode) || string.IsNullOrEmpty(newCode)) continue;
            incoming.Add(new SapoCodeMapping
            {
                OldCode = oldCode, NewCode = newCode,
                Price = Number(Cell(r, idxPrice)) is var p && p != 0 ? p : null,
                EffectiveDate = NormalizeDate(Cell(r, idxDate)),
                Note = Cell(r, idxNote),
                Active = idxActive >= 0 ? (Cell(r, idxActive) is var a && !string.IsNullOrEmpty(a) ? a : "TRUE") : "TRUE",
                UploadedAt = uploadedAt,
                Source = fileName
            });
        }

        static string KeyOf(SapoCodeMapping r) =>
            $"{NormalizeSapoCode(r.OldCode)}|{NormalizeSapoCode(r.NewCode)}|{NormalizeDate(r.EffectiveDate)}";

        var existing = await _db.SapoCodeMappings.ToListAsync();
        var existingByKey = existing.ToDictionary(KeyOf);

        var toAdd = new List<SapoCodeMapping>();
        foreach (var r in incoming)
        {
            result.Total++;
            var key = KeyOf(r);
            if (!existingByKey.ContainsKey(key))
            {
                toAdd.Add(r); existingByKey[key] = r; result.Added++;
            }
            else result.Skipped++;
        }

        if (toAdd.Count > 0)
        {
            await _db.SapoCodeMappings.AddRangeAsync(toAdd);
            await _db.SaveChangesAsync();
        }
        result.MappingCount = await _db.SapoCodeMappings.CountAsync();
        return result;
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
        var filtered = reportRows.Where(r => string.Compare(r.Date, from) >= 0 && string.Compare(r.Date, to) <= 0).ToList();
        return BuildDashboardState(filtered, allRows, filtered, "custom_range", new Dictionary<string, object> { ["fromDate"] = from, ["toDate"] = to });
    }

    public async Task<object> GetDashboardByMonthAsync(string month)
    {
        var ym = (month ?? "").Trim();
        if (ym.Length >= 7) ym = ym[..7];
        if (!System.Text.RegularExpressions.Regex.IsMatch(ym, @"^\d{4}-\d{2}$"))
            throw new BadRequestException("Vui lòng chọn tháng hợp lệ.");
        var parts = ym.Split('-');
        int y = int.Parse(parts[0]), m = int.Parse(parts[1]);
        int lastDay = DateTime.DaysInMonth(y, m);
        return await GetDashboardByRangeAsync($"{ym}-01", $"{ym}-{lastDay:D2}");
    }

    public async Task<object> DeleteLatestUploadAsync()
    {
        var batches = await _db.SapoImportBatches.OrderBy(b => b.ImportedAt).ToListAsync();
        if (batches.Count == 0) throw new InvalidOperationException("Chưa có lần upload nào để xóa.");
        var latest = batches.Last();
        var rowsToDelete = await _db.SapoSalesRows.Where(r => r.BatchId == latest.BatchId).ToListAsync();
        _db.SapoSalesRows.RemoveRange(rowsToDelete);
        _db.SapoImportBatches.Remove(latest);
        await _db.SaveChangesAsync();
        var state = await GetDashboardAsync("last7");
        return new { ok = true, deleted = latest, state };
    }

    // ─── DASHBOARD HELPERS ────────────────────────────────────────────────────

    private static bool IsDashboardReportRow(SapoSalesRow row)
    {
        if (row == null) return false;
        if (IsGiftMaterialRow(row.ProductType, row.Sku, row.ProductName)) return false;
        var code = (row.ReportCode ?? row.SapoCode ?? "").Trim();
        return !string.IsNullOrEmpty(code);
    }

    private static SapoSalesRow NormalizeRowForDashboard(SapoSalesRow r)
    {
        var copy = new SapoSalesRow
        {
            Id = r.Id, BatchId = r.BatchId, Date = r.Date, Branch = r.Branch,
            ProductType = r.ProductType, Sku = r.Sku, SapoCode = r.SapoCode,
            ReportCode = r.ReportCode, ReportName = r.ReportName, ProductName = r.ProductName,
            Price = r.Price, Qty = r.Qty, Orders = r.Orders, Revenue = r.Revenue,
            NetRevenue = r.NetRevenue, ResolveSource = r.ResolveSource, MatchedCode = r.MatchedCode,
            MappingPrice = r.MappingPrice, MappingDate = r.MappingDate, MappingNote = r.MappingNote,
            AutoGroupNote = r.AutoGroupNote, Warning = r.Warning,
            UploadedBy = r.UploadedBy, UploadedAt = r.UploadedAt, CreatedAt = r.CreatedAt
        };
        copy.BasketGroup = ClassifyBasket(copy.Sku, copy.ProductName);
        copy.PriceBucket = PriceBucket(
            copy.Price != 0 ? copy.Price : (copy.Qty != 0 ? Math.Abs(copy.Revenue / copy.Qty) : 0));
        return copy;
    }

    private static List<SapoSalesRow> FilterRows(List<SapoSalesRow> rows, string filterKey)
    {
        var dates = rows.Select(r => NormalizeDate(r.Date)).Where(d => !string.IsNullOrEmpty(d)).Distinct().OrderBy(d => d).ToList();
        if (dates.Count == 0) return new List<SapoSalesRow>();
        var latest = dates.Last();
        if (filterKey == "all") return rows;
        if (filterKey == "latest_month") { var ym = latest[..7]; return rows.Where(r => (r.Date ?? "").Length >= 7 && r.Date![..7] == ym).ToList(); }
        if (filterKey == "latest") return rows.Where(r => NormalizeDate(r.Date) == latest).ToList();
        if (filterKey == "last30") { var from = AddDays(latest, -29); return rows.Where(r => { var d = NormalizeDate(r.Date); return string.Compare(d, from) >= 0 && string.Compare(d, latest) <= 0; }).ToList(); }
        // default last7
        { var from = AddDays(latest, -6); return rows.Where(r => { var d = NormalizeDate(r.Date); return string.Compare(d, from) >= 0 && string.Compare(d, latest) <= 0; }).ToList(); }
    }

    private static List<AggregateItem> Aggregate(List<SapoSalesRow> rows, Func<SapoSalesRow, string> keyFn)
    {
        var map = new Dictionary<string, AggregateItem>();
        foreach (var r in rows)
        {
            var k = keyFn(r) ?? "Chưa rõ";
            if (!map.ContainsKey(k)) map[k] = new AggregateItem { Key = k, Label = k };
            map[k].NetRevenue += r.NetRevenue;
            map[k].Revenue += r.Revenue;
            map[k].Qty += r.Qty;
            map[k].Orders += r.Orders;
            map[k].RowCount++;
            var note = (r.AutoGroupNote ?? "").Trim();
            if (!string.IsNullOrEmpty(note)) map[k].GroupNotes.Add(note);
        }
        foreach (var item in map.Values)
        {
            item.GroupNote = item.GroupNotes.Count > 0 ? string.Join("; ", item.GroupNotes.OrderBy(n => n)) : "";
            item.Aov = item.Qty != 0 ? (double)(item.Revenue / item.Qty) : 0;
        }
        return map.Values.ToList();
    }

    private static MetricsSummary SummarizeRows(List<SapoSalesRow> rows)
    {
        var m = new MetricsSummary { RowCount = rows.Count };
        foreach (var r in rows)
        {
            m.NetRevenue += r.NetRevenue; m.Revenue += r.Revenue;
            m.Qty += r.Qty; m.Orders += r.Orders;
        }
        m.Aov = m.Qty != 0 ? m.Revenue / m.Qty : 0;
        return m;
    }

    private object BuildDashboardState(
        List<SapoSalesRow> filtered, List<SapoSalesRow> allRows,
        List<SapoSalesRow> reportRows, string filterKey,
        Dictionary<string, object>? extra = null)
    {
        var normalizedFiltered = filtered.Select(NormalizeRowForDashboard).ToList();
        var normalizedReportRows = reportRows.Select(NormalizeRowForDashboard).ToList();
        var metrics = SummarizeRows(normalizedFiltered);

        var allDataDates = normalizedReportRows.Select(r => NormalizeDate(r.Date)).Where(d => !string.IsNullOrEmpty(d)).Distinct().OrderBy(d => d).ToList();
        var latestDataDate = allDataDates.LastOrDefault() ?? "";
        var firstDataDate = allDataDates.FirstOrDefault() ?? "";
        var allDataDateRange = string.IsNullOrEmpty(firstDataDate) ? "Chưa có dữ liệu"
            : firstDataDate + (!string.IsNullOrEmpty(latestDataDate) && latestDataDate != firstDataDate ? " đến " + latestDataDate : "");

        var filteredDates = normalizedFiltered.Select(r => (r.Date ?? "")[..Math.Min(10, (r.Date ?? "").Length)]).Where(d => !string.IsNullOrEmpty(d)).Distinct().OrderBy(d => d).ToList();
        var dateRange = filteredDates.Count > 0 ? filteredDates.First() + (filteredDates.Count > 1 ? " đến " + filteredDates.Last() : "") : "Chưa có dữ liệu";

        var byDay = Aggregate(normalizedFiltered, r => r.Date ?? "").OrderBy(a => a.Key).ToList();
        var monthRows = normalizedReportRows.Where(r => (r.Date ?? "").Length >= 7).Select(r => new SapoSalesRow
        {
            Date = r.Date![..7], Branch = r.Branch, Sku = r.Sku, ProductName = r.ProductName,
            BasketGroup = r.BasketGroup, PriceBucket = r.PriceBucket, ReportCode = r.ReportCode,
            Qty = r.Qty, Orders = r.Orders, Revenue = r.Revenue, NetRevenue = r.NetRevenue,
            AutoGroupNote = r.AutoGroupNote
        }).ToList();
        var byMonth = Aggregate(monthRows, r => r.Date ?? "").OrderBy(a => a.Key).TakeLast(12).ToList();
        var byGroup = Aggregate(normalizedFiltered, r => r.BasketGroup ?? "Nhóm khác").OrderByDescending(a => a.Qty).ThenByDescending(a => a.NetRevenue).ToList();
        var byPrice = Aggregate(normalizedFiltered, r => r.PriceBucket ?? "Dưới 300k").OrderBy(a => PriceBucketOrder(a.Key)).ToList();
        var byCode = Aggregate(normalizedFiltered, r => r.ReportCode ?? "").OrderByDescending(a => a.NetRevenue).ToList();

        var imports = _db.SapoImportBatches.OrderByDescending(b => b.ImportedAt).Take(20).ToList();
        var lastImportedAt = imports.Count > 0 ? imports[0].ImportedAt : "Chưa có";
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
            ["allDataDateRangeText"] = System.Text.RegularExpressions.Regex.Replace(allDataDateRange, @"\d{4}-\d{2}-\d{2}", d => FormatDisplayDate(d.Value) is var fd && !string.IsNullOrEmpty(fd) ? fd : d.Value),
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
            ["byBranch"] = Aggregate(normalizedFiltered, r => r.Branch ?? "").OrderByDescending(a => a.NetRevenue).ToList(),
            ["byPrice"] = byPrice,
            ["byCode"] = byCode,
            ["imports"] = imports
        };
        if (extra != null) foreach (var kv in extra) result[kv.Key] = kv.Value;
        return result;
    }

    private static object BuildQuickInsights(List<SapoSalesRow> filtered, List<AggregateItem> byGroup, List<AggregateItem> byPrice, List<AggregateItem> byCode)
    {
        var byDay = Aggregate(filtered, r => r.Date ?? "").OrderByDescending(a => a.NetRevenue).ToList();
        var bestDay = byDay.FirstOrDefault();
        var bestGroup = byGroup.FirstOrDefault();
        var bestCode = byCode.FirstOrDefault();
        var bestPrice = byPrice.OrderByDescending(a => a.NetRevenue).FirstOrDefault();
        return new
        {
            bestDay = bestDay != null ? new { date = bestDay.Key, label = FormatDisplayDate(bestDay.Key) is var l && !string.IsNullOrEmpty(l) ? l : bestDay.Key, value = bestDay.NetRevenue } : null,
            bestGroup = bestGroup != null ? new { label = bestGroup.Label, qty = bestGroup.Qty, value = bestGroup.NetRevenue } : null,
            bestCode = bestCode != null ? new { label = bestCode.Key, sub = bestCode.GroupNote, value = bestCode.NetRevenue } : null,
            bestPrice = bestPrice != null ? new { label = bestPrice.Label, value = bestPrice.NetRevenue } : null
        };
    }

    private static object BuildUsefulAnalysis(List<SapoSalesRow> filtered, List<AggregateItem> byCode, List<AggregateItem> byGroup, List<AggregateItem> byPrice)
    {
        var totalRevenue = filtered.Sum(r => r.NetRevenue);
        var totalQty = filtered.Sum(r => r.Qty);
        var avgAov = totalQty != 0 ? totalRevenue / totalQty : 0;
        var topCode = byCode.FirstOrDefault();
        var topShare = topCode != null && totalRevenue != 0
            ? Math.Round((double)(topCode.NetRevenue / totalRevenue) * 1000) / 10 : 0;

        var codeDayMap = new Dictionary<string, (string code, HashSet<string> days, decimal qty, decimal orders, decimal netRevenue, decimal revenue)>();
        foreach (var r in filtered)
        {
            var code = (r.ReportCode ?? "").Trim();
            var d = NormalizeDate(r.Date);
            if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(d)) continue;
            if (!codeDayMap.ContainsKey(code)) codeDayMap[code] = (code, new HashSet<string>(), 0, 0, 0, 0);
            var v = codeDayMap[code];
            v.days.Add(d);
            codeDayMap[code] = (v.code, v.days, v.qty + r.Qty, v.orders + r.Orders, v.netRevenue + r.NetRevenue, v.revenue + r.Revenue);
        }
        var repeatList = codeDayMap.Values
            .Select(x => new { x.code, dayCount = x.days.Count, x.orders, x.qty, x.netRevenue })
            .Where(x => x.dayCount >= 2)
            .OrderByDescending(x => x.dayCount).ThenByDescending(x => x.orders).ThenByDescending(x => x.netRevenue)
            .ToList();
        var repeatByDay = repeatList.FirstOrDefault();

        var codeWithAov = byCode
            .Where(x => x.Orders > 0 && x.Qty > 0)
            .Select(x => new
            {
                x.Key, x.NetRevenue, x.Revenue, x.Qty, x.Orders,
                revenuePerOrder = x.NetRevenue / x.Orders,
                aovByBasket = x.Revenue / x.Qty
            }).ToList();

        var highValueCode = codeWithAov.OrderByDescending(x => x.aovByBasket).ThenByDescending(x => x.NetRevenue).FirstOrDefault();
        var volumeLowAov = codeWithAov
            .Where(x => x.Qty >= 2 && (avgAov == 0 || x.aovByBasket < avgAov))
            .OrderByDescending(x => x.Qty).ThenByDescending(x => x.Orders).FirstOrDefault();

        var bestGroup = byGroup.FirstOrDefault();
        var bestPrice = byPrice.OrderByDescending(a => a.NetRevenue).FirstOrDefault();

        return new
        {
            topShare = topCode != null ? new { code = topCode.Key, share = topShare, revenue = topCode.NetRevenue } : null,
            repeatByDay = repeatByDay != null ? new
            {
                code = repeatByDay.code, dayCount = repeatByDay.dayCount,
                orders = repeatByDay.orders, qty = repeatByDay.qty, netRevenue = repeatByDay.netRevenue,
                note = $"Mã giỏ này có phát sinh bán trong {repeatByDay.dayCount} ngày của kỳ xem."
            } : null,
            repeatList = repeatList.Take(5).Select(x => new { x.code, x.dayCount, x.orders, x.qty, x.netRevenue }),
            highValueCode = highValueCode != null ? new
            {
                code = highValueCode.Key, value = highValueCode.aovByBasket,
                qty = highValueCode.Qty, orders = highValueCode.Orders, netRevenue = highValueCode.NetRevenue
            } : null,
            volumeLowAov = volumeLowAov != null ? new
            {
                code = volumeLowAov.Key, value = volumeLowAov.aovByBasket,
                qty = volumeLowAov.Qty, orders = volumeLowAov.Orders, netRevenue = volumeLowAov.NetRevenue
            } : null,
            bestGroup = bestGroup != null ? new { label = bestGroup.Label, qty = bestGroup.Qty, netRevenue = bestGroup.NetRevenue } : null,
            bestPrice = bestPrice != null ? new { label = bestPrice.Label, qty = bestPrice.Qty, netRevenue = bestPrice.NetRevenue } : null,
            dataReadiness = new { repeatCustomer = "Chỉ số bán lặp lại đang tính theo số ngày mã giỏ phát sinh bán, không tính theo từng khách hàng." }
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

    private class ImportStats
    {
        public int ZeroRevenueSkipped { get; set; }
        public int DuplicateRowsSkipped { get; set; }
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

    public class MappingImportResult
    {
        public int Total { get; set; }
        public int Added { get; set; }
        public int Skipped { get; set; }
        public int Changed { get; set; }
        public int MappingCount { get; set; }
        public List<string> Warnings { get; set; } = new();
    }

    public class ImportResultInfo
    {
        public string? BatchId { get; set; }
        public string? SapoFileName { get; set; }
        public int RowCount { get; set; }
        public string? DateRange { get; set; }
        public decimal NetRevenue { get; set; }
        public decimal Revenue { get; set; }
        public decimal Qty { get; set; }
        public decimal Orders { get; set; }
        public int MappingCount { get; set; }
        public int WarningCount { get; set; }
        public string? UploadedBy { get; set; }
        public bool SkippedNoChange { get; set; }
        public MappingImportResult? MappingResult { get; set; }
    }

    public class ImportDashboardResult
    {
        public bool Ok { get; set; }
        public string? AppVersion { get; set; }
        public string? Time { get; set; }
        public string? Message { get; set; }
        public ImportResultInfo? ImportResult { get; set; }
    }

    public async Task<(byte[] fileBytes, string fileName)> ExportImportDataAsync(int importId)
    {
        var batch = await _db.SapoImportBatches.FindAsync(importId);
        if (batch == null)
            throw new InvalidOperationException($"Import batch ID {importId} không tìm thấy");

        var dateRange = batch.DateRange ?? "";
        var fromDate = dateRange.Contains("đến")
            ? dateRange.Split("đến")[0].Trim()
            : dateRange;

        if (string.IsNullOrEmpty(fromDate))
            throw new InvalidOperationException("Không thể xác định ngày của import batch");

        var rows = await _db.SapoSalesRows
            .Where(r => r.BatchId == batch.BatchId)
            .OrderBy(r => r.Date).ThenBy(r => r.Branch).ThenBy(r => r.SapoCode)
            .ToListAsync();

        if (rows.Count == 0)
            throw new InvalidOperationException($"Không có dữ liệu cho batch này (ID: {batch.BatchId})");

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Sapo Sales");

        ws.Cell("A1").Value = "Ngày";
        ws.Cell("B1").Value = "Chi nhánh";
        ws.Cell("C1").Value = "Mã Sapo";
        ws.Cell("D1").Value = "Tên sản phẩm";
        ws.Cell("E1").Value = "Loại";
        ws.Cell("F1").Value = "SKU";
        ws.Cell("G1").Value = "Giá";
        ws.Cell("H1").Value = "Số lượng";
        ws.Cell("I1").Value = "Số đơn";
        ws.Cell("J1").Value = "Doanh thu";
        ws.Cell("K1").Value = "Doanh thu thuần";
        ws.Cell("L1").Value = "Mã báo cáo";

        int row = 2;
        foreach (var r in rows)
        {
            ws.Cell($"A{row}").Value = r.Date;
            ws.Cell($"B{row}").Value = r.Branch;
            ws.Cell($"C{row}").Value = r.SapoCode;
            ws.Cell($"D{row}").Value = r.ProductName;
            ws.Cell($"E{row}").Value = r.ProductType;
            ws.Cell($"F{row}").Value = r.Sku;
            ws.Cell($"G{row}").Value = r.Price;
            ws.Cell($"H{row}").Value = r.Qty;
            ws.Cell($"I{row}").Value = r.Orders;
            ws.Cell($"J{row}").Value = r.Revenue;
            ws.Cell($"K{row}").Value = r.NetRevenue;
            ws.Cell($"L{row}").Value = r.ReportCode;
            row++;
        }

        ws.Columns().AdjustToContents();
        var header = ws.Range("A1:L1");
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromArgb(8, 104, 57);
        header.Style.Font.FontColor = XLColor.White;

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;

        var fileName = $"sapo-{batch.BatchId}-{DateTime.Now:yyyyMMddHHmmss}.xlsx";
        return (ms.ToArray(), fileName);
    }
}
