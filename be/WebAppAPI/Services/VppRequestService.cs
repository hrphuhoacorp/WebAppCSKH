using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models.Vpp;

public interface IVppRequestService
{
    Task<PagedResult<VppRequestDto>> GetAllAsync(VppRequestFilter filter);
    Task<VppRequestDetailDto?> GetByIdAsync(int id);
    Task<VppRequestDto> CreateAsync(VppRequestCreateDto dto, int requesterId);
    Task<VppRequestDto> ApproveAsync(int id, string createdBy, string? adminNote = null, List<VppApproveLineDto>? lineOverrides = null);
    Task RejectAsync(int id, string adminNote);
}

public class VppRequestService : IVppRequestService
{
    private readonly IVppRequestRepository _repo;
    private readonly IVppRequestLineRepository _lineRepo;
    private readonly IVppItemRepository _itemRepo;
    private readonly IVppDispatchRepository _dispatchRepo;
    private readonly IVppDispatchLineRepository _dispatchLineRepo;
    private readonly IUserRepository _userRepo;
    private readonly IVppInventoryService _inventoryService;
    private readonly IUnitOfWork _uow;

    public VppRequestService(
        IVppRequestRepository repo,
        IVppRequestLineRepository lineRepo,
        IVppItemRepository itemRepo,
        IVppDispatchRepository dispatchRepo,
        IVppDispatchLineRepository dispatchLineRepo,
        IUserRepository userRepo,
        IVppInventoryService inventoryService,
        IUnitOfWork uow)
    {
        _repo = repo;
        _lineRepo = lineRepo;
        _itemRepo = itemRepo;
        _dispatchRepo = dispatchRepo;
        _dispatchLineRepo = dispatchLineRepo;
        _userRepo = userRepo;
        _inventoryService = inventoryService;
        _uow = uow;
    }

    public async Task<PagedResult<VppRequestDto>> GetAllAsync(VppRequestFilter filter)
    {
        var query = _repo.GetAll().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(filter.Status))
            query = query.Where(x => x.Status == filter.Status);
        if (filter.RequesterId.HasValue)
            query = query.Where(x => x.RequesterId == filter.RequesterId.Value);

        var total = await query.CountAsync();
        var page = filter.Page < 1 ? 1 : filter.Page;
        var size = filter.PageSize < 1 ? 20 : filter.PageSize;

