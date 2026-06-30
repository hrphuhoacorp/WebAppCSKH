using System.Globalization;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IOrderService
{
    Task<ImportResultDTO> ImportExcelAsync(IFormFile file, int userId);
    Task<PagedResult<OrderDTO>> GetAllOrdersForOnlineAsync(OrderFilterDTO filter);
    Task<PagedResult<OrderDTO>> GetAllOrdersForSalesAsync(OrderFilterDTO filter);
    Task<OrderDTO> GetOrderByIdAsync(int id);
    Task<StatusDTO[]> GetAllStatusesAsync();
    Task<BranchDTO[]> GetAllBranchesAsync();
    Task<bool> RollbackImportAsync(int importHistoryId, int userId);
    Task<bool> RestoreImportAsync(int importHistoryId, int userId);
}

public class OrderService : IOrderService
{
    private readonly ICustomerRepository _customerRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IOrderRepository _orderRepository;
    private readonly IImportsHistoryRepository _importsHistoryRepository;
    private readonly IOrderStatusRepository _orderStatusRepository;
    private readonly IUserRepository _userRepository;
    private readonly IBranchRepository _branchRepository;
    public readonly MemBerContext _context;
    public readonly IOrderItemRepository _orderItemRepository;
    private readonly IHubContext<ImportHub> _hubContext;
    private readonly IActivityService _auditLogService;
    private readonly MediaSettings _mediaSettings;

    public OrderService(
        ICustomerRepository customerRepository,
        IUnitOfWork unitOfWork,
        IOrderRepository orderRepository,
        IImportsHistoryRepository importsHistoryRepository,
        IOrderStatusRepository orderStatusRepository,
        IUserRepository userRepository,
        IBranchRepository branchRepository,
        MemBerContext context,
        IOrderItemRepository orderItemRepository,
        IHubContext<ImportHub> hubContext,
        IActivityService auditLogService,
        IOptions<MediaSettings> mediaOptions
    )
    {
        _customerRepository = customerRepository;
        _unitOfWork = unitOfWork;
        _orderRepository = orderRepository;
        _importsHistoryRepository = importsHistoryRepository;
        _orderStatusRepository = orderStatusRepository;
        _userRepository = userRepository;
        _branchRepository = branchRepository;
        _context = context;
        _orderItemRepository = orderItemRepository;
        _hubContext = hubContext;
        _auditLogService = auditLogService;
        _mediaSettings = mediaOptions.Value;
    }

