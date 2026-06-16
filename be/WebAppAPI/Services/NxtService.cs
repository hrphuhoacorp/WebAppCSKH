using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Data;
using WebAppInfractor.Models;

namespace WebAppAPI.Services;

public class NxtService(MemBerContext db)
{
    private static readonly string[] BRANCHES = ["Phú Lợi", "Ngô Quyền", "Lái Thiêu"];

    // ─── Util ─────────────────────────────────────────────────────────────────

    private static string RemoveAccent(string s)
    {
        var sb = new StringBuilder();
        foreach (var c in s.Normalize(NormalizationForm.FormD))
        {
            var uc = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
            if (uc != System.Globalization.UnicodeCategory.NonSpacingMark) sb.Append(c);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC)
            .Replace('đ', 'd').Replace('Đ', 'D');
    }

    private static string NormCode(string? v)
    {
        if (string.IsNullOrWhiteSpace(v)) return "";
        return RemoveAccent(v).Trim().ToUpperInvariant()
            .Replace("–", "-").Replace("—", "-").Replace("−", "-").Replace(" ", "");
    }

    private static string NormBranch(string? v)
    {
        var s = RemoveAccent((v ?? "").Trim()).ToLowerInvariant();
        if (s == "pl" || s.Contains("phu loi")) return "Phú Lợi";
        if (s == "nq" || s.Contains("ngo quyen")) return "Ngô Quyền";
        if (s == "lt" || s.Contains("lai thieu")) return "Lái Thiêu";
        return (v ?? "").Trim();
    }

    private static string NormDate(string? v)
    {
        if (string.IsNullOrWhiteSpace(v)) return Today();
        v = v.Trim();
        if (Regex.IsMatch(v, @"^\d{4}-\d{2}-\d{2}$")) return v;
        var m = Regex.Match(v, @"^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})");
        if (m.Success)
        {
            var y = m.Groups[3].Value.Length == 2 ? "20" + m.Groups[3].Value : m.Groups[3].Value;
            return $"{y}-{m.Groups[2].Value.PadLeft(2, '0')}-{m.Groups[1].Value.PadLeft(2, '0')}";
        }
        return v;
    }

    private static string Today() => DateTime.UtcNow.AddHours(7).ToString("yyyy-MM-dd");

    private static string AddDays(string ymd, int days)
        => DateTime.TryParse(ymd, out var d) ? d.AddDays(days).ToString("yyyy-MM-dd") : ymd;

    private static string MakeId(string prefix)
        => prefix + DateTime.UtcNow.AddHours(7).ToString("yyyyMMddHHmmss") + Guid.NewGuid().ToString("N")[..4].ToUpper();

    private static bool IsValidGiftCode(string code)
        => Regex.IsMatch(code, @"^(H\d|GT\d|BK\d|SON\d|AT\d|TEMP\d|TMP\d)[A-Z0-9\-]*$");

    private static string? ExtractCode(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        s = s.ToUpperInvariant();
        var m = Regex.Match(s, @"\b(SON[\w\-]+|TEMP[\w\-]+|TMP[\w\-]+|H\d[\w\-]*|GT\d[\w\-]*|BK\d[\w\-]*|AT\d[\w\-]*)\b");
        return m.Success ? NormCode(m.Value) : null;
    }

    private static string InferStockStatus(string raw)
    {
        var s = RemoveAccent(raw).ToLowerInvariant();
        if (Regex.IsMatch(s, @"chuyen\s+(pl|nq|lt|phu loi|ngo quyen|lai thieu)")) return "Chuyển chi nhánh";
        if (Regex.IsMatch(s, @"\bctt\b|chua thanh toan|giu gio")) return "CTT - giữ giỏ/chưa thanh toán";
        if (Regex.IsMatch(s, @"\bdtt\b|da thanh toan|cho lay|chua lay|cho giao|da ban chua lay")) return "DTT - đã bán chưa lấy";
        return "Tồn bình thường";
    }

    private static string ParseTransferToBranch(string raw)
    {
        var s = RemoveAccent(raw).ToUpperInvariant();
        var m = Regex.Match(s, @"CHUYEN\s+(PL|PHU\s*LOI|NQ|NGO\s*QUYEN|LT|LAI\s*THIEU)");
        if (!m.Success) return "";
        return NormBranch(m.Groups[1].Value);
    }

    private static bool IsDtt(string? status)
        => Regex.IsMatch(RemoveAccent(status ?? "").ToLowerInvariant(),
            @"\bdtt\b|da thanh toan|cho lay|chua lay|cho giao");

    private static string ShortBranch(string b)
        => b == "Phú Lợi" ? "PL" : b == "Ngô Quyền" ? "NQ" : b == "Lái Thiêu" ? "LT" : b;