        var requesterIds = await query.Select(x => x.RequesterId).Distinct().ToListAsync();
        var users = await _userRepo.GetAll().AsNoTracking()
            .Where(u => requesterIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Name, BranchName = u.Branches != null ? u.Branches.Name : "" })
            .ToListAsync();

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .ToListAsync();

        var dtos = items.Select(r =>
        {
            var user = users.FirstOrDefault(u => u.Id == r.RequesterId);
            return ToDto(r, user?.Name ?? "", user?.BranchName ?? "");
        });

        return new PagedResult<VppRequestDto>
        {
            Items = dtos.ToList(),
            TotalItems = total,
            Page = page,
            PageSize = size,
        };
    }

    public async Task<VppRequestDetailDto?> GetByIdAsync(int id)
    {
        var r = await _repo.GetAll().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;

        var lines = await _lineRepo.GetAll().AsNoTracking()
            .Where(x => x.RequestId == id).ToListAsync();
        var itemIds = lines.Select(l => l.ItemId).ToList();
        var items = await _itemRepo.GetAll().AsNoTracking()
            .Where(x => itemIds.Contains(x.Id)).ToListAsync();

        var user = await _userRepo.GetAll().AsNoTracking()
            .Where(u => u.Id == r.RequesterId)
            .Select(u => new { u.Name, BranchName = u.Branches != null ? u.Branches.Name : "" })
            .FirstOrDefaultAsync();

        return new VppRequestDetailDto
        {
            Id = r.Id,
            RequesterName = user?.Name ?? "",
            Branch = user?.BranchName ?? "",
            Department = r.Department,
            Reason = r.Reason ?? "",
            ReferencePrice = r.ReferencePrice ?? "",
            Status = r.Status,
            AdminNote = r.AdminNote ?? "",
            DispatchId = r.DispatchId,
            CreatedAt = r.CreatedAt?.AddHours(7).ToString("yyyy-MM-dd"),
            Lines = lines.Select(l =>
            {
                var item = items.FirstOrDefault(i => i.Id == l.ItemId);
                return new VppRequestLineDto
                {
                    Id = l.Id,
                    ItemId = l.ItemId,
                    ItemCode = item?.Code ?? "",
                    ItemName = item?.Name ?? "",
                    Unit = item?.Unit ?? "",
                    UnitPrice = item?.UnitPrice ?? 0,
                    Quantity = l.Quantity,
                    Note = l.Note ?? "",
                };
            }).ToList(),
        };
    }

    public async Task<VppRequestDto> CreateAsync(VppRequestCreateDto dto, int requesterId)
    {
        var entity = new VppRequest
        {
            RequesterId = requesterId,
            Department = dto.Department,
            Reason = dto.Reason,
            ReferencePrice = dto.ReferencePrice,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
        };
        await _repo.AddAsync(entity);
        await _uow.SaveChangesAsync();

        var items = await _itemRepo.GetAll().AsNoTracking()
            .Where(x => dto.Lines.Select(l => l.ItemId).Contains(x.Id))
            .ToListAsync();

        foreach (var line in dto.Lines)
        {
            var item = items.FirstOrDefault(i => i.Id == line.ItemId)
                ?? throw new BadRequestException($"Không tìm thấy vật tư ID {line.ItemId}");
            await _lineRepo.AddAsync(new VppRequestLine
            {
                RequestId = entity.Id,
                ItemId = line.ItemId,
                Quantity = line.Quantity,
                Note = line.Note,
            });
        }
        await _uow.SaveChangesAsync();

        var user = await _userRepo.GetAll().AsNoTracking()
            .Where(u => u.Id == requesterId)
            .Select(u => new { u.Name, BranchName = u.Branches != null ? u.Branches.Name : "" })
            .FirstOrDefaultAsync();
        return ToDto(entity, user?.Name ?? "", user?.BranchName ?? "");
    }

    public async Task<VppRequestDto> ApproveAsync(int id, string createdBy, string? adminNote = null, List<VppApproveLineDto>? lineOverrides = null)
    {
        var request = await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy đề nghị");
        if (request.Status != "pending")
            throw new BadRequestException("Đề nghị không ở trạng thái chờ duyệt");

        var lines = await _lineRepo.GetAll().AsNoTracking()
            .Where(x => x.RequestId == id).ToListAsync();
        var itemIds = lines.Select(l => l.ItemId).ToList();
        var items = await _itemRepo.GetAll().AsNoTracking()
            .Where(x => itemIds.Contains(x.Id)).ToListAsync();

        // Tính số lượng thực tế sẽ xuất (dùng lineOverrides nếu admin điều chỉnh)
        var linesToDispatch = new List<(VppRequestLine Line, decimal Quantity)>();
        foreach (var line in lines)
        {
            decimal qty;
            if (lineOverrides != null)
            {
                var ov = lineOverrides.FirstOrDefault(o => o.LineId == line.Id);
                qty = ov?.Quantity ?? 0;
            }
            else
            {
                qty = line.Quantity;
            }
            if (qty > 0)
                linesToDispatch.Add((line, qty));
        }

        if (linesToDispatch.Count == 0)
            throw new BadRequestException("Không có dòng nào hợp lệ để xuất kho");

        // Kiểm tra tồn kho theo số lượng thực tế sẽ xuất
        var now = DateTime.UtcNow.AddHours(7);
        var inventory = await _inventoryService.GetByPeriodAsync(now.Month, now.Year);
        var insufficient = new List<string>();
        foreach (var (line, qty) in linesToDispatch)
        {
            var inv = inventory.Rows.FirstOrDefault(r => r.ItemId == line.ItemId);
            var available = inv?.ClosingQty ?? 0m;
            if (qty > available)
            {
                var item = items.FirstOrDefault(i => i.Id == line.ItemId);
                insufficient.Add($"{item?.Name ?? $"ID {line.ItemId}"}: xuất {qty}, tồn {available}");
            }
        }
        if (insufficient.Count > 0)
            throw new BadRequestException($"Không đủ tồn kho — {string.Join("; ", insufficient)}");

        var user = await _userRepo.GetAll().AsNoTracking()
            .Where(u => u.Id == request.RequesterId)
            .Select(u => new { u.Name, BranchName = u.Branches != null ? u.Branches.Name : "" })
            .FirstOrDefaultAsync();

        var code = await GenerateDispatchCodeAsync();
        var dispatch = new VppDispatch
        {
            Code = code,
            DispatchDate = now,
            Department = request.Department,
            Branch = user?.BranchName ?? "",
            RequestId = id,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
        };
        await _dispatchRepo.AddAsync(dispatch);
        await _uow.SaveChangesAsync();

        foreach (var (line, qty) in linesToDispatch)
        {
            var item = items.First(i => i.Id == line.ItemId);
            var vatAmount = item.UnitPrice * item.VatRate * qty;
            await _dispatchLineRepo.AddAsync(new VppDispatchLine
            {
                DispatchId = dispatch.Id,
                ItemId = line.ItemId,
                Quantity = qty,
                UnitPrice = item.UnitPrice,
                VatAmount = vatAmount,
                TotalAmount = item.UnitPrice * qty + vatAmount,
            });
        }

        request.Status = "dispatched";
        request.DispatchId = dispatch.Id;
        request.AdminNote = adminNote;
        request.UpdatedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();

        return ToDto(request, user?.Name ?? "", user?.BranchName ?? "");
    }

    public async Task RejectAsync(int id, string adminNote)
    {
        var request = await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException("Không tìm thấy đề nghị");
        if (request.Status != "pending")
            throw new BadRequestException("Đề nghị không ở trạng thái chờ duyệt");
        request.Status = "rejected";
        request.AdminNote = adminNote;
        request.UpdatedAt = DateTime.UtcNow.AddHours(7);
        await _uow.SaveChangesAsync();
    }

    private async Task<string> GenerateDispatchCodeAsync()
    {
        var now = DateTime.UtcNow.AddHours(7);
        var prefix = $"BK{now.Month:D2}{now.Year}";
        var count = await _dispatchRepo.GetAll().AsNoTracking()
            .CountAsync(x => x.Code.StartsWith(prefix));
        return $"{prefix}.{count + 1:D2}";
    }

    private static VppRequestDto ToDto(VppRequest r, string requesterName, string branch) => new()
    {
        Id = r.Id,
        RequesterName = requesterName,
        Branch = branch,
        Department = r.Department,
        Reason = r.Reason ?? "",
        Status = r.Status,
        DispatchId = r.DispatchId,
        CreatedAt = r.CreatedAt?.AddHours(7).ToString("yyyy-MM-dd"),
    };
}

