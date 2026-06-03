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
        IHubContext<ImportHub> hubContext
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

                    //dọc dữ liệu
                    var dateCell = row.Cell(1).GetString().Trim();

                    if (!DateTime.TryParse(dateCell, out var orderDate))
                    {
                        throw new BadRequestException("Ngày mua không hợp lệ");
                    }
                    var blockSourch = row.Cell(14).GetString().Trim().ToLower();
                    if (blockSourch.Contains("pos") || blockSourch.Contains("khác"))
                    {
                        continue;
                    }

                    var customerName = row.Cell(2).GetString().Trim();
                    var customerPhone = row.Cell(3).GetString().Trim();
                    var customerCode = row.Cell(4).GetString().Trim();

                    var category = row.Cell(5).GetString().Trim(); // Cột E
                    var productName = row.Cell(6).GetString().Trim(); // Cột F
                    var sku = row.Cell(7).GetString().Trim(); // Cột G
                    var unitPrice = GetDecimal(row.Cell(8)); // Cột H
                    var serviceName = row.Cell(9).GetString().Trim(); // Cột I
                    var unit = row.Cell(10).GetString().Trim(); // Cột J

                    var orderCode = row.Cell(11).GetString().Trim();

                    var statusName = row.Cell(12).GetString().Trim();
                    var branchName = row.Cell(13).GetString().Trim();
                    var source = row.Cell(14).GetString().Trim();
                    var channel = row.Cell(15).GetString().Trim();

                    var quantity = row.Cell(18).GetString().Trim();

                    var revenue = GetDecimal(row.Cell(24));
                    var grossProfit = GetDecimal(row.Cell(25));
                    var shippingFee = GetDecimal(row.Cell(23));
                    var taxAmount = GetDecimal(row.Cell(22));

                    // validate dữ liệu

                    if (string.IsNullOrWhiteSpace(customerCode))
                        throw new BadRequestException("Mã khách hàng không được để trống");

                    if (string.IsNullOrWhiteSpace(orderCode))
                        throw new BadRequestException("Mã đơn hàng không được để trống");

                    // =========================
                    // CUSTOMER
                    Customer customer;
                    int customerId;
                    if (customerCache.TryGetValue(customerCode, out customer))
                    {
                        customerId = customer.Id; // đã có Id thật từ DB
                    }
                    else if (pendingCustomers.TryGetValue(customerCode, out customer))
                    {
                        customerId = 0; // chưa có Id, dùng navigation property
                    }
                    else
                    {
                        customer = new Customer
                        {
                            Name = customerName,
                            Phone = customerPhone,
                            CustomerCode = customerCode,
                            CreatedAt = DateTime.Now,
                            CreatedBy = userId,
                        };

                        await _customerRepository.AddAsync(customer);
                        pendingCustomers[customerCode] = customer;
                        customerId = 0;
                    }

                    // =========================
                    // STATUS
                    // =========================

                    if (!statuses.TryGetValue(statusName, out var status))
                    {
                        throw new BadRequestException($"Trạng thái '{statusName}' không tồn tại");
                    }

                    // =========================
                    // BRANCH
                    // =========================

                    if (!branches.TryGetValue(branchName, out var branch))
                    {
                        throw new BadRequestException($"Chi nhánh '{branchName}' không tồn tại");
                    }

                    // =========================
                    // ORDER
                    // =========================
                    Order orderEntity;

                    if (orderCache.TryGetValue(orderCode, out var existingOrder))
                    {
                        existingOrder.Revenue += revenue;
                        existingOrder.GrossProfit += grossProfit;
                        existingOrder.ShippingFee += shippingFee;
                        existingOrder.TaxAmount += taxAmount;

                        if (!pendingOrders.ContainsKey(orderCode))
                        {
                            _context.Attach(existingOrder);
                            _context.Entry(existingOrder).State = EntityState.Modified;
                            pendingOrders[orderCode] = existingOrder;
                        }

                        orderEntity = existingOrder;
                    }
                    else if (pendingOrders.TryGetValue(orderCode, out orderEntity))
                    {
                        // Order mới tạo trong batch này → chỉ cộng dồn, không Attach lại
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
                            Channel = channel,

                            StatusId = status.Id,
                            BranchesId = branch.Id,

                            CreatedAt = DateTime.Now,
                            CreatedBy = userId,
                        };

                        await _orderRepository.AddAsync(orderEntity);

                        pendingOrders[orderCode] = orderEntity;
                    }
                    var orderItem = new OrderItem
                    {
                        OrderId = orderEntity.Id > 0 ? orderEntity.Id : 0,
                        Order = orderEntity.Id > 0 ? null : orderEntity,
                        Category = category,
                        ProductName = productName,
                        Sku = sku,
                        UnitPrice = unitPrice,
                        Quantity = short.Parse(quantity),
                        ServiceName = serviceName,
                        Unit = unit,
                        CreatedAt = DateTime.Now,
                    };
                    await _orderItemRepository.AddAsync(orderItem);

                    successCount++;

                    if (processedRows % 500 == 0)
                    {
                        await _unitOfWork.SaveChangesAsync();

                        _context.ChangeTracker.Clear();
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

                    if (processedRows % 10 == 0)
                    {
                        // await _hubContext
                        //     .Clients.User(userId.ToString())
                        //     .SendAsync(
                        //         "ImportProgress",
                        //         new { Current = processedRows, Total = totalRows }
                        //     );
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
            // save remaining
            await _unitOfWork.SaveChangesAsync();

            // import history
            await _importsHistoryRepository.AddAsync(
                new ImportsHistory
                {
                    FileName = file.FileName,
                    UserId = userId,
                    SuccessCount = successCount,
                    ErrorCount = errorCount,
                    ErrorDetails = JsonSerializer.Serialize(errors),
                    ImportDate = DateTime.Now,
                }
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
        query = query.Where(o => o.DeletedAt == null);
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