    private static string GuessDiffReason(NxtDashboardRow r)
    {
        var diff = r.Diff;
        if (diff == 0) return "";
        var hints = new List<string>();
        if (Regex.IsMatch(r.ItemCode, @"^(SON|TEMP|TMP)")) hints.Add("Mã tạm/SON: kiểm đổi mã");
        if (r.BeginQty == 0 && r.OutQty > 0 && r.InQty == 0 && r.TransferInQty == 0)
            hints.Add("Có bán nhưng thiếu tồn đầu/gói ra: kiểm mã bán hoặc thiếu tồn đầu");
        if (r.StockQty > 0 && r.BeginQty == 0 && r.InQty == 0 && r.TransferInQty == 0)
            hints.Add("Có tồn thực tế nhưng thiếu nguồn: kiểm tồn đầu/gói ra/nhận CN");
        if (r.ExpectedQty < 0 && r.TransferOutQty > 0)
            hints.Add("Chuyển CN thiếu nguồn: kiểm tồn đầu/gói ra/nhận CN");
        else if (r.TransferOutQty > 0 || r.TransferInQty > 0)
            hints.Add("Có luân chuyển: đối chiếu gửi/nhận CN");
        if (diff > 0 && r.InQty == 0 && r.TransferInQty == 0 && r.BeginQty == 0)
            hints.Add("Dư: kiểm thiếu Gói ra hoặc Nhận CN");
        if (diff < 0 && r.OutQty == 0 && r.CancelQty == 0 && r.TransferOutQty == 0)
            hints.Add("Thiếu: kiểm Sapo bán, Hủy giỏ hoặc Chuyển CN");
        if (!hints.Any()) hints.Add(diff > 0 ? "Dư nhẹ: kiểm nguồn vào" : "Thiếu nhẹ: kiểm nguồn ra");
        return string.Join(" · ", hints.Take(2));
    }

    // ─── Bootstrap ────────────────────────────────────────────────────────────

    public NxtBootstrapDto GetBootstrap() => new()
    {
        Branches = BRANCHES,
        Today = Today()
    };

    // ─── Gói ra – parse ───────────────────────────────────────────────────────

