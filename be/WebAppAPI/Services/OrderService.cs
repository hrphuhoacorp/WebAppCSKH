using System.Globalization;
using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using WebAppInfractor.Data;
using WebAppInfractor.Models;

public interface IOrderService
{
    Task<ImportResultDTO> ImportExcelAsync(IFormFile file, int userId);
    Task<PagedResult<OrderDTO>> GetAllOrdersAsync(OrderFilterDTO filter);
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
        IActivityService auditLogService
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
            using var stream = file.OpenReadStream();
            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheet(1);
            var rows = worksheet.RangeUsed().RowsUsed().Skip(1).ToList(); // Bỏ qua header
            var totalRows = rows.Count();

            // BƯỚC 1: TẠO TRƯỚC IMPORT HISTORY ĐỂ LẤY ID THẬT TỪ DATABASE

            var importHistory = new ImportsHistory
            {
                FileName = file.FileName,
                UserId = userId,
                SuccessCount = 0, // Sẽ cập nhật lại sau khi chạy xong
                ErrorCount = 0,
                Status = "Imported",
                ErrorDetails = "{}",
                ImportDate = DateTime.UtcNow.AddHours(7),
            };
            await _importsHistoryRepository.AddAsync(importHistory);
            await _unitOfWork.SaveChangesAsync(); // Ép Database sinh ra ID thật cho importHistory
            var currentImportId = importHistory.Id; // Khóa ngoại dùng xuyên suốt luồng dưới

