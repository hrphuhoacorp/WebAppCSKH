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
    Task<RestoreResultDTO> RestoreImportAsync(int importHistoryId, int userId);
    Task<ReverseOrderItemsResultDTO> ReverseOrderItemsRevenueAsync(List<int> orderItemIds, int userId);
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
    private readonly WebAppAPI.Services.SapoService _sapoService;

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
        IOptions<MediaSettings> mediaOptions,
        WebAppAPI.Services.SapoService sapoService
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
        _sapoService = sapoService;
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

            // Đọc và validate header row (dùng parser dùng chung với ReconciliationService)
            var columnMap = SapoExcelRowParser.ParseHeader(allRows[0]);
            SapoExcelRowParser.EnsureNoMissingColumns(columnMap);

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
            var orderCodesUniqueScan = rows.Select(r => r.Cell(columnMap.OrderCode + 1).GetString().Trim())
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Distinct()
                .ToList();
            if (orderCodesUniqueScan.Any())
            {
                var existingOrders = await _orderRepository
                    .GetAll()
                    .AsNoTracking()
                    .Where(o => orderCodesUniqueScan.Contains(o.OrderCode) && o.DeletedAt == null)
                    .Select(o => o.OrderCode)
                    .Distinct()
                    .ToListAsync();
                var existingOrderCount = existingOrders.Count;
                var dupRate = (double)existingOrderCount / orderCodesUniqueScan.Count;
                if (dupRate >= 1.0)
                    throw new BadRequestException(
                        $"Toàn bộ {orderCodesUniqueScan.Count} mã đơn hàng trong file đã tồn tại trong hệ thống: "
                            + string.Join(", ", existingOrders.Take(20))
                            + (existingOrders.Count > 20 ? $"... (và {existingOrders.Count - 20} mã khác)" : "")
                            + ". File có thể đã được import trước đó với tên khác."
                    );
                // Nếu <100%: cho qua, fingerprint check sẽ tự skip từng dòng đã tồn tại
            }

            // Cấp 2: Fingerprint dedup — phân biệt đơn gốc và đơn hoàn trả (cùng mã nhưng qty/revenue âm)
            var orderCodesInFile = rows.Select(r => r.Cell(columnMap.OrderCode + 1).GetString().Trim())
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
                .Select(x => SapoExcelRowParser.MakeFingerprint(x.OrderCode, x.PurchaseDate, x.Revenue, x.Quantity, x.Sku ?? "", x.ServiceName ?? ""))
                .ToHashSet();

            var fileFingerprints = new HashSet<string>();
            var pendingOrders = new Dictionary<string, Order>();
            var pendingOrdersNeedReattach = new HashSet<string>();
            var pendingCustomers = new Dictionary<string, Customer>();
            var skippedCount = 0;
            var skippedMessages = new List<string>();
            var sapoGiftRows = new List<SapoImportRowDTO>(); // thu thập để tạo SapoSalesRow sau

            foreach (var row in rows)
            {
                processedRows++;
                try
                {
                    Console.WriteLine($"Đang xử lý dòng {row.RowNumber()} / {totalRows}");

                    // Đọc + validate dữ liệu thô theo index động (dùng parser dùng chung)
                    var raw = SapoExcelRowParser.ParseRow(row, columnMap);

                    if (!statuses.TryGetValue(raw.StatusName, out var status))
                        throw new BadRequestException($"Trạng thái '{raw.StatusName}' không tồn tại");
                    if (!branches.TryGetValue(raw.BranchName, out var branch))
                        throw new BadRequestException($"Chi nhánh '{raw.BranchName}' không tồn tại");

                    // Số lượng âm hoặc doanh thu âm → tự động gắn trạng thái "Hoàn trả"
                    if (
                        (raw.Quantity < 0 || raw.Revenue < 0)
                        && statuses.TryGetValue("Hoàn trả", out var hoanTraStatus)
                    )
                        status = hoanTraStatus;

                    // Fingerprint: trùng DB hoặc trùng dòng khác trong file → bỏ qua
                    var fingerprint = SapoExcelRowParser.MakeFingerprint(raw.OrderCode, raw.PurchaseDate, raw.Revenue, raw.Quantity, raw.Sku, raw.ServiceName);
                    if (dbFingerprints.Contains(fingerprint) || fileFingerprints.Contains(fingerprint))
                    {
                        skippedCount++;
                        skippedMessages.Add(
                            $"Dòng {row.RowNumber()}: Mã '{raw.OrderCode}' ngày {raw.PurchaseDate:dd/MM/yyyy} doanh thu {raw.Revenue:N0} SL {raw.Quantity} — đã tồn tại, bỏ qua"
                        );
                        continue;
                    }
                    fileFingerprints.Add(fingerprint);

                    //  XỬ LÝ CUSTOMER (Gán ImportHistoryId cho khách hàng mới)

                    Customer customer;
                    int customerId;
                    if (customerCache.TryGetValue(raw.CustomerCode, out customer))
                    {
                        customerId = customer.Id;
                        // Restore soft-deleted customer (e.g. sau rollback) tránh unique constraint
                        if (
                            customer.DeletedAt != null
                            && !pendingCustomers.ContainsKey(raw.CustomerCode)
                        )
                        {
                            customer.DeletedAt = null;
                            customer.Name = raw.CustomerName;
                            customer.Phone = raw.CustomerPhone;
                            customer.ImportHistoryId = currentImportId;
                            _context.Attach(customer);
                            _context.Entry(customer).State = EntityState.Modified;
                            pendingCustomers[raw.CustomerCode] = customer;
                        }
                    }
                    else if (pendingCustomers.TryGetValue(raw.CustomerCode, out customer))
                    {
                        customerId = 0;
                    }
                    else
                    {
                        customer = new Customer
                        {
                            Name = raw.CustomerName,
                            Phone = raw.CustomerPhone,
                            CustomerCode = raw.CustomerCode,
                            CreatedBy = userId,
                            ImportHistoryId = currentImportId,
                        };

                        await _customerRepository.AddAsync(customer);
                        pendingCustomers[raw.CustomerCode] = customer;
                        customerId = 0;
                    }

                    // XỬ LÝ ORDER — key = mã+ngày, cùng mã khác ngày → 2 đơn riêng biệt

                    var orderKey = $"{raw.OrderCode}|{raw.PurchaseDate:yyyyMMdd}";
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
                        orderEntity.Revenue += raw.Revenue;
                        orderEntity.GrossProfit += raw.NetRevenue;
                        orderEntity.ShippingFee += raw.ShippingFee;
                        orderEntity.TaxAmount += raw.TaxAmount;
                    }
                    else
                    {
                        orderEntity = new Order
                        {
                            OrderCode = raw.OrderCode,
                            CustomerId = customerId > 0 ? customerId : null,
                            Customer = customerId > 0 ? null : customer,
                            PurchaseDate = raw.PurchaseDate,
                            Revenue = raw.Revenue,
                            GrossProfit = raw.NetRevenue,
                            ShippingFee = raw.ShippingFee,
                            TaxAmount = raw.TaxAmount,
                            Source = raw.Source,
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
                        Category = raw.Category,
                        ProductName = raw.ProductName,
                        Sku = raw.Sku,
                        UnitPrice = raw.UnitPrice,
                        Quantity = raw.Quantity,
                        ServiceName = raw.ServiceName,
                        Unit = raw.Unit,
                        Revenue = raw.Revenue,
                        GrossProfit = raw.NetRevenue,
                        ShippingFee = raw.ShippingFee,
                        TaxAmount = raw.TaxAmount,
                        ImportHistoryId = currentImportId,
                    };
                    await _orderItemRepository.AddAsync(orderItem);

                    successCount++;

                    // Thu thập tất cả dòng mới để BuildRowsFromOrderItemsAsync tự phát hiện
                    // giỏ quà (SKU 200/600 và đơn có "DỊCH VỤ ĐÓNG GÓI" không có SKU 600)
                    sapoGiftRows.Add(raw);

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

            // Tự động tạo SapoSalesRow cho Dashboard Giỏ Quà (thống kê + quy đổi mã biến thể về
            // 1 mã gốc, có note nguồn gốc) — KHÔNG dùng để nuôi NxtRow nữa, xem
            // SyncNxtSapoSoldFromOrdersAsync bên dưới (đọc thẳng Order/OrderItem, mã thô).
            if (sapoGiftRows.Count > 0)
            {
                var sapoRows = await _sapoService.BuildRowsFromOrderItemsAsync(
                    sapoGiftRows, currentImportId, userId.ToString()
                );
                if (sapoRows.Count > 0)
                    await _context.SapoSalesRows.AddRangeAsync(sapoRows);
            }

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

            // Sync NxtRow.SapoSold TRỰC TIẾP từ Order/OrderItem vừa import (mã thô, không qua
            // SapoSalesRow/ResolveCode) — xem SapoService.SyncNxtSapoSoldFromOrdersAsync.
            if (sapoGiftRows.Count > 0)
                await _sapoService.SyncNxtSapoSoldFromOrdersAsync(
                    sapoGiftRows.Select(r => r.PurchaseDate).Distinct()
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

            // Thu thập ngày mua trước khi xóa OrderItem — để sync lại NxtRow.SapoSold sau (đọc
            // trực tiếp Order/OrderItem, không qua SapoSalesRow).
            var rollbackPurchaseDates = await (
                from oi in _context.Set<OrderItem>()
                join o in _context.Set<Order>() on oi.OrderId equals o.Id
                where oi.ImportHistoryId == importHistoryId
                select o.PurchaseDate
            ).Distinct().ToListAsync();

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

            // BƯỚC 2c: XÓA SapoSalesRows (dữ liệu Dashboard Giỏ Quà) của lượt import này
            await _context
                .Set<SapoSalesRow>()
                .Where(r => r.ImportHistoryId == importHistoryId)
                .ExecuteDeleteAsync();

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

            // Sync lại NxtRow.SapoSold TRỰC TIẾP từ Order/OrderItem sau khi đã xóa (mã thô)
            if (rollbackPurchaseDates.Count > 0)
                await _sapoService.SyncNxtSapoSoldFromOrdersAsync(rollbackPurchaseDates);

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

    public async Task<RestoreResultDTO> RestoreImportAsync(int importHistoryId, int userId)
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

            var restoredCount = 0;
            var skippedDuplicateCount = 0;
            foreach (var order in ordersToRestore)
            {
                // Kiểm tra xem đã có đơn hàng active khác trùng Mã + Ngày mua chưa (vd: file
                // này bị rollback rồi sau đó có người import lại dữ liệu tương tự thành batch
                // khác) — nếu có, KHÔNG khôi phục để tránh đếm doanh thu 2 lần.
                var duplicateExists = await _orderRepository
                    .GetAll()
                    .AnyAsync(o =>
                        o.OrderCode == order.OrderCode
                        && o.PurchaseDate == order.PurchaseDate
                        && o.DeletedAt == null
                        && o.Id != order.Id
                    );

                if (duplicateExists)
                {
                    skippedDuplicateCount++;
                    continue; // giữ nguyên soft-deleted
                }

                order.DeletedAt = null;
                restoredCount++;

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
                        Message = skippedDuplicateCount > 0
                            ? $"Khôi phục {restoredCount} đơn hàng từ file bị hủy, bỏ qua {skippedDuplicateCount} đơn vì đã có bản ghi active trùng Mã đơn + Ngày mua."
                            : $"Khôi phục thành công {restoredCount} đơn hàng từ file bị hủy.",
                    }
                ),
                newData: null
            );

            // Lưu tất cả thay đổi xuống DB và kết thúc transaction
            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return new RestoreResultDTO
            {
                RestoredCount = restoredCount,
                SkippedDuplicateCount = skippedDuplicateCount,
            };
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // Dùng chung cho RollbackImportAsync (gián tiếp, cùng công thức) và ReconciliationService
    // (ConfirmDeleteExcessRowsAsync) — trừ đúng doanh thu của Order cha khi xóa 1 phần OrderItem,
    // không phải xóa nguyên batch import như Rollback. KHÔNG tự mở transaction — caller chịu
    // trách nhiệm bọc transaction (để gộp chung với các thay đổi khác của caller trong 1 giao dịch).
    public async Task<ReverseOrderItemsResultDTO> ReverseOrderItemsRevenueAsync(List<int> orderItemIds, int userId)
    {
        var result = new ReverseOrderItemsResultDTO();
        if (orderItemIds == null || orderItemIds.Count == 0)
            return result;

        var itemsToDelete = await _context
            .Set<OrderItem>()
            .Where(oi => orderItemIds.Contains(oi.Id))
            .Select(oi => new
            {
                oi.Id,
                oi.OrderId,
                oi.Revenue,
                oi.GrossProfit,
                oi.ShippingFee,
                oi.TaxAmount,
            })
            .ToListAsync();

        if (itemsToDelete.Count == 0)
            return result;

        var deltasByOrder = itemsToDelete
            .GroupBy(x => x.OrderId)
            .Select(g => new
            {
                OrderId = g.Key,
                Revenue = g.Sum(x => x.Revenue),
                GrossProfit = g.Sum(x => x.GrossProfit),
                ShippingFee = g.Sum(x => x.ShippingFee),
                TaxAmount = g.Sum(x => x.TaxAmount),
            })
            .ToList();

        var orderIds = deltasByOrder.Select(d => d.OrderId).ToList();
        var orders = await _orderRepository
            .GetAll()
            .Where(o => orderIds.Contains(o.Id) && o.DeletedAt == null)
            .ToListAsync();
        var orderDict = orders.ToDictionary(o => o.Id);

        foreach (var delta in deltasByOrder)
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

        // Xóa cứng OrderItem đã chọn
        var deleteIds = itemsToDelete.Select(x => x.Id).ToList();
        await _context.Set<OrderItem>().Where(oi => deleteIds.Contains(oi.Id)).ExecuteDeleteAsync();

        // Order nào hết sạch OrderItem sau khi xóa thì soft-delete luôn (không còn ý nghĩa hiển thị)
        var stillHasItems = await _context
            .Set<OrderItem>()
            .Where(oi => orderIds.Contains(oi.OrderId))
            .Select(oi => oi.OrderId)
            .Distinct()
            .ToListAsync();
        var emptyOrderIds = orderIds.Except(stillHasItems).ToList();
        var softDeletedCount = 0;
        if (emptyOrderIds.Count > 0)
        {
            softDeletedCount = await _context
                .Set<Order>()
                .Where(o => emptyOrderIds.Contains(o.Id) && o.DeletedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(o => o.DeletedAt, DateTime.UtcNow));
        }

        await _unitOfWork.SaveChangesAsync();

        result.DeletedItemCount = deleteIds.Count;
        result.AdjustedOrderCount = orderDict.Count;
        result.SoftDeletedOrderCount = softDeletedCount;
        return result;
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
            // Bao trọn hết ngày kết thúc (đến trước nửa đêm ngày hôm sau) — dùng "<=" so với
            // đúng nửa đêm ngày kết thúc sẽ bỏ sót mọi đơn có giờ giấc khác 00:00:00 trong ngày đó.
            query = query.Where(o => o.PurchaseDate < filter.ToDate.Value.AddDays(1));
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
            // Bao trọn hết ngày kết thúc (đến trước nửa đêm ngày hôm sau) — dùng "<=" so với
            // đúng nửa đêm ngày kết thúc sẽ bỏ sót mọi đơn có giờ giấc khác 00:00:00 trong ngày đó.
            query = query.Where(o => o.PurchaseDate < filter.ToDate.Value.AddDays(1));
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