    public List<NxtGiftRowDto> ParseGiftText(string text, string branch, string date, string? note)
    {
        branch = NormBranch(branch);
        date = NormDate(date);
        var map = new Dictionary<string, NxtGiftRowDto>();
        var order = new List<string>();

        foreach (var line in text.Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0))
        {
            var clean = Regex.Replace(line, @"[，,;]", " ").Trim();
            var noAccent = RemoveAccent(clean).ToLowerInvariant();
            if (Regex.IsMatch(noAccent, @"^(tong|total)\b")) continue;
            if (Regex.IsMatch(noAccent, @"^(pl|phu loi|nq|ngo quyen|lt|lai thieu)($|\s+\d)")) continue;

            var cm = Regex.Match(clean, @"\b(SON[\w\-]*|[A-Za-z]{1,5}\d+[A-Za-z0-9\-]*)\b", RegexOptions.IgnoreCase);
            if (!cm.Success) continue;

            var code = NormCode(cm.Value);
            if (!IsValidGiftCode(code) && !Regex.IsMatch(code, @"^(SON|TEMP|TMP)")) continue;

            var rest = clean[(cm.Index + cm.Length)..].Trim();
            var before = clean[..cm.Index].Trim();
            int qty = ParseQty(rest);

            if (string.IsNullOrEmpty(code) || qty == 0) continue;

            var rowNote = string.Join(" · ", new[] { note?.Trim(), before, rest.Split(' ').Skip(1).FirstOrDefault() }
                .Where(s => !string.IsNullOrWhiteSpace(s))).Trim(' ', '·', ' ');

            if (!map.ContainsKey(code)) { map[code] = new() { Date = date, Branch = branch, ItemCode = code, Qty = 0, Note = "" }; order.Add(code); }
            map[code].Qty += qty;
        }
        return order.Select(k => map[k]).Where(r => r.Qty != 0).ToList();
    }

    private static int ParseQty(string rest)
    {
        var plusM = Regex.Match(rest, @"^\s*(?:[:：\-–—x]|sl|số lượng)?\s*(-?\d+(?:\s*\+\s*-?\d+)+)\b", RegexOptions.IgnoreCase);
        if (plusM.Success) return plusM.Groups[1].Value.Split('+').Sum(v => int.TryParse(v.Trim(), out var n) ? n : 0);
        var qtyM = Regex.Match(rest, @"^\s*(?:[:：\-–—x]|sl|số lượng)?\s*(-?\d+)\b", RegexOptions.IgnoreCase);
        if (qtyM.Success && int.TryParse(qtyM.Groups[1].Value, out var q)) return q;
        var laterM = Regex.Match(rest, @"\b(-?\d+)\b");
        if (laterM.Success && int.TryParse(laterM.Groups[1].Value, out var l)) return l;
        return 1;
    }

    // ─── Gói ra – save ────────────────────────────────────────────────────────

    public async Task<NxtSaveResultDto> SaveGiftRows(List<NxtGiftRowDto> rows, string date, string branch, string? codeType, string? note, string createdBy)
    {
        var values = rows
            .Where(r => !string.IsNullOrEmpty(r.ItemCode) && r.Qty != 0)
            .Select(r => new NxtGiftIn
            {
                ImportId = MakeId("GI"),
                Date = NormDate(r.Date ?? date),
                Branch = NormBranch(r.Branch ?? branch),
                ItemCode = NormCode(r.ItemCode),
                Qty = r.Qty,
                CodeType = r.CodeType ?? codeType ?? "Mã Sapo có sẵn",
                Note = string.IsNullOrWhiteSpace(r.Note) ? note : r.Note,
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdBy
            }).ToList();

        if (!values.Any()) throw new InvalidOperationException("Không có dòng gói ra hợp lệ.");
        db.NxtGiftIns.AddRange(values);
        await db.SaveChangesAsync();
        return new() { RowsSaved = values.Count };
    }

    // ─── Tồn CN – parse ───────────────────────────────────────────────────────

    public List<NxtStockRowDto> ParseStockText(string text, string branch, string date)
    {
        branch = NormBranch(branch);
        date = NormDate(date);
        var rows = new List<NxtStockRowDto>();

        foreach (var line in text.Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0))
        {
            var clean = Regex.Replace(line, @"[，,;]", " ").Trim();
            var noAccent = RemoveAccent(clean).ToLowerInvariant();
            if (Regex.IsMatch(noAccent, @"^(tong|total)\b")) continue;
            if (Regex.IsMatch(noAccent, @"^(pl|phu loi|nq|ngo quyen|lt|lai thieu)($|\s+\d)")) continue;

            var cm = Regex.Match(clean, @"\b(SON[\w\-]*|[A-Za-z]{1,5}\d+[A-Za-z0-9\-]*)\b", RegexOptions.IgnoreCase);
            if (!cm.Success) continue;

            var code = NormCode(cm.Value);
            if (!IsValidGiftCode(code) && !Regex.IsMatch(code, @"^(SON|TEMP|TMP)")) continue;

            var rest = clean[(cm.Index + cm.Length)..].Trim();
            int qty = ParseQty(rest);
            var combined = clean + " " + rest;
            var stockStatus = InferStockStatus(combined);
            var transferTo = stockStatus == "Chuyển chi nhánh" ? ParseTransferToBranch(combined) : "";

            rows.Add(new()
            {
                Date = date, Branch = branch, ItemCode = code, Qty = qty,
                StockStatus = stockStatus, TransferToBranch = transferTo, Raw = line
            });
        }
        return rows;
    }

    // ─── Tồn CN – save ────────────────────────────────────────────────────────

    public async Task<NxtSaveResultDto> SaveStockRows(List<NxtStockRowDto> rows, string? sourceText, string createdBy)
    {
        var stocks = new List<NxtStockCount>();
        var transfers = new List<NxtAdjustment>();

        foreach (var r in rows)
        {
            var branch = NormBranch(r.Branch);
            var code = NormCode(r.ItemCode);
            if (string.IsNullOrEmpty(branch) || string.IsNullOrEmpty(code)) continue;

            var isTransfer = Regex.IsMatch(r.StockStatus ?? "", @"Chuyển chi nhánh", RegexOptions.IgnoreCase);
            if (isTransfer)
            {
                var toBranch = NormBranch(r.TransferToBranch ?? ParseTransferToBranch(r.Raw ?? ""));
                if (string.IsNullOrEmpty(toBranch)) throw new InvalidOperationException($"Dòng chuyển CN mã {code} chưa rõ CN nhận.");
                if (toBranch == branch) throw new InvalidOperationException($"Dòng chuyển CN mã {code}: CN gửi và CN nhận giống nhau.");
                transfers.Add(new()
                {
                    ImportId = MakeId("TR"), Date = NormDate(r.Date), Branch = branch,
                    WrongCode = code, RightCode = toBranch, Qty = r.Qty,
                    Reason = "Chuyển chi nhánh", Note = r.Raw,
                    Status = "active", CreatedAt = DateTime.UtcNow, CreatedBy = createdBy
                });
            }
            else
            {
                var srcText = r.Raw ?? sourceText ?? "";
                stocks.Add(new()
                {
                    ImportId = MakeId("ST"), Date = NormDate(r.Date), Branch = branch,
                    ItemCode = code, Qty = r.Qty,
                    StockStatus = r.StockStatus ?? "Tồn bình thường",
                    Note = r.Note, SourceText = srcText[..Math.Min(400, srcText.Length)],
                    Status = "active", CreatedAt = DateTime.UtcNow, CreatedBy = createdBy
                });
            }
        }

        if (!stocks.Any() && !transfers.Any()) throw new InvalidOperationException("Không có dòng tồn hợp lệ.");
        if (stocks.Any()) db.NxtStockCounts.AddRange(stocks);
        if (transfers.Any()) db.NxtAdjustments.AddRange(transfers);
        await db.SaveChangesAsync();
        return new() { RowsSaved = stocks.Count, TransfersSaved = transfers.Count };
    }

    public async Task<List<NxtStockRowDto>> GetStockRowsForDate(string date, string branch)
    {
        date = NormDate(date);
        branch = NormBranch(branch);
        return await db.NxtStockCounts
            .Where(r => r.Status == "active" && r.DeletedAt == null && r.Date == date && r.Branch == branch)
            .Select(r => new NxtStockRowDto
            {
                Id = r.Id, Date = r.Date, Branch = r.Branch, ItemCode = r.ItemCode,
                Qty = r.Qty, StockStatus = r.StockStatus, Note = r.Note
            }).ToListAsync();
    }

    // ─── Hủy giỏ ─────────────────────────────────────────────────────────────

    public async Task<NxtSaveResultDto> SaveCancelRows(List<NxtGiftRowDto> rows, string date, string branch, string cancelReason, string? note, string createdBy)
    {
        var values = rows
            .Where(r => !string.IsNullOrEmpty(r.ItemCode) && r.Qty > 0)
            .Select(r => new NxtAdjustment
            {
                ImportId = MakeId("CA"),
                Date = NormDate(r.Date ?? date),
                Branch = NormBranch(r.Branch ?? branch),
                WrongCode = NormCode(r.ItemCode),
                RightCode = null,
                Qty = r.Qty,
                Reason = "Hủy/Rã giỏ",
                Note = string.Join(" - ", new[] { cancelReason, r.Note ?? note }.Where(s => !string.IsNullOrWhiteSpace(s))),
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdBy
            }).ToList();

        if (!values.Any()) throw new InvalidOperationException("Không có dòng hủy giỏ hợp lệ.");
        db.NxtAdjustments.AddRange(values);
        await db.SaveChangesAsync();
        return new() { RowsSaved = values.Count };
    }

    // ─── Sai mã / Đổi mã ─────────────────────────────────────────────────────

    public async Task<string> SaveAdjustment(NxtAdjInputDto input, string createdBy)
    {
        var adj = new NxtAdjustment
        {
            ImportId = MakeId("AD"),
            Date = NormDate(input.Date),
            Branch = NormBranch(input.Branch),
            WrongCode = NormCode(input.WrongCode),
            RightCode = string.IsNullOrWhiteSpace(input.RightCode) ? null : NormCode(input.RightCode),
            Qty = input.Qty,
            Reason = input.Reason ?? "Đổi mã tạm/nhập nhầm",
            Note = input.Note,
            Status = "active",
            CreatedAt = DateTime.UtcNow,
            CreatedBy = createdBy
        };
        db.NxtAdjustments.Add(adj);
        await db.SaveChangesAsync();
        return adj.ImportId;
    }

    public async Task<List<NxtAdjLogDto>> GetAdjustments(string? dateFrom, string? dateTo, string? branch)
    {
        var all = await db.NxtAdjustments
            .Where(r => r.Status == "active" && r.DeletedAt == null)
            .OrderByDescending(r => r.CreatedAt)
            .Take(200)
            .ToListAsync();

        var df = NormDate(dateFrom);
        var dt = NormDate(dateTo);
        var br = string.IsNullOrEmpty(branch) ? "" : NormBranch(branch);

        return all
            .Where(r => (string.IsNullOrEmpty(df) || string.Compare(r.Date, df) >= 0)
                     && (string.IsNullOrEmpty(dt) || string.Compare(r.Date, dt) <= 0)
                     && (string.IsNullOrEmpty(br) || r.Branch == br))
            .Select(r => new NxtAdjLogDto
            {
                Id = r.Id, ImportId = r.ImportId, Date = r.Date, Branch = r.Branch,
                WrongCode = r.WrongCode, RightCode = r.RightCode, Qty = r.Qty,
                Reason = r.Reason, Note = r.Note, CreatedAt = r.CreatedAt, CreatedBy = r.CreatedBy
            }).ToList();
    }

    // ─── Nạp Sapo ─────────────────────────────────────────────────────────────

    public async Task<NxtSapoImportResultDto> ImportSapoRows(List<List<string>> matrix, string? fileName, string? defaultDate, string createdBy)
    {
        if (!matrix.Any()) throw new InvalidOperationException("File không có dữ liệu.");
        var header = matrix[0].Select(h => RemoveAccent(h).ToLowerInvariant().Trim()).ToList();

        int Find(params string[] names)
        {
            foreach (var n in names)
            {
                var cn = RemoveAccent(n).ToLowerInvariant().Trim();
                var i = header.FindIndex(h => h == cn || h.Contains(cn));
                if (i >= 0) return i;
            }
            return -1;
        }

        var idxSku = Find("Mã SKU", "SKU", "Mã hàng");
        var idxVariant = Find("Tên phiên bản", "Tên sản phẩm", "Sản phẩm");
        var idxBranch = Find("Tên chi nhánh", "Chi nhánh", "Nguồn bán");
        var idxNetSold = Find("SL hàng thực bán", "SL thực bán", "Net Sold Qty");
        var idxRevenue = Find("Doanh thu");
        var idxDate = Find("Ngày", "Thời gian", "Ngày tạo");
        var idxOrder = Find("SL đơn hàng", "Số đơn");
        var idxNetRev = Find("Doanh thu thuần");
        var idxStatus = Find("Trạng thái đơn hàng", "Trạng thái đơn");

        var missing = new List<string>();
        if (idxSku < 0) missing.Add("Mã SKU");
        if (idxVariant < 0) missing.Add("Tên phiên bản");
        if (idxBranch < 0) missing.Add("Tên chi nhánh");
        if (idxNetSold < 0) missing.Add("SL hàng thực bán");
        if (idxRevenue < 0) missing.Add("Doanh thu");
        if (missing.Any()) throw new InvalidOperationException("Thiếu cột: " + string.Join(", ", missing));

        string Cell(List<string> row, int idx) => idx >= 0 && idx < row.Count ? row[idx].Trim() : "";
        decimal Num(string v) { v = v.Replace(".", "").Replace(",", "."); return decimal.TryParse(v, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var d) ? d : 0; }

        var importId = MakeId("IM");
        var values = new List<NxtSapoSale>();
        string dateMin = "", dateMax = "", fallbackDate = NormDate(defaultDate);

        for (int i = 1; i < matrix.Count; i++)
        {
            var row = matrix[i];
            var sku = Cell(row, idxSku); var variant = Cell(row, idxVariant);
            if (string.IsNullOrEmpty(sku) && string.IsNullOrEmpty(variant)) continue;
            var orderStatus = Cell(row, idxStatus);
            if (Regex.IsMatch(RemoveAccent(orderStatus).ToLowerInvariant(), @"huy|cancel")) continue;

            var code = ExtractCode(variant) ?? ExtractCode(sku);
            if (string.IsNullOrEmpty(code) || !IsValidGiftCode(code)) continue;

            var rawDate = Cell(row, idxDate);
            var rowDate = string.IsNullOrEmpty(rawDate) ? fallbackDate : ParseExcelDate(rawDate) ?? fallbackDate;
            var branch = NormBranch(Cell(row, idxBranch));
            var netQty = (int)Num(Cell(row, idxNetSold));
            var revenue = Num(Cell(row, idxRevenue));

            if (string.IsNullOrEmpty(dateMin) || string.Compare(rowDate, dateMin) < 0) dateMin = rowDate;
            if (string.IsNullOrEmpty(dateMax) || string.Compare(rowDate, dateMax) > 0) dateMax = rowDate;

            values.Add(new()
            {
                ImportId = importId, RowNo = i, Date = rowDate,
                Sku = sku, VariantName = variant, ItemCode = code,
                Branch = branch, NetSoldQty = netQty,
                SoldQty = (int)Num(Cell(row, idxNetSold)),
                OrderCount = (int)Num(Cell(row, idxOrder)),
                Revenue = revenue, NetRevenue = Num(Cell(row, idxNetRev)),
                OrderStatus = orderStatus, Status = "active",
                CreatedAt = DateTime.UtcNow, CreatedBy = createdBy
            });
        }

        if (!values.Any()) throw new InvalidOperationException("Không có dòng Sapo hợp lệ sau lọc.");

        // Thay dòng cũ cùng khoảng ngày
        int replaced = await ReplaceSapoInRange(dateMin, dateMax, importId);

        db.NxtSapoSales.AddRange(values);
        db.NxtSapoImports.Add(new()
        {
            ImportId = importId, FileName = fileName, ImportDate = DateTime.UtcNow,
            RowsRead = matrix.Count - 1, RowsSaved = values.Count,
            DateMin = dateMin, DateMax = dateMax,
            TotalNetQty = values.Sum(v => v.NetSoldQty), TotalRevenue = values.Sum(v => v.Revenue),
            Status = "active", CreatedAt = DateTime.UtcNow, CreatedBy = createdBy
        });
        await db.SaveChangesAsync();
        return new() { ImportId = importId, RowsRead = matrix.Count - 1, RowsSaved = values.Count, DateMin = dateMin, DateMax = dateMax, TotalNetQty = values.Sum(v => v.NetSoldQty), TotalRevenue = values.Sum(v => v.Revenue), ReplacedRows = replaced };
    }

    private async Task<int> ReplaceSapoInRange(string dateMin, string dateMax, string newImportId)
    {
        var all = await db.NxtSapoSales.Where(r => r.Status == "active" && r.ImportId != newImportId).ToListAsync();
        var toReplace = all.Where(r => string.Compare(r.Date, dateMin) >= 0 && string.Compare(r.Date, dateMax) <= 0).ToList();
        foreach (var r in toReplace) r.Status = "replaced";
        return toReplace.Count;
    }

    private static string? ParseExcelDate(string v)
    {
        if (string.IsNullOrWhiteSpace(v)) return null;
        var m = Regex.Match(v, @"(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})");
        if (m.Success)
        {
            var y = m.Groups[3].Value.Length == 2 ? "20" + m.Groups[3].Value : m.Groups[3].Value;
            return $"{y}-{m.Groups[2].Value.PadLeft(2, '0')}-{m.Groups[1].Value.PadLeft(2, '0')}";
        }
        var iso = Regex.Match(v, @"(\d{4})-(\d{1,2})-(\d{1,2})");
        if (iso.Success) return $"{iso.Groups[1].Value}-{iso.Groups[2].Value.PadLeft(2,'0')}-{iso.Groups[3].Value.PadLeft(2,'0')}";
        return null;
    }

    public async Task<List<NxtSapoImport>> GetSapoImports()
        => await db.NxtSapoImports.AsNoTracking().OrderByDescending(r => r.ImportDate).Take(50).ToListAsync();

    // ─── Dashboard ────────────────────────────────────────────────────────────

    public async Task<NxtDashboardDto> GetDashboard(string dateFrom, string dateTo, string? branchFilter, string rowFilter)
    {
        dateFrom = NormDate(dateFrom);
        dateTo = NormDate(dateTo);
        if (string.Compare(dateFrom, dateTo) > 0) (dateFrom, dateTo) = (dateTo, dateFrom);
        var branchNorm = string.IsNullOrEmpty(branchFilter) || branchFilter == "ALL" ? "" : NormBranch(branchFilter);
        var prev = AddDays(dateFrom, -1);

        bool InRange(string d) => string.Compare(d, dateFrom) >= 0 && string.Compare(d, dateTo) <= 0;
        bool SameBranch(string b) => string.IsNullOrEmpty(branchNorm) || b == branchNorm;

        // Load all active records into memory; small dataset for internal team
        var allGiftIn = (await db.NxtGiftIns.Where(r => r.Status == "active" && r.DeletedAt == null).ToListAsync())
            .Where(r => InRange(r.Date) && SameBranch(r.Branch)).ToList();

        var stockPrev = (await db.NxtStockCounts.Where(r => r.Status == "active" && r.DeletedAt == null && r.Date == prev).ToListAsync())
            .Where(r => SameBranch(r.Branch)).ToList();

        var stockToday = (await db.NxtStockCounts.Where(r => r.Status == "active" && r.DeletedAt == null && r.Date == dateTo).ToListAsync())
            .Where(r => SameBranch(r.Branch)).ToList();

        var sapo = (await db.NxtSapoSales.Where(r => r.Status == "active").ToListAsync())
            .Where(r => InRange(r.Date) && SameBranch(r.Branch)).ToList();

        var allAdj = (await db.NxtAdjustments.Where(r => r.Status == "active" && r.DeletedAt == null).ToListAsync())
            .Where(r => InRange(r.Date)).ToList();

        var map = new Dictionary<string, NxtDashboardRow>();

        NxtDashboardRow Ensure(string b, string code)
        {
            var k = $"{b}||{NormCode(code)}";
            if (!map.ContainsKey(k)) map[k] = new() { Branch = b, ItemCode = NormCode(code) };
            return map[k];
        }

        // Opening stock = previous day's actual stock (not transfer rows)
        foreach (var r in stockPrev)
            Ensure(r.Branch, r.ItemCode).BeginQty += r.Qty;

        // Gift in
        foreach (var r in allGiftIn)
            Ensure(r.Branch, r.ItemCode).InQty += r.Qty;

        // Sapo sold
        foreach (var r in sapo)
        {
            var e = Ensure(r.Branch, r.ItemCode);
            e.OutQty += r.NetSoldQty;
            e.Revenue += r.Revenue;
        }

        // Stock today (actual)
        foreach (var r in stockToday)
        {
            var e = Ensure(r.Branch, r.ItemCode);
            if (IsDtt(r.StockStatus)) { e.StockQty += r.Qty; e.DttQty += r.Qty; }
            else { e.StockQty += r.Qty; }
            if (Regex.IsMatch(RemoveAccent(r.StockStatus ?? "").ToLowerInvariant(), @"\bctt\b|chua thanh toan"))
                e.CttQty += r.Qty;
            if (!string.IsNullOrEmpty(r.Note)) e.Notes.Add(r.Note);
        }

        // Adjustments
        var codeRemaps = new List<NxtAdjustment>();
        foreach (var r in allAdj)
        {
            var reason = RemoveAccent(r.Reason ?? "").ToLowerInvariant();
            if (reason.Contains("chuyen chi nhanh"))
            {
                var fromBranch = NormBranch(r.Branch);
                var toBranch = NormBranch(r.RightCode);
                var code = NormCode(r.WrongCode);
                if (string.IsNullOrEmpty(code)) continue;
                if (SameBranch(fromBranch))
                {
                    var e = Ensure(fromBranch, code);
                    e.TransferOutQty += r.Qty;
                    e.Labels.Add($"Gửi {ShortBranch(toBranch)} · {r.Qty}");
                }
                if (SameBranch(toBranch))
                {
                    var e = Ensure(toBranch, code);
                    e.TransferInQty += r.Qty;
                    e.Labels.Add($"Nhận từ {ShortBranch(fromBranch)} · {r.Qty}");
                }
            }
            else if (reason.Contains("huy") || reason.Contains("ra gio"))
            {
                if (SameBranch(NormBranch(r.Branch)))
                    Ensure(NormBranch(r.Branch), r.WrongCode).CancelQty += r.Qty;
            }
            else
            {
                // Code remaps – process after all other data
                codeRemaps.Add(r);
            }
        }

        // Apply code remaps: move quantities from WrongCode to RightCode rows
        ApplyRemaps(map, codeRemaps, branchNorm, Ensure);

        // Calculate derived fields
        foreach (var (_, e) in map)
        {
            e.ExpectedQty = e.BeginQty + e.InQty + e.TransferInQty - e.TransferOutQty - e.OutQty - e.CancelQty + e.AdjustQty;
            e.CompareQty = e.StockQty - e.DttQty;
            e.Diff = e.CompareQty - e.ExpectedQty;
            if (e.DttQty > 0) e.Labels.Add($"DTT · {e.DttQty}");
            if (e.CttQty > 0) e.Labels.Add($"CTT · {e.CttQty}");
            if (e.ExpectedQty < 0 && e.TransferOutQty > 0) e.Labels.Add("Chuyển CN thiếu nguồn");
            e.DiffReason = GuessDiffReason(e);
        }

        var allRows = map.Values
            .Where(r => IsValidGiftCode(r.ItemCode))
            .Where(r => r.BeginQty + r.InQty + r.TransferInQty + r.TransferOutQty + r.CancelQty + r.OutQty + r.StockQty + Math.Abs(r.Diff) > 0)
            .OrderBy(r => r.Branch + r.ItemCode)
            .ToList();

        var summary = new NxtDashboardSummary
        {
            BeginQty = allRows.Sum(r => r.BeginQty), InQty = allRows.Sum(r => r.InQty),
            TransferInQty = allRows.Sum(r => r.TransferInQty), TransferOutQty = allRows.Sum(r => r.TransferOutQty),
            CancelQty = allRows.Sum(r => r.CancelQty), OutQty = allRows.Sum(r => r.OutQty),
            StockQty = allRows.Sum(r => r.StockQty), DttQty = allRows.Sum(r => r.DttQty),
            CttQty = allRows.Sum(r => r.CttQty), Revenue = allRows.Sum(r => r.Revenue),
            DiffLines = allRows.Count(r => r.Diff != 0)
        };

        var branchCharts = BRANCHES.Select(b => new NxtBranchChartDto
        {
            Branch = b,
            InQty = allRows.Where(r => r.Branch == b).Sum(r => r.InQty),
            OutQty = allRows.Where(r => r.Branch == b).Sum(r => r.OutQty),
            StockQty = allRows.Where(r => r.Branch == b).Sum(r => r.StockQty),
            TransferInQty = allRows.Where(r => r.Branch == b).Sum(r => r.TransferInQty),
            TransferOutQty = allRows.Where(r => r.Branch == b).Sum(r => r.TransferOutQty),
            CancelQty = allRows.Where(r => r.Branch == b).Sum(r => r.CancelQty),
            Revenue = allRows.Where(r => r.Branch == b).Sum(r => r.Revenue),
            DiffLines = allRows.Count(r => r.Branch == b && r.Diff != 0)
        }).ToList();

        var checkDays = BuildCheckDays(allRows);

        var filteredRows = rowFilter switch
        {
            "DIFF" => allRows.Where(r => r.Diff != 0).ToList(),
            "CLEAN" => allRows.Where(r => r.Diff == 0).ToList(),
            "DTT" => allRows.Where(r => r.DttQty > 0).ToList(),
            _ => allRows
        };

        return new()
        {
            DateFrom = dateFrom, DateTo = dateTo, Prev = prev,
            Branch = branchNorm.Length > 0 ? branchNorm : "ALL",
            RowFilter = rowFilter, Summary = summary,
            BranchCharts = branchCharts, CheckDays = checkDays,
            Rows = filteredRows.Take(1000).ToList()
        };
    }

    private static void ApplyRemaps(Dictionary<string, NxtDashboardRow> map, List<NxtAdjustment> remaps, string branchNorm, Func<string, string, NxtDashboardRow> ensure)
    {
        foreach (var r in remaps)
        {
            var b = NormBranch(r.Branch);
            if (!string.IsNullOrEmpty(branchNorm) && b != branchNorm) continue;
            var from = NormCode(r.WrongCode);
            var to = NormCode(r.RightCode);
            if (string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to) || from == to) continue;

            var key = $"{b}||{from}";
            if (!map.TryGetValue(key, out var src)) continue;
            var dst = ensure(b, to);

            dst.BeginQty += src.BeginQty; src.BeginQty = 0;
            dst.InQty += src.InQty; src.InQty = 0;
            dst.OutQty += src.OutQty; src.OutQty = 0;
            dst.StockQty += src.StockQty; src.StockQty = 0;
            dst.DttQty += src.DttQty; src.DttQty = 0;
            dst.CttQty += src.CttQty; src.CttQty = 0;
            dst.CancelQty += src.CancelQty; src.CancelQty = 0;
            dst.TransferInQty += src.TransferInQty; src.TransferInQty = 0;
            dst.TransferOutQty += src.TransferOutQty; src.TransferOutQty = 0;
            dst.Revenue += src.Revenue; src.Revenue = 0;
        }
    }

    private static List<NxtCheckDayDto> BuildCheckDays(List<NxtDashboardRow> rows)
    {
        var map = new Dictionary<string, NxtCheckDayDto>();
        foreach (var r in rows.Where(r => r.Diff != 0))
        {
            // We don't have closeDate per-row; use dateFrom context. For check days, group by branch.
            // This is computed per-branch from the allRows already grouped by branch.
            var k = r.Branch;
            if (!map.ContainsKey(k)) map[k] = new() { Branch = k, DiffLines = 0, AbsDiff = 0 };
            map[k].DiffLines++;
            map[k].AbsDiff += Math.Abs(r.Diff);
            map[k].TopCodes.Add(r.ItemCode);
        }
        foreach (var v in map.Values) v.TopCodes = v.TopCodes.Take(3).ToList();
        return map.Values.OrderByDescending(d => d.AbsDiff).ToList();
    }
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

