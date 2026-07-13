using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Data;
using WebAppInfractor.Models;
using WebAppInfractor.Models.Persona;

// Nạp file "Danh sách hóa đơn" xuất từ Sapo — khớp cột "Mã đơn hàng" với Order.OrderCode để
// suy ra Customer, và nếu cột "Tên đơn vị" khác rỗng thì đánh dấu khách hàng đó là khách hàng
// doanh nghiệp (Customer.IsBusinessCustomer). Đây là nguồn tín hiệu duy nhất hiện có cho biết
// khách có xuất hóa đơn VAT công ty hay không (xem plan Persona — dữ liệu Order/OrderItem
// không có trường nào khác cho việc này).
public interface IPersonaInvoiceService
{
    Task<PersonaInvoiceImportResultDTO> ImportInvoicesAsync(IFormFile file, int userId);
    Task<PagedResult<PersonaInvoiceImportDTO>> GetImportsAsync(int page, int pageSize);
    Task<PagedResult<BusinessCustomerDTO>> GetBusinessCustomersAsync(string? search, int page, int pageSize);
}

public class PersonaInvoiceService : IPersonaInvoiceService
{
    private readonly MemBerContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IActivityService _auditLogService;

    public PersonaInvoiceService(MemBerContext context, IUnitOfWork unitOfWork, IActivityService auditLogService)
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _auditLogService = auditLogService;
    }

    private class ParsedInvoiceRow
    {
        public string OrderCode { get; set; } = "";
        public string CompanyName { get; set; } = "";
        public string? InvoiceNumber { get; set; }
        public string? BuyerName { get; set; }
        public DateTime? InvoiceDate { get; set; }
    }

    public async Task<PersonaInvoiceImportResultDTO> ImportInvoicesAsync(IFormFile file, int userId)
    {
        if (file == null || file.Length == 0)
            throw new BadRequestException("File không hợp lệ");

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        ms.Seek(0, SeekOrigin.Begin);

        using var workbook = new XLWorkbook(ms);
        var worksheet = workbook.Worksheet(1);
        var allRows = worksheet.RangeUsed()?.RowsUsed().ToList() ?? new List<IXLRangeRow>();
        if (allRows.Count < 2)
            throw new BadRequestException("File Excel không có dữ liệu");

        // Báo cáo Sapo có khối tiêu đề/bộ lọc phía trên bảng dữ liệu thật — dò theo tên cột
        // thay vì cố định số dòng, tránh vỡ khi khoảng ngày lọc dài/ngắn khác nhau làm lệch dòng.
        var (headerRowIndex, colMap) = FindHeaderRow(allRows);
        if (headerRowIndex < 0)
            throw new BadRequestException(
                "File Excel không đúng định dạng — không tìm thấy cột \"Mã đơn hàng\" và \"Tên đơn vị\". Vui lòng xuất đúng mẫu \"Danh sách hóa đơn\" từ Sapo."
            );

        var dataRows = allRows.Skip(headerRowIndex + 1).ToList();

        var parsedRows = new List<ParsedInvoiceRow>();
        var totalRows = 0;
        foreach (var row in dataRows)
        {
            var orderCode = row.Cell(colMap.OrderCode + 1).GetString().Trim();
            if (string.IsNullOrWhiteSpace(orderCode)) continue;
            totalRows++;

            var companyName = colMap.CompanyName >= 0 ? row.Cell(colMap.CompanyName + 1).GetString().Trim() : "";
            if (string.IsNullOrWhiteSpace(companyName)) continue;

            parsedRows.Add(new ParsedInvoiceRow
            {
                OrderCode = orderCode,
                CompanyName = companyName,
                InvoiceNumber = colMap.InvoiceNumber >= 0 ? row.Cell(colMap.InvoiceNumber + 1).GetString().Trim() : null,
                BuyerName = colMap.BuyerName >= 0 ? row.Cell(colMap.BuyerName + 1).GetString().Trim() : null,
                InvoiceDate = colMap.InvoiceDate >= 0 ? ParseInvoiceDate(row.Cell(colMap.InvoiceDate + 1).GetString().Trim()) : null,
            });
        }

        var orderCodes = parsedRows.Select(r => r.OrderCode).Distinct().ToList();
        var orders = await _context.Set<Order>().AsNoTracking()
            .Where(o => orderCodes.Contains(o.OrderCode) && o.DeletedAt == null)
            .Select(o => new { o.Id, o.OrderCode, o.CustomerId })
            .ToListAsync();
        // GroupBy thay vì ToDictionary trực tiếp — OrderCode có ràng buộc unique trên schema
        // nhưng dữ liệu Sapo lịch sử vẫn có thể sót đơn trùng mã (đã thấy qua module Rà Soát
        // Số Liệu); lấy đơn Id lớn nhất (mới nhất) trong các đơn trùng thay vì crash cả import.
        var orderByCode = orders
            .GroupBy(o => o.OrderCode)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(o => o.Id).First());

        var matchedOrderIds = orders.Where(o => o.CustomerId != null).Select(o => o.Id).ToList();
        var existingInvoices = await _context.Set<CustomerBusinessInvoice>()
            .Where(i => matchedOrderIds.Contains(i.OrderId))
            .ToListAsync();
        var existingByOrderId = existingInvoices
            .GroupBy(i => i.OrderId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(i => i.Id).First());

        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var import = new PersonaBusinessInvoiceImport
            {
                FileName = file.FileName,
                ImportedBy = userId,
            };
            _context.Set<PersonaBusinessInvoiceImport>().Add(import);
            await _unitOfWork.SaveChangesAsync();

            var matchedCount = 0;
            var unmatchedCodes = new List<string>();
            var touchedCustomerIds = new HashSet<int>();

            foreach (var r in parsedRows)
            {
                if (!orderByCode.TryGetValue(r.OrderCode, out var order) || order.CustomerId == null)
                {
                    if (unmatchedCodes.Count < 30) unmatchedCodes.Add(r.OrderCode);
                    continue;
                }

                matchedCount++;
                touchedCustomerIds.Add(order.CustomerId.Value);

                if (existingByOrderId.TryGetValue(order.Id, out var existing))
                {
                    existing.CompanyName = r.CompanyName;
                    existing.InvoiceNumber = r.InvoiceNumber;
                    existing.BuyerName = r.BuyerName;
                    existing.InvoiceDate = r.InvoiceDate;
                    existing.ImportBatchId = import.Id;
                }
                else
                {
                    var newInvoice = new CustomerBusinessInvoice
                    {
                        CustomerId = order.CustomerId.Value,
                        OrderId = order.Id,
                        OrderCode = r.OrderCode,
                        CompanyName = r.CompanyName,
                        InvoiceNumber = r.InvoiceNumber,
                        BuyerName = r.BuyerName,
                        InvoiceDate = r.InvoiceDate,
                        ImportBatchId = import.Id,
                    };
                    _context.Set<CustomerBusinessInvoice>().Add(newInvoice);
                    existingByOrderId[order.Id] = newInvoice;
                }
            }

            import.TotalRows = totalRows;
            import.MatchedRows = matchedCount;
            import.UnmatchedRows = parsedRows.Count - matchedCount;

            if (touchedCustomerIds.Count > 0)
            {
                var customers = await _context.Set<Customer>()
                    .Where(c => touchedCustomerIds.Contains(c.Id) && !c.IsBusinessCustomer)
                    .ToListAsync();
                foreach (var c in customers) c.IsBusinessCustomer = true;
            }

            await _unitOfWork.SaveChangesAsync();
            await _auditLogService.SaveLogAsync(userId, null, "IMPORT_PERSONA_INVOICES", "persona_business_invoice_imports", import.Id, null,
                new { import.FileName, import.TotalRows, import.MatchedRows, import.UnmatchedRows });
            await transaction.CommitAsync();

            var userName = await _context.Set<User>().AsNoTracking()
                .Where(u => u.Id == userId).Select(u => u.Name).FirstOrDefaultAsync();

            return new PersonaInvoiceImportResultDTO
            {
                Id = import.Id,
                FileName = import.FileName,
                ImportedByName = userName ?? "",
                ImportedAt = import.ImportedAt,
                TotalRows = import.TotalRows,
                MatchedRows = import.MatchedRows,
                UnmatchedRows = import.UnmatchedRows,
                SampleUnmatchedOrderCodes = unmatchedCodes,
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<PagedResult<PersonaInvoiceImportDTO>> GetImportsAsync(int page, int pageSize)
    {
        var query = _context.Set<PersonaBusinessInvoiceImport>().AsNoTracking();
        var totalItems = await query.CountAsync();

        var imports = await query
            .OrderByDescending(i => i.ImportedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .GroupJoin(_context.Set<User>(), i => i.ImportedBy, u => u.Id, (i, users) => new { i, Users = users })
            .SelectMany(x => x.Users.DefaultIfEmpty(), (x, u) => new PersonaInvoiceImportDTO
            {
                Id = x.i.Id,
                FileName = x.i.FileName,
                ImportedByName = u != null ? u.Name : "",
                ImportedAt = x.i.ImportedAt,
                TotalRows = x.i.TotalRows,
                MatchedRows = x.i.MatchedRows,
                UnmatchedRows = x.i.UnmatchedRows,
            })
            .ToListAsync();

        return new PagedResult<PersonaInvoiceImportDTO> { TotalItems = totalItems, Page = page, PageSize = pageSize, Items = imports };
    }

    public async Task<PagedResult<BusinessCustomerDTO>> GetBusinessCustomersAsync(string? search, int page, int pageSize)
    {
        var query = _context.Set<Customer>().AsNoTracking().Where(c => c.DeletedAt == null && c.IsBusinessCustomer);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.Trim().ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(kw)
                || (c.Phone != null && c.Phone.ToLower().Contains(kw))
                || c.CustomerCode.ToLower().Contains(kw));
        }

        var totalItems = await query.CountAsync();

        var customerIds = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => c.Id)
            .ToListAsync();

        var invoiceStats = await _context.Set<CustomerBusinessInvoice>().AsNoTracking()
            .Where(i => customerIds.Contains(i.CustomerId))
            .GroupBy(i => i.CustomerId)
            .Select(g => new
            {
                CustomerId = g.Key,
                Count = g.Count(),
                Latest = g.OrderByDescending(i => i.InvoiceDate).First(),
            })
            .ToDictionaryAsync(x => x.CustomerId, x => x);

        var customers = await _context.Set<Customer>().AsNoTracking()
            .Where(c => customerIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c);

        var items = customerIds.Select(id =>
        {
            var c = customers[id];
            invoiceStats.TryGetValue(id, out var stat);
            return new BusinessCustomerDTO
            {
                CustomerId = c.Id,
                CustomerCode = c.CustomerCode,
                Name = c.Name,
                Phone = c.Phone,
                TotalRevenue = c.TotalRevenue,
                LatestCompanyName = stat?.Latest.CompanyName,
                InvoiceCount = stat?.Count ?? 0,
                LatestInvoiceDate = stat?.Latest.InvoiceDate,
            };
        }).ToList();

        return new PagedResult<BusinessCustomerDTO> { TotalItems = totalItems, Page = page, PageSize = pageSize, Items = items };
    }

    private class InvoiceColumnMap
    {
        public int OrderCode { get; set; } = -1;
        public int CompanyName { get; set; } = -1;
        public int InvoiceNumber { get; set; } = -1;
        public int BuyerName { get; set; } = -1;
        public int InvoiceDate { get; set; } = -1;
    }

    private static (int rowIndex, InvoiceColumnMap map) FindHeaderRow(List<IXLRangeRow> rows)
    {
        var scanLimit = Math.Min(30, rows.Count);
        for (var i = 0; i < scanLimit; i++)
        {
            var lastCol = rows[i].LastCellUsed()?.Address.ColumnNumber ?? 0;
            if (lastCol == 0) continue;

            var headers = Enumerable.Range(1, lastCol)
                .Select(c => SapoExcelRowParser.NormalizeImportHeader(rows[i].Cell(c).GetString()))
                .ToList();

            var orderCodeCol = FindCol(headers, "ma don hang");
            var companyNameCol = FindCol(headers, "ten don vi");
            if (orderCodeCol < 0 || companyNameCol < 0) continue;

            return (i, new InvoiceColumnMap
            {
                OrderCode = orderCodeCol,
                CompanyName = companyNameCol,
                InvoiceNumber = FindCol(headers, "so hoa don"),
                BuyerName = FindCol(headers, "ten nguoi mua"),
                InvoiceDate = FindCol(headers, "ngay hoa don"),
            });
        }

        return (-1, new InvoiceColumnMap());
    }

    private static int FindCol(List<string> headers, string candidate)
    {
        for (var i = 0; i < headers.Count; i++)
        {
            if (headers[i] == candidate || headers[i].Contains(candidate)) return i;
        }
        return -1;
    }

    private static DateTime? ParseInvoiceDate(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        // AssumeUniversal|AdjustToUniversal cho Kind=Utc — bắt buộc để Npgsql ghi được vào cột
        // "timestamp with time zone" (đúng pattern SapoExcelRowParser đang dùng cho PurchaseDate).
        const System.Globalization.DateTimeStyles styles =
            System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal;
        if (DateTime.TryParse(raw, System.Globalization.CultureInfo.GetCultureInfo("vi-VN"), styles, out var d))
            return d;
        if (DateTime.TryParse(raw, System.Globalization.CultureInfo.InvariantCulture, styles, out d))
            return d;
        return null;
    }
}