            // Tải cache ban đầu
            var statuses = await _orderStatusRepository
                .GetAll()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.TrangThai.Trim());
            var branches = await _branchRepository
                .GetAll()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.Name.Trim());
            var orderCache = await _orderRepository
                .GetAll()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.OrderCode);
            var customerCache = await _customerRepository
                .GetAll()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.CustomerCode);

            var pendingOrders = new Dictionary<string, Order>();
            var pendingCustomers = new Dictionary<string, Customer>();

            foreach (var row in rows)
            {
                processedRows++;
                try
                {
                    Console.WriteLine($"Đang xử lý dòng {row.RowNumber()} / {totalRows}");

                    // Đọc dữ liệu thô
                    var dateCell = row.Cell(1).GetString().Trim();
                    if (
                        !DateTime.TryParseExact(
                            dateCell,
                            "dd/MM/yyyy",
                            CultureInfo.InvariantCulture,
                            DateTimeStyles.None,
                            out var orderDate
                        )
                    )
                    {
                        throw new BadRequestException("Ngày mua không hợp lệ");
                    }
                    var blockSource = row.Cell(14).GetString().Trim().ToLower();

                    var customerName = row.Cell(2).GetString().Trim();
                    var customerPhone = row.Cell(3).GetString().Trim();
                    var customerCode = row.Cell(4).GetString().Trim();

                    var category = row.Cell(5).GetString().Trim();
                    var productName = row.Cell(6).GetString().Trim();
                    var sku = row.Cell(7).GetString().Trim();
                    var unitPrice = GetDecimal(row.Cell(8));
                    var serviceName = row.Cell(9).GetString().Trim();
                    var unit = row.Cell(10).GetString().Trim();

                    var orderCode = row.Cell(11).GetString().Trim();
                    var statusName = row.Cell(12).GetString().Trim();
                    var branchName = row.Cell(13).GetString().Trim();
                    var source = row.Cell(14).GetString().Trim();
                    var quantity = row.Cell(15).GetString().Trim();

                    var revenue = GetDecimal(row.Cell(23));
                    var grossProfit = GetDecimal(row.Cell(24));
                    var shippingFee = GetDecimal(row.Cell(22));
                    var taxAmount = GetDecimal(row.Cell(21));

                    // Validate dữ liệu bắt buộc
                    if (string.IsNullOrWhiteSpace(customerCode))
                        throw new BadRequestException("Mã khách hàng không được để trống");
                    if (string.IsNullOrWhiteSpace(orderCode))
                        throw new BadRequestException("Mã đơn hàng không được để trống");
                    if (!statuses.TryGetValue(statusName, out var status))
                        throw new BadRequestException($"Trạng thái '{statusName}' không tồn tại");
                    if (!branches.TryGetValue(branchName, out var branch))
                        throw new BadRequestException($"Chi nhánh '{branchName}' không tồn tại");

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
                            ImportHistoryId = currentImportId, // GÁN ĐỂ BIẾT KHÁCH NÀY TẠO TỪ FILE NÀO
                        };

                        await _customerRepository.AddAsync(customer);
                        pendingCustomers[customerCode] = customer;
                        customerId = 0;
                    }

                    //XỬ LÝ ORDER (Gán ImportHistoryId cho đơn hàng mới)

                    Order orderEntity;
                    if (orderCache.TryGetValue(orderCode, out var existingOrder))
                    {
                        existingOrder.Revenue += revenue;
                        existingOrder.GrossProfit += grossProfit;
                        existingOrder.ShippingFee += shippingFee;
                        existingOrder.TaxAmount += taxAmount;

                        if (!pendingOrders.ContainsKey(orderCode))
                        {
                            // Restore soft-deleted order (e.g. sau rollback)
                            if (existingOrder.DeletedAt != null)
                                existingOrder.DeletedAt = null;
                            _context.Attach(existingOrder);
                            _context.Entry(existingOrder).State = EntityState.Modified;
                            pendingOrders[orderCode] = existingOrder;
                        }
                        orderEntity = existingOrder;
                    }
                    else if (pendingOrders.TryGetValue(orderCode, out orderEntity))
                    {
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
                            ImportHistoryId = currentImportId, // GÁN ĐỂ PHỤC VỤ LUỒNG ROLLBACK
                        };

                        await _orderRepository.AddAsync(orderEntity);
                        pendingOrders[orderCode] = orderEntity;
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
                        Quantity = decimal.Parse(quantity),
                        ServiceName = serviceName,
                        Unit = unit,
                        Revenue = revenue,
                        GrossProfit = grossProfit,
                        ShippingFee = shippingFee,
                        TaxAmount = taxAmount,
                        ImportHistoryId = currentImportId, // GÁN ĐỂ PHỤC VỤ LUỒNG ROLLBACK
                    };
                    await _orderItemRepository.AddAsync(orderItem);

                    successCount++;

                    // Xử lý cơ chế giải phóng bộ nhớ (Batch 500 dòng)
                    if (processedRows % 500 == 0)
                    {
                        await _unitOfWork.SaveChangesAsync();
                        _context.ChangeTracker.Clear();

                        // Tải lại Cache sạch từ DB
                        orderCache = await _orderRepository
                            .GetAll()
                            .AsNoTracking()
                            .ToDictionaryAsync(x => x.OrderCode);
                        customerCache = await _customerRepository
                            .GetAll()
                            .AsNoTracking()
                            .ToDictionaryAsync(x => x.CustomerCode);
                        pendingOrders.Clear();
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
                FailedImports = errorCount,
                ErrorMessages = errors
                    .Select(e =>
                        $"Dòng {e.GetType().GetProperty("Row")?.GetValue(e)}: {e.GetType().GetProperty("Error")?.GetValue(e)}"
                    )
                    .ToList(),
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
            var crmNow = DateTime.UtcNow.AddHours(7);

            // BƯỚC 2a: XÓA CỨNG ORDER ITEMS (không có soft-delete)
            var itemsToDelete = await _context
                .Set<OrderItem>()
                .Where(oi => oi.ImportHistoryId == importHistoryId)
                .ToListAsync();

            // BƯỚC 2a-ext: HOÀN TRẢ REVENUE CHO CÁC ORDER CŨ (không phải order mới tạo bởi file này)
            // Orders cũ có items từ file này sẽ không bị soft-delete, cần trừ revenue thủ công.
            var newOrderIds = await _orderRepository
                .GetAll()
                .Where(o => o.ImportHistoryId == importHistoryId)
                .Select(o => o.Id)
                .ToHashSetAsync();

            var revenueByExistingOrder = itemsToDelete
                .Where(i => !newOrderIds.Contains(i.OrderId))
                .GroupBy(i => i.OrderId)
                .Select(g => new
                {
                    OrderId = g.Key,
                    Revenue = g.Sum(i => i.Revenue),
                    GrossProfit = g.Sum(i => i.GrossProfit),
                    ShippingFee = g.Sum(i => i.ShippingFee),
                    TaxAmount = g.Sum(i => i.TaxAmount),
                })
                .ToList();

            foreach (var delta in revenueByExistingOrder)
            {
                var existingOrder = await _orderRepository
                    .GetAll()
                    .FirstOrDefaultAsync(o => o.Id == delta.OrderId && o.DeletedAt == null);
                if (existingOrder != null)
                {
                    existingOrder.Revenue -= delta.Revenue;
                    existingOrder.GrossProfit -= delta.GrossProfit;
                    existingOrder.ShippingFee -= delta.ShippingFee;
                    existingOrder.TaxAmount -= delta.TaxAmount;
                    _context.Entry(existingOrder).State = EntityState.Modified;
                }
            }

            _context.Set<OrderItem>().RemoveRange(itemsToDelete);

            // BƯỚC 2b: XÓA MỀM CÁC ĐƠN HÀNG THUỘC FILE IMPORT NÀY
            // Lấy ra tất cả các đơn hàng chưa bị xóa của đợt import này
            var ordersToRollback = await _orderRepository
                .GetAll()
                .Where(o => o.ImportHistoryId == importHistoryId && o.DeletedAt == null)
                .ToListAsync();

            foreach (var order in ordersToRollback)
            {
                order.DeletedAt = crmNow; // Đánh dấu xóa mềm

                // Lệnh này kích hoạt Trigger trg_orders_sync_customer_stats dưới DB
                // Trigger sẽ tự động trừ tiền và giảm số đơn của khách hàng tương ứng.
                _context.Entry(order).State = EntityState.Modified;
            }

            // BƯỚC 3: XÓA MỀM KHÁCH HÀNG MỚI (NẾU CÓ)
            var customersToRollback = await _customerRepository
                .GetAll()
                .Where(c => c.ImportHistoryId == importHistoryId && c.DeletedAt == null)
                .ToListAsync();

            foreach (var customer in customersToRollback)
            {
                customer.DeletedAt = crmNow;
                _context.Entry(customer).State = EntityState.Modified;
            }

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
                    new { Message = $"Rollback thành công {ordersToRollback.Count} đơn hàng." }
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

    private decimal GetDecimal(IXLCell cell)
    {
        try
        {
            if (cell.IsEmpty())
                return 0;

            return cell.GetValue<decimal>();
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"Lỗi đọc số tại cell {cell.Address}: {cell.GetString()} - {ex.Message}"
            );
            return 0;
        }
    }

    public async Task<PagedResult<OrderDTO>> GetAllOrdersAsync(OrderFilterDTO filter)
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
            && o.Source != "Pos" && o.Source != "Khác" && o.Source != "Khách đặt tại quầy"
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
                StatusName = o.Status.TrangThai,
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
            StatusName = order.Status.TrangThai,
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
            .Select(s => new StatusDTO { Id = s.Id, Name = s.TrangThai })
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
