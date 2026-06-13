using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using WebAppInfractor.Models;

public interface ICustomerService
{
    Task<PagedResult<CustomerDTO>> GetCustomerAllAsync(CustomerFilterDTO filter);
    Task<CustomerDTO> GetCustomerByIdAsync(int id);
    Task<string> UpdateCustomerAsync(int authorId, int id, UpdateCustomerDTO updateDTO);
    Task<string> DeleteCustomerAsync(int authorId, int id, DateTime updatedAt);
    Task<ReturnRateStatsDTO> GetReturnRateStatsAsync(int months);
}

public class CustomerService : ICustomerService
{
    private readonly ICustomerRepository _customerRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IOrderRepository _orderRepository;
    private readonly IOrderItemRepository _orderItemRepository;
    private readonly IUserRepository _userRepository;
    private readonly IActivityService _auditLogService;

    public CustomerService(
        ICustomerRepository customerRepository,
        IUnitOfWork unitOfWork,
        IOrderRepository orderRepository,
        IOrderItemRepository orderItemRepository,
        IUserRepository userRepository,
        IActivityService auditLogService
    )
    {
        _customerRepository = customerRepository;
        _unitOfWork = unitOfWork;
        _orderRepository = orderRepository;
        _orderItemRepository = orderItemRepository;
        _userRepository = userRepository;
        _auditLogService = auditLogService;
    }

    public async Task<PagedResult<CustomerDTO>> GetCustomerAllAsync(CustomerFilterDTO filter)
    {
        var query = _customerRepository.GetAll().Include(c => c.Orders).AsNoTracking();

        if (!string.IsNullOrEmpty(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(search)
                || c.Phone.ToLower().Contains(search)
                || c.CustomerCode.ToLower().Contains(search)
            );
        }

        query = query.Where(c => c.DeletedAt == null);

        var totalItems = await query.CountAsync();

        var customers = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(c => new CustomerDTO
            {
                Id = c.Id,
                CustomerCode = c.CustomerCode,
                Name = c.Name,
                Phone = c.Phone,
                TotalOrders = c.TotalOrders,
                TotalRevenue = c.TotalRevenue,
                LastOrderAt = c.LastOrderAt,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                DeletedAt = c.DeletedAt,
                CreatedBy = c.CreatedBy,
                CreatedName = c.CreatedByNavigation.Name,
                DayOfBirth = c.DayOfBirth,
                Orders = c
                    .Orders.Select(o => new OrderDTO
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
                    })
                    .ToList(),
            })
            .ToListAsync();