public class VppRequestDto
{
    public int Id { get; set; }
    public string RequesterName { get; set; } = "";
    public string Branch { get; set; } = "";
    public string Department { get; set; } = "";
    public string Reason { get; set; } = "";
    public string Status { get; set; } = "";
    public int? DispatchId { get; set; }
    public string? CreatedAt { get; set; }
}

public class VppRequestDetailDto : VppRequestDto
{
    public string ReferencePrice { get; set; } = "";
    public string AdminNote { get; set; } = "";
    public List<VppRequestLineDto> Lines { get; set; } = new();
}

public class VppRequestLineDto
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public string ItemCode { get; set; } = "";
    public string ItemName { get; set; } = "";
    public string Unit { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public decimal Quantity { get; set; }
    public string Note { get; set; } = "";
}

public class VppRequestCreateDto
{
    public string Department { get; set; } = null!;
    public string? Reason { get; set; }
    public string? ReferencePrice { get; set; }
    public List<VppRequestLineCreateDto> Lines { get; set; } = new();
}

public class VppRequestLineCreateDto
{
    public int ItemId { get; set; }
    public decimal Quantity { get; set; }
    public string? Note { get; set; }
}

public class VppRequestFilter
{
    public string? Status { get; set; }
    public int? RequesterId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class VppApproveLineDto
{
    public int LineId { get; set; }
    public decimal Quantity { get; set; }
}