    public async Task<ImportResultDTO> ImportExcelAsync(IFormFile file, int userId)
    {
        if (file == null || file.Length == 0)
        {
            throw new BadRequestException("File không hợp lệ");
        }

        using var transaction = await _unitOfWork.BeginTransactionAsync();
        var processedRows = 0;
        var successCount = 0;
        var errorCount = 0;
        var errors = new List<object>();

        try
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            ms.Seek(0, SeekOrigin.Begin);

            // Cấp 1: Tính hash SHA256 để chặn upload cùng file 2 lần
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            var hashBytes = await sha256.ComputeHashAsync(ms);
            var fileHash = Convert.ToHexString(hashBytes).ToLower();
            ms.Seek(0, SeekOrigin.Begin);

            var duplicateImport = await _context
                .Set<ImportsHistory>()
                .AsNoTracking()
                .FirstOrDefaultAsync(h => h.FileHash == fileHash && h.Status == "Imported");
            if (duplicateImport != null)
                throw new BadRequestException(
                    $"File này đã được import trước đó (Import #{duplicateImport.Id} — {duplicateImport.FileName}). Vui lòng rollback trước hoặc kiểm tra lại."
                );

            using var workbook = new XLWorkbook(ms);
            var worksheet = workbook.Worksheet(1);
            var allRows = worksheet.RangeUsed()?.RowsUsed().ToList() ?? new List<IXLRangeRow>();
            if (allRows.Count < 2)
                throw new BadRequestException(
                    "File Excel không có dữ liệu hoặc thiếu dòng tiêu đề."
                );

            // Đọc và validate header row
            var rawHeaders = Enumerable
                .Range(1, allRows[0].LastCellUsed()?.Address.ColumnNumber ?? 30)
                .Select(c => NormalizeImportHeader(allRows[0].Cell(c).GetString()))
                .ToList();

            int iDate = FindImportCol(rawHeaders, "ngay mua", "ngay dat hang", "ngay");
            int iCustName = FindImportCol(rawHeaders, "ten khach hang", "ten khach", "khach hang");
            int iPhone = FindImportCol(rawHeaders, "dien thoai", "so dien thoai", "sdt");
            int iCustCode = FindImportCol(rawHeaders, "ma khach hang", "ma khach");
            int iCategory = FindImportCol(rawHeaders, "loai san pham", "nhom hang", "danh muc", "loai hang");
            int iProduct = FindImportCol(rawHeaders, "ten hang", "ten san pham");
            int iSku = FindImportCol(rawHeaders, "ma hang", "sku", "ma sku");
            int iUnitPrice = FindImportCol(rawHeaders, "don gia", "gia ban");
            int iService = FindImportCol(rawHeaders, "ten dich vu", "dich vu");
            int iUnit = FindImportCol(rawHeaders, "dvt", "don vi tinh", "don vi");
            int iOrderCode = FindImportCol(rawHeaders, "ma don hang", "ma don", "so don");
            int iStatus = FindImportCol(rawHeaders, "trang thai");
            int iBranch = FindImportCol(rawHeaders, "chi nhanh");
            int iSource = FindImportCol(rawHeaders, "kenh ban", "nguon", "kenh");
            int iRevenue = FindImportCol(rawHeaders, "doanh thu", "thanh tien");
            int iShipping = FindImportCol(rawHeaders, "phi van chuyen", "phi ship", "phi giao");
            int iTax = FindImportCol(rawHeaders, "thue", "vat", "tien thue");
            int iGrossProfit = FindImportCol(rawHeaders, "loi nhuan gop", "loi nhuan");

            // Số lượng: ưu tiên "SL hàng thực bán" (col thực tế), fallback "SL hàng bán ra"
            int iQtyStr = FindImportCol(rawHeaders, "sl hang ban ra", "so luong hang ban", "so luong");
            int iQty    = FindImportCol(rawHeaders, "sl hang thuc ban", "sl thuc ban", "so luong thuc ban", "sl hang ban ra", "so luong");

            // Validate các cột bắt buộc
            var missingCols = new List<string>();
            if (iDate < 0)
                missingCols.Add("Ngày mua");
            if (iCustCode < 0)
                missingCols.Add("Mã khách hàng");
            if (iOrderCode < 0)
                missingCols.Add("Mã đơn hàng");
            if (iStatus < 0)
                missingCols.Add("Trạng thái");
            if (iBranch < 0)
                missingCols.Add("Chi nhánh");
            if (iRevenue < 0)
                missingCols.Add("Doanh thu");
            if (iQty < 0)
                missingCols.Add("Số lượng");
            if (missingCols.Any())
                throw new BadRequestException(
                    $"File Excel không đúng định dạng — thiếu cột: {string.Join(", ", missingCols)}. "
                        + "Vui lòng xuất lại file từ Sapo đúng mẫu."
                );

            var rows = allRows.Skip(1).ToList();
            var totalRows = rows.Count;

            // BƯỚC 1: TẠO TRƯỚC IMPORT HISTORY ĐỂ LẤY ID THẬT TỪ DATABASE

            var importHistory = new ImportsHistory
            {
                FileName = file.FileName,
                UserId = userId,
                SuccessCount = 0,
                ErrorCount = 0,
                Status = "Imported",
                ErrorDetails = "{}",
                ImportDate = DateTime.UtcNow,
                FileHash = fileHash,
            };
            await _importsHistoryRepository.AddAsync(importHistory);
            await _unitOfWork.SaveChangesAsync(); // Ép Database sinh ra ID thật cho importHistory
            var currentImportId = importHistory.Id; // Khóa ngoại dùng xuyên suốt luồng dưới

            // Lưu file Excel gốc vào disk để tra cứu sau này
            try
            {
                var saveFolder = Path.Combine(_mediaSettings.RootPath, "import-excel");
                Directory.CreateDirectory(saveFolder);
                var safeFileName = $"{currentImportId}_{Path.GetFileName(file.FileName)}";
                var savePath = Path.Combine(saveFolder, safeFileName);
                ms.Seek(0, SeekOrigin.Begin);
                await using var fs = new FileStream(savePath, FileMode.Create);
                await ms.CopyToAsync(fs);
                ms.Seek(0, SeekOrigin.Begin);
                importHistory.FilePath = $"import-excel/{safeFileName}";
                _context.Entry(importHistory).State = EntityState.Modified;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Import] Không lưu được file Excel: {ex.Message}");
            }