        return new PagedResult<CustomerDTO>
        {
            Items = customers,
            TotalItems = totalItems,
            Page = filter.Page,
            PageSize = filter.PageSize,
        };
    }

    public async Task<CustomerDTO> GetCustomerByIdAsync(int id)
    {
        var customer = await _customerRepository
            .GetAll()
            .Include(c => c.Orders)
            .ThenInclude(o => o.OrderItems)
            .Include(c => c.Orders)
            .ThenInclude(o => o.Status)
            .Include(c => c.Orders)
            .ThenInclude(o => o.Branches)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null);

        if (customer == null)
        {
            throw new NotFoundException("Không tìm thấy khách hàng");
        }

        return new CustomerDTO
        {
            Id = customer.Id,
            CustomerCode = customer.CustomerCode,
            Name = customer.Name,
            Phone = customer.Phone,
            TotalOrders = customer.TotalOrders,
            TotalRevenue = customer.TotalRevenue,
            LastOrderAt = customer.LastOrderAt,
            CreatedAt = customer.CreatedAt,
            UpdatedAt = customer.UpdatedAt,
            DeletedAt = customer.DeletedAt,
            CreatedBy = customer.CreatedBy,
            DayOfBirth = customer.DayOfBirth,
            Orders = customer
                .Orders.Select(o => new OrderDTO
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
                            ServiceName = oi.ServiceName,
                            Unit = oi.Unit,
                        })
                        .ToList(),
                })
                .ToList(),
        };
    }

    public async Task<string> UpdateCustomerAsync(int authorId, int id, UpdateCustomerDTO updateDTO)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var author = await _userRepository
                .GetAll()
                .FirstOrDefaultAsync(u => u.Id == authorId && u.DeletedAt == null);

            if (author == null)
            {
                throw new NotFoundException("Người dùng không tồn tại");
            }

            var customer = await _customerRepository
                .GetAll()
                .FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null);

            if (customer == null)
            {
                throw new NotFoundException("Không tìm thấy khách hàng");
            }
            Console.WriteLine(updateDTO.UpdatedAt);
            Console.WriteLine(customer.UpdatedAt);
            if (updateDTO.UpdatedAt != customer.UpdatedAt)
            {
                throw new ConflictException(
                    "Dữ liệu đã bị thay đổi, vui lòng tải lại trang và thử lại"
                );
            }
            var phoneExists = await _customerRepository
                .GetAll()
                .AnyAsync(c => c.Phone == updateDTO.Phone && c.Id != id && c.DeletedAt == null);

            if (phoneExists)
            {
                throw new ConflictException("Số điện thoại đã tồn tại");
            }

            if (
                updateDTO.DayOfBirth.HasValue
                && updateDTO.DayOfBirth.Value > DateOnly.FromDateTime(DateTime.UtcNow)
            )
            {
                throw new BadRequestException("Ngày sinh không hợp lệ");
            }

            if (
                updateDTO.DayOfBirth.HasValue
                && updateDTO.DayOfBirth.Value > DateOnly.FromDateTime(DateTime.Today.AddYears(-18))
            )
            {
                throw new BadRequestException("Người dùng phải đủ 18 tuổi");
            }

            customer.Name = updateDTO.Name;
            customer.Phone = updateDTO.Phone;
            customer.DayOfBirth = updateDTO.DayOfBirth;

            await _customerRepository.Update(customer);

            await _auditLogService.SaveLogAsync(
                userId: author.Id,
                staffCode: author.StaffCode,
                action: "Update_Customer",
                tableName: "customer",
                recordId: customer.Id,
                oldData: null,
                newData: null
            );

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();
            return "Cập nhật thông tin khách hàng thành công";
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

    public async Task<string> DeleteCustomerAsync(int authorId, int id, DateTime updatedAt)
    {
        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var author = await _userRepository.GetAll().FirstOrDefaultAsync(u => u.Id == authorId);

            var customer = await _customerRepository
                .GetAll()
                .FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null);

            if (customer == null)
            {
                throw new NotFoundException("Không tìm thấy khách hàng");
            }

            if (updatedAt != customer.UpdatedAt)
            {
                throw new ConflictException(
                    "Dữ liệu đã bị thay đổi, vui lòng tải lại trang và thử lại"
                );
            }
            customer.DeletedAt = DateTime.UtcNow.AddHours(7);
            await _customerRepository.Update(customer);

            await _auditLogService.SaveLogAsync(
                userId: author.Id,
                staffCode: author.StaffCode,
                action: "Delete_Customer",
                tableName: "customer",
                recordId: customer.Id,
                oldData: null,
                newData: null
            );

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();
            return "Xóa khách hàng thành công";
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

    public async Task<ReturnRateStatsDTO> GetReturnRateStatsAsync(int months)
    {
        if (months < 1) months = 12;
        var now = DateTime.UtcNow.AddHours(7);

        // ── Lấy toàn bộ đơn hàng trong khoảng thời gian ──
        var cutoff = now.AddMonths(-months);
        var allOrders = await _orderRepository
            .GetAll()
            .Where(o => o.DeletedAt == null && o.Customer.DeletedAt == null)
            .Select(o => new { o.CustomerId, o.PurchaseDate })
            .ToListAsync();

        // ── Tỉ lệ quay lại theo tháng ──
        // Với mỗi tháng trong khoảng months, đếm KH mua lần đầu vs đã mua trước
        var monthlyStats = new List<MonthlyReturnRateDTO>();
        var sortedMonths = Enumerable.Range(0, months)
            .Select(i => now.AddMonths(-months + 1 + i))
            .ToList();

        // Tập hợp các customerId đã mua trước kỳ đầu tiên
        var earliestMonth = sortedMonths.First();
        var priorBuyers = allOrders
            .Where(o => o.PurchaseDate < new DateTime(earliestMonth.Year, earliestMonth.Month, 1) && o.CustomerId.HasValue)
            .Select(o => o.CustomerId!.Value)
            .Distinct()
            .ToHashSet();

        var seenBuyers = new HashSet<int>(priorBuyers);

        foreach (var m in sortedMonths)
        {
            var monthStart = new DateTime(m.Year, m.Month, 1);
            var monthEnd = monthStart.AddMonths(1);
            var buyers = allOrders
                .Where(o => o.PurchaseDate >= monthStart && o.PurchaseDate < monthEnd && o.CustomerId.HasValue)
                .Select(o => o.CustomerId!.Value)
                .Distinct()
                .ToList();

            var returningCount = buyers.Count(id => seenBuyers.Contains(id));
            var newCount = buyers.Count - returningCount;

            monthlyStats.Add(new MonthlyReturnRateDTO
            {
                Year = m.Year,
                Month = m.Month,
                NewCustomers = newCount,
                ReturningCustomers = returningCount,
                TotalBuyers = buyers.Count,
                ReturnRate = buyers.Count > 0 ? Math.Round((double)returningCount / buyers.Count * 100, 1) : 0,
            });

            foreach (var id in buyers) seenBuyers.Add(id);
        }

        // ── Phân bố tần suất mua hàng ──
        var allCustomerOrders = await _customerRepository
            .GetAll()
            .Where(c => c.DeletedAt == null)
            .Select(c => new { c.Id, c.TotalOrders })
            .ToListAsync();

        var freq = new FrequencyDistributionDTO
        {
            Once = allCustomerOrders.Count(c => c.TotalOrders == 1),
            TwoToThree = allCustomerOrders.Count(c => c.TotalOrders >= 2 && c.TotalOrders <= 3),
            FourToTen = allCustomerOrders.Count(c => c.TotalOrders >= 4 && c.TotalOrders <= 10),
            MoreThanTen = allCustomerOrders.Count(c => c.TotalOrders > 10),
        };

        // ── Phân khúc dormant ──
        var allCustomers = await _customerRepository
            .GetAll()
            .Where(c => c.DeletedAt == null)
            .Select(c => new { c.Id, c.LastOrderAt })
            .ToListAsync();

        var dormancy = new DormancySegmentDTO
        {
            Active30 = allCustomers.Count(c => c.LastOrderAt.HasValue && (now - c.LastOrderAt.Value).TotalDays <= 30),
            Dormant30To60 = allCustomers.Count(c => c.LastOrderAt.HasValue && (now - c.LastOrderAt.Value).TotalDays > 30 && (now - c.LastOrderAt.Value).TotalDays <= 60),
            Dormant60To90 = allCustomers.Count(c => c.LastOrderAt.HasValue && (now - c.LastOrderAt.Value).TotalDays > 60 && (now - c.LastOrderAt.Value).TotalDays <= 90),
            Dormant90Plus = allCustomers.Count(c => c.LastOrderAt.HasValue && (now - c.LastOrderAt.Value).TotalDays > 90),
            NeverBought = allCustomers.Count(c => !c.LastOrderAt.HasValue),
        };

        // ── Top 10 khách hàng trung thành ──
        var topCustomers = await _customerRepository
            .GetAll()
            .Where(c => c.DeletedAt == null && c.TotalOrders > 1)
            .OrderByDescending(c => c.TotalOrders)
            .ThenByDescending(c => c.TotalRevenue)
            .Take(10)
            .Select(c => new LoyalCustomerDTO
            {
                Id = c.Id,
                Name = c.Name,
                CustomerCode = c.CustomerCode,
                OrderCount = c.TotalOrders,
                TotalRevenue = c.TotalRevenue,
                LastOrderAt = c.LastOrderAt,
                DaysSinceLastOrder = c.LastOrderAt.HasValue
                    ? (int)(now - c.LastOrderAt.Value).TotalDays
                    : -1,
            })
            .ToListAsync();

        return new ReturnRateStatsDTO
        {
            MonthlyReturnRate = monthlyStats,
            FrequencyDistribution = freq,
            DormancySegments = dormancy,
            TopLoyalCustomers = topCustomers,
        };
    }
}
