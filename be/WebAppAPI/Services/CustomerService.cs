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
    Task<PagedResult<SegmentCustomerDTO>> GetCustomersBySegmentAsync(string segment, int page, int pageSize);
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

        // ── Lấy toàn bộ đơn hàng (kể cả ngoài khoảng months để tính trước kỳ) ──
        var allOrders = await _orderRepository
            .GetAll()
            .Where(o => o.DeletedAt == null && o.Customer.DeletedAt == null)
            .Select(o => new { o.CustomerId, o.PurchaseDate, o.Revenue })
            .ToListAsync();

        // ── Danh sách tháng cần thống kê ──
        var sortedMonths = Enumerable.Range(0, months)
            .Select(i => now.AddMonths(-months + 1 + i))
            .ToList();

        var earliestMonth = sortedMonths.First();
        var priorBuyers = allOrders
            .Where(o => o.PurchaseDate < new DateTime(earliestMonth.Year, earliestMonth.Month, 1) && o.CustomerId.HasValue)
            .Select(o => o.CustomerId!.Value)
            .Distinct()
            .ToHashSet();

        var seenBuyers = new HashSet<int>(priorBuyers);
        var monthlyStats = new List<MonthlyReturnRateDTO>();
        var monthlyRevenue = new List<MonthlyRevenueBreakdownDTO>();

        foreach (var m in sortedMonths)
        {
            var monthStart = new DateTime(m.Year, m.Month, 1);
            var monthEnd = monthStart.AddMonths(1);
            var monthOrders = allOrders
                .Where(o => o.PurchaseDate >= monthStart && o.PurchaseDate < monthEnd && o.CustomerId.HasValue)
                .ToList();

            var buyers = monthOrders.Select(o => o.CustomerId!.Value).Distinct().ToList();
            var returningCount = buyers.Count(id => seenBuyers.Contains(id));

            monthlyStats.Add(new MonthlyReturnRateDTO
            {
                Year = m.Year, Month = m.Month,
                NewCustomers = buyers.Count - returningCount,
                ReturningCustomers = returningCount,
                TotalBuyers = buyers.Count,
                ReturnRate = buyers.Count > 0 ? Math.Round((double)returningCount / buyers.Count * 100, 1) : 0,
            });

            var returningRevenue = monthOrders
                .Where(o => seenBuyers.Contains(o.CustomerId!.Value))
                .Sum(o => o.Revenue);
            var newRevenue = monthOrders
                .Where(o => !seenBuyers.Contains(o.CustomerId!.Value))
                .Sum(o => o.Revenue);

            monthlyRevenue.Add(new MonthlyRevenueBreakdownDTO
            {
                Year = m.Year, Month = m.Month,
                ReturningRevenue = returningRevenue,
                NewRevenue = newRevenue,
            });

            foreach (var id in buyers) seenBuyers.Add(id);
        }

        // ── Phân bố tần suất mua hàng ──
        var allCustomerData = await _customerRepository
            .GetAll()
            .Where(c => c.DeletedAt == null)
            .Select(c => new { c.Id, c.TotalOrders, c.TotalRevenue, c.LastOrderAt })
            .ToListAsync();

        var freq = new FrequencyDistributionDTO
        {
            Once = allCustomerData.Count(c => c.TotalOrders == 1),
            TwoToThree = allCustomerData.Count(c => c.TotalOrders >= 2 && c.TotalOrders <= 3),
            FourToTen = allCustomerData.Count(c => c.TotalOrders >= 4 && c.TotalOrders <= 10),
            MoreThanTen = allCustomerData.Count(c => c.TotalOrders > 10),
        };

        var dormancy = new DormancySegmentDTO
        {
            Active30 = allCustomerData.Count(c => c.LastOrderAt.HasValue && (now - c.LastOrderAt.Value).TotalDays <= 30),
            Dormant30To60 = allCustomerData.Count(c => c.LastOrderAt.HasValue && (now - c.LastOrderAt.Value).TotalDays is > 30 and <= 60),
            Dormant60To90 = allCustomerData.Count(c => c.LastOrderAt.HasValue && (now - c.LastOrderAt.Value).TotalDays is > 60 and <= 90),
            Dormant90Plus = allCustomerData.Count(c => c.LastOrderAt.HasValue && (now - c.LastOrderAt.Value).TotalDays > 90),
            NeverBought = allCustomerData.Count(c => !c.LastOrderAt.HasValue),
        };

        // Khách hàng có nguy cơ rời bỏ: mua ≥2 lần, chưa mua 60-180 ngày
        var atRisk = allCustomerData.Count(c =>
            c.TotalOrders >= 2 && c.LastOrderAt.HasValue
            && (now - c.LastOrderAt.Value).TotalDays is > 60 and <= 180);

        // ── Trung bình số ngày giữa các đơn hàng (repeat buyers) ──
        var ordersByCustomer = allOrders
            .Where(o => o.CustomerId.HasValue)
            .GroupBy(o => o.CustomerId!.Value)
            .Where(g => g.Count() >= 2)
            .ToList();

        var avgDaysList = ordersByCustomer.Select(g =>
        {
            var dates = g.OrderBy(o => o.PurchaseDate).Select(o => o.PurchaseDate).ToList();
            var gaps = dates.Zip(dates.Skip(1), (a, b) => (b - a).TotalDays);
            return gaps.Average();
        }).ToList();

        var avgDaysBetween = avgDaysList.Count > 0 ? Math.Round(avgDaysList.Average(), 1) : 0;

        // ── Trung bình ngày đến đơn thứ 2 ──
        var timeToSecondList = ordersByCustomer.Select(g =>
        {
            var dates = g.OrderBy(o => o.PurchaseDate).Select(o => o.PurchaseDate).ToList();
            return (dates[1] - dates[0]).TotalDays;
        }).ToList();

        var avgTimeToSecond = timeToSecondList.Count > 0 ? Math.Round(timeToSecondList.Average(), 1) : 0;

        // ── Top 20 khách hàng trung thành ──
        var topCustomerRaw = await _customerRepository
            .GetAll()
            .Where(c => c.DeletedAt == null && c.TotalOrders > 1)
            .OrderByDescending(c => c.TotalOrders)
            .ThenByDescending(c => c.TotalRevenue)
            .Take(20)
            .Select(c => new
            {
                c.Id, c.Name, c.CustomerCode, c.Phone,
                c.TotalOrders, c.TotalRevenue, c.LastOrderAt,
            })
            .ToListAsync();

        // Tính AvgDaysBetweenOrders và FirstOrderAt cho từng top customer
        var topCustomerIds = topCustomerRaw.Select(c => c.Id).ToHashSet();
        var topOrdersMap = allOrders
            .Where(o => o.CustomerId.HasValue && topCustomerIds.Contains(o.CustomerId!.Value))
            .GroupBy(o => o.CustomerId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderBy(o => o.PurchaseDate).Select(o => o.PurchaseDate).ToList());

        var topCustomers = topCustomerRaw.Select(c =>
        {
            var orderDates = topOrdersMap.GetValueOrDefault(c.Id) ?? new List<DateTime>();
            double avgGap = 0;
            if (orderDates.Count >= 2)
            {
                var gaps = orderDates.Zip(orderDates.Skip(1), (a, b) => (b - a).TotalDays);
                avgGap = Math.Round(gaps.Average(), 1);
            }
            return new LoyalCustomerDTO
            {
                Id = c.Id,
                Name = c.Name,
                CustomerCode = c.CustomerCode,
                Phone = c.Phone,
                OrderCount = c.TotalOrders,
                TotalRevenue = c.TotalRevenue,
                AvgOrderValue = c.TotalOrders > 0 ? Math.Round(c.TotalRevenue / c.TotalOrders, 0) : 0,
                AvgDaysBetweenOrders = avgGap,
                LastOrderAt = c.LastOrderAt,
                FirstOrderAt = orderDates.Count > 0 ? orderDates.First() : null,
                DaysSinceLastOrder = c.LastOrderAt.HasValue ? (int)(now - c.LastOrderAt.Value).TotalDays : -1,
            };
        }).ToList();

        // ── Thống kê sản phẩm trong khoảng months ──
        var periodStart = now.AddMonths(-months);
        var orderItems = await _orderItemRepository
            .GetAll()
            .Where(oi => oi.Order.DeletedAt == null && oi.Order.PurchaseDate >= periodStart)
            .Select(oi => new { oi.Category, oi.Revenue })
            .ToListAsync();

        var totalOrdersInPeriod = allOrders.Count(o => o.PurchaseDate >= periodStart);
        var catGroups = orderItems
            .Where(oi => !string.IsNullOrEmpty(oi.Category))
            .GroupBy(oi => oi.Category!)
            .Select(g => new CategoryStatDTO
            {
                Category = g.Key,
                ItemCount = g.Count(),
                Revenue = g.Sum(x => x.Revenue),
            })
            .OrderByDescending(g => g.ItemCount)
            .ToList();

        var productStats = new ProductStatsDTO
        {
            TotalItemsSold = orderItems.Count,
            TotalProductRevenue = orderItems.Sum(oi => oi.Revenue),
            AvgItemsPerOrder = totalOrdersInPeriod > 0
                ? Math.Round((double)orderItems.Count / totalOrdersInPeriod, 2)
                : 0,
            UniqueCategories = catGroups.Count,
            TopCategory = catGroups.FirstOrDefault()?.Category,
            TopCategoryCount = catGroups.FirstOrDefault()?.ItemCount ?? 0,
            CategoryBreakdown = catGroups.Take(8).ToList(),
        };

        return new ReturnRateStatsDTO
        {
            MonthlyReturnRate = monthlyStats,
            MonthlyRevenueBreakdown = monthlyRevenue,
            FrequencyDistribution = freq,
            DormancySegments = dormancy,
            TopLoyalCustomers = topCustomers,
            ProductStats = productStats,
            AvgDaysBetweenOrders = avgDaysBetween,
            AvgTimeToSecondPurchase = avgTimeToSecond,
            AtRiskCustomers = atRisk,
        };
    }

    public async Task<PagedResult<SegmentCustomerDTO>> GetCustomersBySegmentAsync(string segment, int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;
        var now = DateTime.UtcNow.AddHours(7);

        var cutoff30 = now.AddDays(-30);
        var cutoff60 = now.AddDays(-60);
        var cutoff180 = now.AddDays(-180);

        var baseQuery = _customerRepository.GetAll().Where(c => c.DeletedAt == null).AsNoTracking();

        var filtered = segment switch
        {
            "active30" => baseQuery
                .Where(c => c.LastOrderAt != null && c.LastOrderAt >= cutoff30)
                .OrderByDescending(c => c.LastOrderAt),
            "atRisk" => baseQuery
                .Where(c => c.TotalOrders >= 2 && c.LastOrderAt != null && c.LastOrderAt <= cutoff60 && c.LastOrderAt >= cutoff180)
                .OrderBy(c => c.LastOrderAt),
            "repeat" => baseQuery
                .Where(c => c.TotalOrders >= 2)
                .OrderByDescending(c => c.TotalOrders).ThenByDescending(c => c.TotalRevenue),
            _ => baseQuery  // "loyal"
                .Where(c => c.TotalOrders > 1)
                .OrderByDescending(c => c.TotalOrders).ThenByDescending(c => c.TotalRevenue),
        };

        var total = await filtered.CountAsync();

        var items = await filtered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new SegmentCustomerDTO
            {
                Id = c.Id,
                Name = c.Name,
                CustomerCode = c.CustomerCode,
                Phone = c.Phone,
                TotalOrders = c.TotalOrders,
                TotalRevenue = c.TotalRevenue,
                AvgOrderValue = c.TotalOrders > 0 ? Math.Round(c.TotalRevenue / c.TotalOrders, 0) : 0,
                LastOrderAt = c.LastOrderAt,
                DaysSinceLastOrder = c.LastOrderAt.HasValue ? (int)(now - c.LastOrderAt.Value).TotalDays : -1,
            })
            .ToListAsync();

        return new PagedResult<SegmentCustomerDTO>
        {
            Items = items,
            TotalItems = total,
            Page = page,
            PageSize = pageSize,
        };
    }
}