public class NxtBootstrapDto { public string[] Branches { get; set; } = []; public string Today { get; set; } = ""; }

public class NxtGiftRowDto { public int? Id { get; set; } public string? Date { get; set; } public string? Branch { get; set; } public string ItemCode { get; set; } = ""; public int Qty { get; set; } public string? Note { get; set; } public string? CodeType { get; set; } }

public class NxtStockRowDto { public int? Id { get; set; } public string Date { get; set; } = ""; public string Branch { get; set; } = ""; public string ItemCode { get; set; } = ""; public int Qty { get; set; } public string? StockStatus { get; set; } public string? TransferToBranch { get; set; } public string? Note { get; set; } public string? Raw { get; set; } }

public class NxtSaveResultDto { public int RowsSaved { get; set; } public int TransfersSaved { get; set; } }

public class NxtSapoImportResultDto { public string ImportId { get; set; } = ""; public int RowsRead { get; set; } public int RowsSaved { get; set; } public string? DateMin { get; set; } public string? DateMax { get; set; } public int TotalNetQty { get; set; } public decimal TotalRevenue { get; set; } public int ReplacedRows { get; set; } }

public class NxtAdjInputDto { public string Date { get; set; } = ""; public string Branch { get; set; } = ""; public string WrongCode { get; set; } = ""; public string? RightCode { get; set; } public int Qty { get; set; } public string? Reason { get; set; } public string? Note { get; set; } }

