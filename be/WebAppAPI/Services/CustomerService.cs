using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using WebAppInfractor.Models;

public interface ICustomerService
{
    Task<PagedResult<CustomerDTO>> GetCustomerAllAsync(CustomerFilterDTO filter);
    Task<CustomerDTO> GetCustomerByIdAsync(int id);
    Task<string> UpdateCustomerAsync(int authorId, int id, UpdateCustomerDTO updateDTO);
    Task<string> DeleteCustomerAsync(int authorId, int id, DateTime updatedAt);
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
}