            // Tải cache lookup
            var statuses = await _orderStatusRepository
                .GetAll()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.Status.Trim());
            var branches = await _branchRepository
                .GetAll()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.Name.Trim());
            var customerCache = await _customerRepository
                .GetAll()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.CustomerCode);

            // Pre-check trùng dữ liệu theo mã đơn hàng (khác tên file nhưng cùng data)
            var orderCodesUniqueScan = rows.Select(r => r.Cell(iOrderCode + 1).GetString().Trim())
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Distinct()
                .ToList();
            if (orderCodesUniqueScan.Any())
            {
                var existingOrderCount = await _orderRepository
                    .GetAll()
                    .AsNoTracking()
                    .CountAsync(o =>
                        orderCodesUniqueScan.Contains(o.OrderCode) && o.DeletedAt == null
                    );
                var dupRate = (double)existingOrderCount / orderCodesUniqueScan.Count;
                if (dupRate >= 1.0)
                    throw new BadRequestException(
                        $"Toàn bộ {orderCodesUniqueScan.Count} mã đơn hàng trong file này đã tồn tại trong hệ thống. "
                            + "File có thể đã được import trước đó với tên khác."
                    );
                if (dupRate >= 0.8)
                    throw new BadRequestException(
                        $"{existingOrderCount}/{orderCodesUniqueScan.Count} mã đơn hàng ({dupRate:P0}) đã tồn tại. "
                            + "File này có thể đã được import trước đó. Kiểm tra lịch sử import trước khi tiếp tục."
                    );
            }

            // Cấp 2: Fingerprint dedup — chỉ bỏ qua dòng TRÙNG HOÀN TOÀN với DB (mã+ngày+doanh thu+SL)
            var orderCodesInFile = rows.Select(r => r.Cell(iOrderCode + 1).GetString().Trim())
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .ToHashSet();

            var rawFps = await (
                from oi in _context.Set<OrderItem>()
                join o in _context.Set<Order>() on oi.OrderId equals o.Id
                where orderCodesInFile.Contains(o.OrderCode) && o.DeletedAt == null
                select new
                {
                    o.OrderCode,
                    o.PurchaseDate,
                    oi.Revenue,
                    oi.Quantity,
                    oi.Sku,
                    oi.ServiceName,
                }
            ).AsNoTracking().ToListAsync();

            var dbFingerprints = rawFps
                .Select(x =>
                    $"{x.OrderCode}|{x.PurchaseDate:yyyyMMdd}|{x.Revenue}|{Math.Round(x.Quantity, 4)}|{x.Sku}|{x.ServiceName}"
                )
                .ToHashSet();

            var fileFingerprints = new HashSet<string>();
            var pendingOrders = new Dictionary<string, Order>();
            var pendingOrdersNeedReattach = new HashSet<string>();
            var pendingCustomers = new Dictionary<string, Customer>();
            var skippedCount = 0;
            var skippedMessages = new List<string>();

            foreach (var row in rows)
            {
                processedRows++;
                try
                {
                    Console.WriteLine($"Đang xử lý dòng {row.RowNumber()} / {totalRows}");

                    // Đọc dữ liệu thô theo index động (chống lệch cột)
                    var dateCell = row.Cell(iDate + 1).GetString().Trim();
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

                    var customerName =
                        iCustName >= 0 ? row.Cell(iCustName + 1).GetString().Trim() : "";
                    var customerPhone = iPhone >= 0 ? row.Cell(iPhone + 1).GetString().Trim() : "";
                    var customerCode = row.Cell(iCustCode + 1).GetString().Trim();
                    var category = iCategory >= 0 ? row.Cell(iCategory + 1).GetString().Trim() : "";
                    var productName =
                        iProduct >= 0 ? row.Cell(iProduct + 1).GetString().Trim() : "";
                    var sku = iSku >= 0 ? row.Cell(iSku + 1).GetString().Trim() : "";
                    var unitPrice = iUnitPrice >= 0 ? GetDecimal(row.Cell(iUnitPrice + 1)) : 0;
                    var serviceName =
                        iService >= 0 ? row.Cell(iService + 1).GetString().Trim() : "";
                    var unit = iUnit >= 0 ? row.Cell(iUnit + 1).GetString().Trim() : "";
                    var orderCode = row.Cell(iOrderCode + 1).GetString().Trim();
                    var statusName = row.Cell(iStatus + 1).GetString().Trim();
                    var branchName = row.Cell(iBranch + 1).GetString().Trim();
                    var source = iSource >= 0 ? row.Cell(iSource + 1).GetString().Trim() : "";
                    var quantity = iQtyStr >= 0 ? row.Cell(iQtyStr + 1).GetString().Trim() : "";
                    var revenue = GetDecimal(row.Cell(iRevenue + 1));
                    var grossProfit =
                        iGrossProfit >= 0 ? GetDecimal(row.Cell(iGrossProfit + 1)) : 0;
                    var shippingFee = iShipping >= 0 ? GetDecimal(row.Cell(iShipping + 1)) : 0;
                    var taxAmount = iTax >= 0 ? GetDecimal(row.Cell(iTax + 1)) : 0;
                    var qty = GetDecimal(row.Cell(iQty + 1));

                    // Validate dữ liệu bắt buộc
                    if (string.IsNullOrWhiteSpace(customerCode))
                        throw new BadRequestException("Mã khách hàng không được để trống");
                    if (string.IsNullOrWhiteSpace(orderCode))
                        throw new BadRequestException("Mã đơn hàng không được để trống");
                    if (!statuses.TryGetValue(statusName, out var status))
                        throw new BadRequestException($"Trạng thái '{statusName}' không tồn tại");
                    if (!branches.TryGetValue(branchName, out var branch))
                        throw new BadRequestException($"Chi nhánh '{branchName}' không tồn tại");

                    // Số lượng âm hoặc doanh thu âm → tự động gắn trạng thái "Hoàn trả"
                    if (
                        (qty < 0 || revenue < 0)
                        && statuses.TryGetValue("Hoàn trả", out var hoanTraStatus)
                    )
                        status = hoanTraStatus;

                    // Fingerprint: trùng mã đơn + ngày + doanh thu + SL → bỏ qua (đã import trước đó)
                    var fingerprint =
                        $"{orderCode}|{orderDate:yyyyMMdd}|{revenue}|{Math.Round(qty, 4)}|{sku}|{serviceName}";
                    if (
                        dbFingerprints.Contains(fingerprint)
                        || fileFingerprints.Contains(fingerprint)
                    )
                    {
                        skippedCount++;
                        skippedMessages.Add(
                            $"Dòng {row.RowNumber()}: Mã '{orderCode}' ngày {orderDate:dd/MM/yyyy} doanh thu {revenue:N0} SL {qty} — đã tồn tại, bỏ qua"
                        );
                        continue;
                    }
                    fileFingerprints.Add(fingerprint);

                    //  XỬ LÝ CUSTOMER (Gán ImportHistoryId cho khách hàng mới)

                    Customer customer;
                    int customerId;
                    if (customerCache.TryGetValue(customerCode, out customer))
                    {
                        customerId = customer.Id;
                        // Restore soft-deleted customer (e.g. sau rollback) tránh unique constraint
                        if (
                            customer.DeletedAt != null
                            && !pendingCustomers.ContainsKey(customerCode)
                        )
                        {
                            customer.DeletedAt = null;
                            customer.Name = customerName;
                            customer.Phone = customerPhone;
                            customer.ImportHistoryId = currentImportId;
                            _context.Attach(customer);
                            _context.Entry(customer).State = EntityState.Modified;
                            pendingCustomers[customerCode] = customer;
                        }
                    }
                    else if (pendingCustomers.TryGetValue(customerCode, out customer))
                    {
                        customerId = 0;
                    }
                    else
                    {
                        customer = new Customer
                        {
                            Name = customerName,
                            Phone = customerPhone,
                            CustomerCode = customerCode,
                            CreatedBy = userId,
                            ImportHistoryId = currentImportId,
                        };

                        await _customerRepository.AddAsync(customer);
                        pendingCustomers[customerCode] = customer;
                        customerId = 0;
                    }

                    // XỬ LÝ ORDER — key = mã+ngày, cùng mã khác ngày → 2 đơn riêng biệt

                    var orderKey = $"{orderCode}|{orderDate:yyyyMMdd}";
                    Order orderEntity;
                    if (pendingOrders.TryGetValue(orderKey, out orderEntity))
                    {
                        // Cần re-attach sau khi batch reload (ChangeTracker.Clear xóa tracking)
                        if (pendingOrdersNeedReattach.Contains(orderKey))
                        {
                            _context.Attach(orderEntity);
                            _context.Entry(orderEntity).State = EntityState.Modified;
                            pendingOrdersNeedReattach.Remove(orderKey);
                        }
                        orderEntity.Revenue += revenue;
                        orderEntity.GrossProfit += grossProfit;
                        orderEntity.ShippingFee += shippingFee;
                        orderEntity.TaxAmount += taxAmount;
                    }
                    else
                    {
                        orderEntity = new Order
                        {
                            OrderCode = orderCode,
                            CustomerId = customerId > 0 ? customerId : null,
                            Customer = customerId > 0 ? null : customer,
                            PurchaseDate = orderDate,
                            Revenue = revenue,
                            GrossProfit = grossProfit,
                            ShippingFee = shippingFee,
                            TaxAmount = taxAmount,
                            Source = source,
                            StatusId = status.Id,
                            BranchesId = branch.Id,
                            CreatedBy = userId,
                            ImportHistoryId = currentImportId,
                        };

                        await _orderRepository.AddAsync(orderEntity);
                        pendingOrders[orderKey] = orderEntity;
                    }

                    // XỬ LÝ ORDER ITEM (Gán ImportHistoryId)

                    var orderItem = new OrderItem
                    {
                        OrderId = orderEntity.Id > 0 ? orderEntity.Id : 0,
                        Order = orderEntity.Id > 0 ? null : orderEntity,
                        Category = category,
                        ProductName = productName,
                        Sku = sku,
                        UnitPrice = unitPrice,
                        Quantity = qty,
                        ServiceName = serviceName,
                        Unit = unit,
                        Revenue = revenue,
                        GrossProfit = grossProfit,
                        ShippingFee = shippingFee,
                        TaxAmount = taxAmount,
                        ImportHistoryId = currentImportId,
                    };
                    await _orderItemRepository.AddAsync(orderItem);

                    successCount++;

                    // Xử lý cơ chế giải phóng bộ nhớ (Batch 500 dòng)
                    if (processedRows % 500 == 0)
                    {
                        await _unitOfWork.SaveChangesAsync();
                        _context.ChangeTracker.Clear();

                        // Tải lại pendingOrders chỉ từ import hiện tại (không load toàn bộ orders)
                        var reloaded = await _orderRepository
                            .GetAll()
                            .Where(o => o.ImportHistoryId == currentImportId)
                            .AsNoTracking()
                            .ToListAsync();
                        pendingOrders = reloaded
                            .GroupBy(o => $"{o.OrderCode}|{o.PurchaseDate:yyyyMMdd}")
                            .ToDictionary(g => g.Key, g => g.First());
                        pendingOrdersNeedReattach = pendingOrders.Keys.ToHashSet();

                        customerCache = await _customerRepository
                            .GetAll()
                            .AsNoTracking()
                            .ToDictionaryAsync(x => x.CustomerCode);
                        pendingCustomers.Clear();

                        Console.WriteLine($"Đã save batch: {processedRows}/{totalRows}");
                    }

                    // Bắn thông báo qua SignalR tiến độ
                    if (processedRows % 10 == 0)
                    {
                        await _hubContext.Clients.All.SendAsync(
                            "ImportProgress",
                            new { Current = processedRows, Total = totalRows }
                        );
                    }
                }
                catch (Exception ex)
                {
                    errorCount++;
                    errors.Add(new { Row = row.RowNumber(), Error = ex.Message });
                }
            }

            // Lưu toàn bộ dữ liệu dòng dư còn lại
            await _unitOfWork.SaveChangesAsync();

            //CẬP NHẬT LẠI KẾT QUẢ CHO IMPORT HISTORY BAN ĐẦU

            var finalHistory = await _importsHistoryRepository
                .GetAll()
                .FirstOrDefaultAsync(h => h.Id == currentImportId);
            if (finalHistory != null)
            {
                finalHistory.SuccessCount = successCount;
                finalHistory.ErrorCount = errorCount;
                finalHistory.ErrorDetails = JsonSerializer.Serialize(errors);
                _context.Entry(finalHistory).State = EntityState.Modified;
            }

            // Tạo log hệ thống
            var author = await _userRepository.GetAll().FirstOrDefaultAsync(u => u.Id == userId);
            await _auditLogService.SaveLogAsync(
                userId: author.Id,
                staffCode: author.StaffCode,
                action: "Import_Excel_Customer",
                tableName: "imports_history",
                recordId: currentImportId, // Truyền trực tiếp ID của file excel vừa import vào đây
                oldData: null,
                newData: null
            );

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return new ImportResultDTO
            {
                TotalRows = totalRows,
                SuccessfulImports = successCount,
                SkippedImports = skippedCount,
                FailedImports = errorCount,
                ErrorMessages = errors
                    .Select(e =>
                        $"Dòng {e.GetType().GetProperty("Row")?.GetValue(e)}: {e.GetType().GetProperty("Error")?.GetValue(e)}"
                    )
                    .ToList(),
                SkippedMessages = skippedMessages,
            };
        }
        catch
        {
            if (transaction.GetDbTransaction().Connection != null)
            {
                await transaction.RollbackAsync();
            }
            throw;
        }
    }

    public async Task<bool> RollbackImportAsync(int importHistoryId, int userId)
    {
        // 1. Kiểm tra xem đợt import này có tồn tại không và đã rollback chưa
        var importHistory = await _importsHistoryRepository
            .GetAll()
            .FirstOrDefaultAsync(h => h.Id == importHistoryId);

        if (importHistory == null)
        {
            throw new NotFoundException("Không tìm thấy lịch sử import này.");
        }

        if (importHistory.Status == "Rollbacked")
        {
            throw new BadRequestException("File Excel này đã được hoàn tác trước đó rồi.");
        }

        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            // Lấy thời gian hiện tại chuẩn Việt Nam từ DB hoặc ép múi giờ trong code
            var crmNow = DateTime.UtcNow;

            // BƯỚC 2a-ext: HOÀN TRẢ REVENUE CHO CÁC ORDER CŨ
            // Orders cũ có items từ file này sẽ không bị soft-delete, cần trừ revenue thủ công.
            var newOrderIds = await _orderRepository
                .GetAll()
                .Where(o => o.ImportHistoryId == importHistoryId)
                .Select(o => o.Id)
                .ToHashSetAsync();

            // GroupBy trên DB — không load items vào RAM
            var revenueDeltas = await _context
                .Set<OrderItem>()
                .Where(oi =>
                    oi.ImportHistoryId == importHistoryId && !newOrderIds.Contains(oi.OrderId)
                )
                .GroupBy(oi => oi.OrderId)
                .Select(g => new
                {
                    OrderId = g.Key,
                    Revenue = g.Sum(i => i.Revenue),
                    GrossProfit = g.Sum(i => i.GrossProfit),
                    ShippingFee = g.Sum(i => i.ShippingFee),
                    TaxAmount = g.Sum(i => i.TaxAmount),
                })
                .ToListAsync();

            if (revenueDeltas.Count > 0)
            {
                // Load tất cả existing orders cần điều chỉnh trong 1 query (fix N+1)
                var existingOrderIds = revenueDeltas.Select(d => d.OrderId).ToList();
                var existingOrders = await _orderRepository
                    .GetAll()
                    .Where(o => existingOrderIds.Contains(o.Id) && o.DeletedAt == null)
                    .ToListAsync();

                var orderDict = existingOrders.ToDictionary(o => o.Id);
                foreach (var delta in revenueDeltas)
                {
                    if (orderDict.TryGetValue(delta.OrderId, out var order))
                    {
                        order.Revenue -= delta.Revenue;
                        order.GrossProfit -= delta.GrossProfit;
                        order.ShippingFee -= delta.ShippingFee;
                        order.TaxAmount -= delta.TaxAmount;
                        _context.Entry(order).State = EntityState.Modified;
                    }
                }
            }

            // BƯỚC 2a: XÓA CỨNG ORDER ITEMS — bulk DELETE trực tiếp, không load vào RAM
            await _context
                .Set<OrderItem>()
                .Where(oi => oi.ImportHistoryId == importHistoryId)
                .ExecuteDeleteAsync();

            // BƯỚC 2b: XÓA MỀM ORDERS — bulk UPDATE (trigger trg_orders_sync_customer_stats vẫn bắn per-row ở DB)
            var rollbackCount = await _context
                .Set<Order>()
                .Where(o => o.ImportHistoryId == importHistoryId && o.DeletedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(o => o.DeletedAt, crmNow));

            // BƯỚC 3: XÓA MỀM KHÁCH HÀNG — bulk UPDATE
            await _context
                .Set<Customer>()
                .Where(c => c.ImportHistoryId == importHistoryId && c.DeletedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.DeletedAt, crmNow));

            // BƯỚC 4: CẬP NHẬT TRẠNG THÁI BẢNG LỊCH SỬ IMPORT
            importHistory.Status = "Rollbacked";
            importHistory.RollbackAt = crmNow;
            importHistory.RollbackBy = userId;
            _context.Entry(importHistory).State = EntityState.Modified;

            // BƯỚC 5: GHI LOG AUDIT (ACTIVITY LOG)
            var author = await _userRepository.GetAll().FirstOrDefaultAsync(u => u.Id == userId);
            await _auditLogService.SaveLogAsync(
                userId: author.Id,
                staffCode: author.StaffCode,
                action: "Rollback_Excel_Import",
                tableName: "imports_history",
                recordId: importHistoryId,
                oldData: JsonSerializer.Serialize(
                    new { Message = $"Rollback thành công {rollbackCount} đơn hàng." }
                ),
                newData: null
            );

            // Lưu tất cả thay đổi xuống DB và commit transaction
            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return true;
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> RestoreImportAsync(int importHistoryId, int userId)
    {
        var importHistory = await _importsHistoryRepository
            .GetAll()
            .FirstOrDefaultAsync(h => h.Id == importHistoryId);

        if (importHistory == null)
        {
            throw new NotFoundException("Không tìm thấy lịch sử import này.");
        }

        if (importHistory.Status != "Rollbacked")
        {
            throw new BadRequestException(
                "File Excel này hiện không ở trạng thái bị hoàn tác, không thể khôi phục."
            );
        }

        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            // BƯỚC 2: KHÔI PHỤC CÁC ĐƠN HÀNG THUỘC FILE NÀY (HỦY XÓA MỀM)
            // Lưu ý: order_items đã bị hard-delete khi rollback, cần re-import để có lại chi tiết item.

            // Tìm tất cả các đơn hàng thuộc file này đang bị xóa mềm (DeletedAt có giá trị)
            var ordersToRestore = await _orderRepository
                .GetAll()
                .Where(o => o.ImportHistoryId == importHistoryId && o.DeletedAt != null)
                .ToListAsync();

            foreach (var order in ordersToRestore)
            {
                order.DeletedAt = null;

                // Lệnh này kích hoạt Trigger dưới DB tự động CỘNG LẠI TIỀN cho khách hàng
                await _orderRepository.Update(order);
            }

            // BƯỚC 3: KHÔI PHỤC KHÁCH HÀNG MỚI (NẾU CÓ)
            var customersToRestore = await _customerRepository
                .GetAll()
                .Where(c => c.ImportHistoryId == importHistoryId && c.DeletedAt != null)
                .ToListAsync();

            foreach (var customer in customersToRestore)
            {
                // Kiểm tra xem có khách hàng active khác cùng mã không (do file mới tạo)
                var duplicateExists = await _customerRepository
                    .GetAll()
                    .AnyAsync(c =>
                        c.CustomerCode == customer.CustomerCode
                        && c.DeletedAt == null
                        && c.Id != customer.Id
                    );

                if (!duplicateExists)
                {
                    customer.DeletedAt = null;
                    await _customerRepository.Update(customer);
                }
                // Nếu đã có bản ghi active khác → bỏ qua, không khôi phục bản cũ
            }

            // BƯỚC 4: ĐƯA TRẠNG THÁI FILE EXCEL QUAY LẠI BAN ĐẦU
            importHistory.Status = "Imported";
            importHistory.RollbackAt = null; // Xóa dấu vết thời gian rollback cũ
            importHistory.RollbackBy = null; // Xóa người rollback cũ
            await _importsHistoryRepository.Update(importHistory);

            // ============================================================
            // BƯỚC 5: GHI LOG AUDIT SYSTEM
            // ============================================================
            var author = await _userRepository.GetAll().FirstOrDefaultAsync(u => u.Id == userId);
            await _auditLogService.SaveLogAsync(
                userId: author.Id,
                staffCode: author.StaffCode,
                action: "Restore_Excel_Import",
                tableName: "imports_history",
                recordId: importHistoryId,
                oldData: JsonSerializer.Serialize(
                    new
                    {
                        Message = $"Khôi phục thành công {ordersToRestore.Count} đơn hàng từ file bị hủy.",
                    }
                ),
                newData: null
            );

            // Lưu tất cả thay đổi xuống DB và kết thúc transaction
            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return true;
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private static string NormalizeImportHeader(string raw)
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

    private decimal GetDecimal(IXLCell cell)
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

    public async Task<PagedResult<OrderDTO>> GetAllOrdersForOnlineAsync(OrderFilterDTO filter)
    {
        var query = _orderRepository
            .GetAll()
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
            .Include(o => o.Status)
            .Include(o => o.Branches)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var keyword = filter.Search.Trim().ToLower();
            query = query.Where(o =>
                o.OrderCode.ToLower().Contains(keyword)
                || o.Customer.Name.ToLower().Contains(keyword)
                || o.Customer.Phone.Contains(keyword)
            );
        }
        if (filter.FromDate.HasValue && filter.ToDate.HasValue && filter.FromDate > filter.ToDate)
        {
            throw new BadRequestException("Ngày bắt đầu phải nhỏ hơn ngày kết thúc");
        }

        //date range
        if (filter.FromDate.HasValue)
        {
            query = query.Where(o => o.PurchaseDate >= filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(o => o.PurchaseDate <= filter.ToDate.Value);
        }

        //filter
        if (filter.StatusId.HasValue)
        {
            query = query.Where(o => o.StatusId == filter.StatusId.Value);
        }

        if (filter.BranchId.HasValue)
        {
            query = query.Where(o => o.BranchesId == filter.BranchId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Source))
        {
            var source = filter.Source.Trim().ToLower();
            query = query.Where(o => o.Source.ToLower() == source);
        }
        // sort delete
        query = query.Where(o =>
            o.DeletedAt == null
            && (o.Customer == null || o.Customer.DeletedAt == null)
            && o.Source != "Pos"
            && o.Source != "Khác"
            && o.Source != "Khách đặt tại quầy"
        );
        // sort
        query = (filter.SortBy, filter.SortDir) switch
        {
            ("revenue", "asc") => query.OrderBy(o => o.Revenue),
            ("revenue", "desc") => query.OrderByDescending(o => o.Revenue),
            ("purchaseDate", "asc") => query.OrderBy(o => o.PurchaseDate),
            ("purchaseDate", "desc") => query.OrderByDescending(o => o.PurchaseDate),
            _ => query,
        };
        //pagination
        var totalItems = await query.CountAsync();

        var orders = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(o => new OrderDTO
            {
                Id = o.Id,
                OrderCode = o.OrderCode,
                PurchaseDate = o.PurchaseDate,
                Source = o.Source,
                Channel = o.Channel,
                Revenue = o.Revenue,
                GrossProfit = o.GrossProfit,
                ShippingFee = o.ShippingFee,
                TaxAmount = o.TaxAmount,
                CreatedAt = o.CreatedAt,
                CustomerName = o.Customer.Name,
                CustomerPhone = o.Customer.Phone,
                StatusName = o.Status.Status,
                BranchName = o.Branches.Name,
                Items = o
                    .OrderItems.Select(oi => new OrderItemDTO
                    {
                        Id = oi.Id,
                        Category = oi.Category,
                        ProductName = oi.ProductName,
                        SKU = oi.Sku,
                        UnitPrice = oi.UnitPrice,
                        Quantity = oi.Quantity,
                        ServiceName = oi.ServiceName,
                        Unit = oi.Unit,
                    })
                    .ToList(),
            })
            .ToListAsync();

        return new PagedResult<OrderDTO>
        {
            TotalItems = totalItems,
            Page = filter.Page,
            PageSize = filter.PageSize,
            Items = orders,
        };
    }

    public async Task<PagedResult<OrderDTO>> GetAllOrdersForSalesAsync(OrderFilterDTO filter)
    {
        var query = _orderRepository
            .GetAll()
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
            .Include(o => o.Status)
            .Include(o => o.Branches)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var keyword = filter.Search.Trim().ToLower();
            query = query.Where(o =>
                o.OrderCode.ToLower().Contains(keyword)
                || o.Customer.Name.ToLower().Contains(keyword)
                || o.Customer.Phone.Contains(keyword)
            );
        }
        if (filter.FromDate.HasValue && filter.ToDate.HasValue && filter.FromDate > filter.ToDate)
        {
            throw new BadRequestException("Ngày bắt đầu phải nhỏ hơn ngày kết thúc");
        }

        //date range
        if (filter.FromDate.HasValue)
        {
            query = query.Where(o => o.PurchaseDate >= filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(o => o.PurchaseDate <= filter.ToDate.Value);
        }

        //filter
        if (filter.StatusId.HasValue)
        {
            query = query.Where(o => o.StatusId == filter.StatusId.Value);
        }

        if (filter.BranchId.HasValue)
        {
            query = query.Where(o => o.BranchesId == filter.BranchId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Source))
        {
            var source = filter.Source.Trim().ToLower();
            query = query.Where(o => o.Source.ToLower() == source);
        }
        // sort delete
        query = query.Where(o =>
            o.DeletedAt == null && (o.Customer == null || o.Customer.DeletedAt == null)
        );
        // sort
        query = (filter.SortBy, filter.SortDir) switch
        {
            ("revenue", "asc") => query.OrderBy(o => o.Revenue),
            ("revenue", "desc") => query.OrderByDescending(o => o.Revenue),
            ("purchaseDate", "asc") => query.OrderBy(o => o.PurchaseDate),
            ("purchaseDate", "desc") => query.OrderByDescending(o => o.PurchaseDate),
            _ => query,
        };
        //pagination
        var totalItems = await query.CountAsync();

        var orders = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(o => new OrderDTO
            {
                Id = o.Id,
                OrderCode = o.OrderCode,
                PurchaseDate = o.PurchaseDate,
                Source = o.Source,
                Channel = o.Channel,
                Revenue = o.Revenue,
                GrossProfit = o.GrossProfit,
                ShippingFee = o.ShippingFee,
                TaxAmount = o.TaxAmount,
                CreatedAt = o.CreatedAt,
                CustomerName = o.Customer.Name,
                CustomerPhone = o.Customer.Phone,
                StatusName = o.Status.Status,
                BranchName = o.Branches.Name,
                Items = o
                    .OrderItems.Select(oi => new OrderItemDTO
                    {
                        Id = oi.Id,
                        Category = oi.Category,
                        ProductName = oi.ProductName,
                        SKU = oi.Sku,
                        UnitPrice = oi.UnitPrice,
                        Quantity = oi.Quantity,
                        ServiceName = oi.ServiceName,
                        Unit = oi.Unit,
                    })
                    .ToList(),
            })
            .ToListAsync();

        return new PagedResult<OrderDTO>
        {
            TotalItems = totalItems,
            Page = filter.Page,
            PageSize = filter.PageSize,
            Items = orders,
        };
    }

    public async Task<OrderDTO> GetOrderByIdAsync(int id)
    {
        var order = await _orderRepository
            .GetAll()
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
            .Include(o => o.Status)
            .Include(o => o.Branches)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
        {
            throw new NotFoundException("Đơn hàng không tồn tại");
        }

        return new OrderDTO
        {
            Id = order.Id,
            OrderCode = order.OrderCode,
            PurchaseDate = order.PurchaseDate,
            Source = order.Source,
            Channel = order.Channel,
            Revenue = order.Revenue,
            GrossProfit = order.GrossProfit,
            ShippingFee = order.ShippingFee,
            TaxAmount = order.TaxAmount,
            CreatedAt = order.CreatedAt,
            CustomerName = order.Customer.Name,
            CustomerPhone = order.Customer.Phone,
            StatusName = order.Status.Status,
            BranchName = order.Branches.Name,
            Items = order
                .OrderItems.Select(oi => new OrderItemDTO
                {
                    Id = oi.Id,
                    Category = oi.Category,
                    ProductName = oi.ProductName,
                    SKU = oi.Sku,
                    UnitPrice = oi.UnitPrice,
                    Quantity = oi.Quantity,
                    ServiceName = oi.ServiceName,
                    Unit = oi.Unit,
                })
                .ToList(),
        };
    }

    public async Task<StatusDTO[]> GetAllStatusesAsync()
    {
        var statuses = await _orderStatusRepository
            .GetAll()
            .AsNoTracking()
            .Select(s => new StatusDTO { Id = s.Id, Name = s.Status })
            .ToArrayAsync();

        return statuses;
    }

    public async Task<BranchDTO[]> GetAllBranchesAsync()
    {
        var branches = await _branchRepository
            .GetAll()
            .AsNoTracking()
            .Select(b => new BranchDTO { Id = b.Id, Name = b.Name })
            .ToArrayAsync();

        return branches;
    }
}