public class NxtAdjLogDto { public int Id { get; set; } public string ImportId { get; set; } = ""; public string Date { get; set; } = ""; public string Branch { get; set; } = ""; public string WrongCode { get; set; } = ""; public string? RightCode { get; set; } public int Qty { get; set; } public string? Reason { get; set; } public string? Note { get; set; } public DateTime CreatedAt { get; set; } public string? CreatedBy { get; set; } }

public class NxtDashboardRow
{
    public string Branch { get; set; } = ""; public string ItemCode { get; set; } = "";
    public int BeginQty { get; set; } public int InQty { get; set; }
    public int TransferInQty { get; set; } public int TransferOutQty { get; set; }
    public int OutQty { get; set; } public int CancelQty { get; set; } public int AdjustQty { get; set; }
    public int StockQty { get; set; } public int DttQty { get; set; } public int CttQty { get; set; }
    public int ExpectedQty { get; set; } public int CompareQty { get; set; } public int Diff { get; set; }
    public decimal Revenue { get; set; }
    public List<string> Labels { get; set; } = [];
    public List<string> Notes { get; set; } = [];
    public string DiffReason { get; set; } = "";
}

public class NxtDashboardSummary
{
    public int BeginQty { get; set; } public int InQty { get; set; }
    public int TransferInQty { get; set; } public int TransferOutQty { get; set; }
    public int CancelQty { get; set; } public int OutQty { get; set; }
    public int StockQty { get; set; } public int DttQty { get; set; } public int CttQty { get; set; }
    public decimal Revenue { get; set; } public int DiffLines { get; set; }
}

public class NxtBranchChartDto { public string Branch { get; set; } = ""; public int InQty { get; set; } public int OutQty { get; set; } public int StockQty { get; set; } public int TransferInQty { get; set; } public int TransferOutQty { get; set; } public int CancelQty { get; set; } public int DiffLines { get; set; } public decimal Revenue { get; set; } }

public class NxtCheckDayDto { public string Branch { get; set; } = ""; public int DiffLines { get; set; } public int AbsDiff { get; set; } public List<string> TopCodes { get; set; } = []; }

public class NxtDashboardDto
{
    public string DateFrom { get; set; } = ""; public string DateTo { get; set; } = "";
    public string Prev { get; set; } = ""; public string Branch { get; set; } = ""; public string RowFilter { get; set; } = "";
    public NxtDashboardSummary Summary { get; set; } = new();
    public List<NxtBranchChartDto> BranchCharts { get; set; } = [];
    public List<NxtCheckDayDto> CheckDays { get; set; } = [];
    public List<NxtDashboardRow> Rows { get; set; } = [];
}
