using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Data;
using WebAppInfractor.Models;
using WebAppInfractor.Models.Marketing;
using WebAppInfractor.Models.Persona;

public interface IFbCampaignTagService
{
    Task<List<FbCampaignTagDTO>> GetTagsAsync(string? campaignId);
    Task<FbCampaignTagDTO> CreateTagAsync(int userId, CreateFbCampaignTagDTO dto);
    Task<FbCampaignTagDTO> UpdateTagAsync(int userId, int id, UpdateFbCampaignTagDTO dto);
    Task DeleteTagAsync(int userId, int id);
    Task<FbCampaignPerformanceDTO> GetPerformanceAsync(int id);
    Task<PagedResult<CustomerWithTagsDTO>> GetMatchedCustomersAsync(int id, int? personaTagId, int page, int pageSize);
    Task<PagedResult<CareOpportunityCustomerDTO>> GetCareOpportunitiesAsync(int id, int? personaTagId, int page, int pageSize, int? minDays = null, int? maxDays = null, string? sortByDays = null);
    Task<CampaignTagCountsDTO> GetTagCountsAsync(int id);
}

public class FbCampaignTagService : IFbCampaignTagService
{
    private readonly MemBerContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IActivityService _auditLogService;
    private readonly IPersonaTagService _personaTagService;
    private readonly IFacebookService _facebookService;

    public FbCampaignTagService(
        MemBerContext context,
        IUnitOfWork unitOfWork,
        IActivityService auditLogService,
        IPersonaTagService personaTagService,
        IFacebookService facebookService)
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _auditLogService = auditLogService;
        _personaTagService = personaTagService;
        _facebookService = facebookService;
    }

    public async Task<List<FbCampaignTagDTO>> GetTagsAsync(string? campaignId)
    {
        var query = _context.Set<FbCampaignTag>().AsNoTracking().Where(t => t.DeletedAt == null);
        if (!string.IsNullOrWhiteSpace(campaignId))
            query = query.Where(t => t.CampaignId == campaignId);

        var tags = await query.OrderByDescending(t => t.DateFrom).ToListAsync();

        var userIds = tags.Select(t => t.CreatedBy).Distinct().ToList();
        var userNames = await _context.Set<User>().AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Name);

        return tags.Select(t => ToDTO(t, userNames.GetValueOrDefault(t.CreatedBy))).ToList();
    }

    public async Task<FbCampaignTagDTO> CreateTagAsync(int userId, CreateFbCampaignTagDTO dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CampaignId))
            throw new BadRequestException("Thiếu mã chiến dịch");
        if (dto.Categories == null || dto.Categories.Count == 0)
            throw new BadRequestException("Chọn ít nhất 1 nhóm hàng");
        if (dto.DateTo < dto.DateFrom)
            throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");

        var tag = new FbCampaignTag
        {
            CampaignId = dto.CampaignId,
            CampaignName = dto.CampaignName,
            CategoriesJson = JsonSerializer.Serialize(dto.Categories),
            BranchIdsJson = dto.BranchIds is { Count: > 0 } ? JsonSerializer.Serialize(dto.BranchIds) : null,
            DateFrom = DateTime.SpecifyKind(dto.DateFrom.Date, DateTimeKind.Utc),
            DateTo = DateTime.SpecifyKind(dto.DateTo.Date, DateTimeKind.Utc),
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
            CreatedBy = userId,
        };
        _context.Set<FbCampaignTag>().Add(tag);
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "CREATE_FB_CAMPAIGN_TAG", "fb_campaign_tags", tag.Id, null,
            new { tag.CampaignId, tag.CampaignName, dto.Categories, tag.DateFrom, tag.DateTo });

        var user = await _context.Set<User>().AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        return ToDTO(tag, user?.Name);
    }

    public async Task<FbCampaignTagDTO> UpdateTagAsync(int userId, int id, UpdateFbCampaignTagDTO dto)
    {
        var tag = await _context.Set<FbCampaignTag>().FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null)
            ?? throw new NotFoundException("Không tìm thấy nhãn chiến dịch");

        if (dto.Categories == null || dto.Categories.Count == 0)
            throw new BadRequestException("Chọn ít nhất 1 nhóm hàng");
        if (dto.DateTo < dto.DateFrom)
            throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");

        var oldData = new { tag.CategoriesJson, tag.BranchIdsJson, tag.DateFrom, tag.DateTo, tag.Note };

        tag.CategoriesJson = JsonSerializer.Serialize(dto.Categories);
        tag.BranchIdsJson = dto.BranchIds is { Count: > 0 } ? JsonSerializer.Serialize(dto.BranchIds) : null;
        tag.DateFrom = DateTime.SpecifyKind(dto.DateFrom.Date, DateTimeKind.Utc);
        tag.DateTo = DateTime.SpecifyKind(dto.DateTo.Date, DateTimeKind.Utc);
        tag.Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "UPDATE_FB_CAMPAIGN_TAG", "fb_campaign_tags", tag.Id, oldData,
            new { dto.Categories, tag.DateFrom, tag.DateTo, tag.Note });

        var user = await _context.Set<User>().AsNoTracking().FirstOrDefaultAsync(u => u.Id == tag.CreatedBy);
        return ToDTO(tag, user?.Name);
    }

    public async Task DeleteTagAsync(int userId, int id)
    {
        var tag = await _context.Set<FbCampaignTag>().FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null)
            ?? throw new NotFoundException("Không tìm thấy nhãn chiến dịch");

        tag.DeletedAt = DateTime.UtcNow.AddHours(7);
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "DELETE_FB_CAMPAIGN_TAG", "fb_campaign_tags", tag.Id,
            new { tag.CampaignId, tag.CampaignName }, null);
    }

    public async Task<FbCampaignPerformanceDTO> GetPerformanceAsync(int id)
    {
        var tag = await _context.Set<FbCampaignTag>().AsNoTracking().FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null)
            ?? throw new NotFoundException("Không tìm thấy nhãn chiến dịch");

        var categories = JsonSerializer.Deserialize<List<string>>(tag.CategoriesJson) ?? new();
        var branchIds = string.IsNullOrEmpty(tag.BranchIdsJson) ? null : JsonSerializer.Deserialize<List<int>>(tag.BranchIdsJson);

        var periodFrom = tag.DateFrom;
        var periodTo = tag.DateTo.AddDays(1).AddTicks(-1); // hết ngày DateTo
        var periodDays = (tag.DateTo.Date - tag.DateFrom.Date).Days + 1;
        var baselineTo = tag.DateFrom.AddTicks(-1); // hết ngày trước DateFrom
        var baselineFrom = tag.DateFrom.AddDays(-periodDays);

        var (periodOrders, periodRevenue, periodCustomers) = await AggregateCategoryOrdersAsync(categories, branchIds, periodFrom, periodTo);
        var (baselineOrders, baselineRevenue, _) = await AggregateCategoryOrdersAsync(categories, branchIds, baselineFrom, baselineTo);

        double? orderLift = baselineOrders > 0 ? (double)(periodOrders - baselineOrders) / baselineOrders * 100 : null;
        double? revenueLift = baselineRevenue > 0 ? (double)((periodRevenue - baselineRevenue) / baselineRevenue) * 100 : null;

        // Spend/reach thật của chiến dịch trong đúng khoảng ngày — gọi lại Facebook Insights API,
        // không lưu trùng dữ liệu quảng cáo vào DB (đã có sẵn ở FacebookService, luôn lấy mới nhất).
        decimal fbSpend = 0; long fbImpressions = 0, fbClicks = 0, fbReach = 0;
        try
        {
            var insights = await _facebookService.GetInsightsAsync(
                tag.DateFrom.ToString("yyyy-MM-dd"), tag.DateTo.ToString("yyyy-MM-dd"), "campaign");
            foreach (var i in insights.Where(i => i.CampaignId == tag.CampaignId))
            {
                fbSpend += i.Spend;
                fbImpressions += i.Impressions;
                fbClicks += i.Clicks;
                fbReach += i.Reach;
            }
        }
        catch
        {
            // Facebook API lỗi/không cấu hình — vẫn trả về phần thống kê đơn hàng, chỉ để trống phần spend.
        }

        return new FbCampaignPerformanceDTO
        {
            TagId = tag.Id,
            CampaignId = tag.CampaignId,
            CampaignName = tag.CampaignName,
            Categories = categories,
            BranchIds = branchIds ?? new(),
            PeriodFrom = tag.DateFrom,
            PeriodTo = tag.DateTo,
            PeriodOrderCount = periodOrders,
            PeriodRevenue = periodRevenue,
            PeriodCustomerCount = periodCustomers,
            BaselineFrom = baselineFrom,
            BaselineTo = baselineTo.Date,
            BaselineOrderCount = baselineOrders,
            BaselineRevenue = baselineRevenue,
            OrderCountLiftPercent = orderLift,
            RevenueLiftPercent = revenueLift,
            FbSpend = fbSpend,
            FbImpressions = fbImpressions,
            FbClicks = fbClicks,
            FbReach = fbReach,
            CostPerOrderInCategory = periodOrders > 0 ? fbSpend / periodOrders : null,
        };
    }

    public async Task<PagedResult<CustomerWithTagsDTO>> GetMatchedCustomersAsync(int id, int? personaTagId, int page, int pageSize)
    {
        var tag = await _context.Set<FbCampaignTag>().AsNoTracking().FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null)
            ?? throw new NotFoundException("Không tìm thấy nhãn chiến dịch");

        var categories = JsonSerializer.Deserialize<List<string>>(tag.CategoriesJson) ?? new();
        var branchIds = string.IsNullOrEmpty(tag.BranchIdsJson) ? null : JsonSerializer.Deserialize<List<int>>(tag.BranchIdsJson);
        var periodTo = tag.DateTo.AddDays(1).AddTicks(-1);
        return await _personaTagService.GetCustomersByCategoryAffinityAsync(categories, branchIds, personaTagId, page, pageSize, tag.DateFrom, periodTo);
    }

    public async Task<CampaignTagCountsDTO> GetTagCountsAsync(int id)
    {
        var tag = await _context.Set<FbCampaignTag>().AsNoTracking().FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null)
            ?? throw new NotFoundException("Không tìm thấy nhãn chiến dịch");

        var categories = JsonSerializer.Deserialize<List<string>>(tag.CategoriesJson) ?? new();
        var branchIds = string.IsNullOrEmpty(tag.BranchIdsJson) ? null : JsonSerializer.Deserialize<List<int>>(tag.BranchIdsJson);
        var hasBranchFilter = branchIds != null && branchIds.Count > 0;
        var periodTo = tag.DateTo.AddDays(1).AddTicks(-1);

        var baseItemQuery = _context.Set<OrderItem>().AsNoTracking()
            .Where(oi => oi.Order.DeletedAt == null && oi.Order.CustomerId != null
                && oi.Category != null && categories.Contains(oi.Category)
                && (!hasBranchFilter || (oi.Order.BranchesId != null && branchIds!.Contains(oi.Order.BranchesId.Value))));

        var periodCustomerIds = await baseItemQuery
            .Where(oi => oi.Order.PurchaseDate >= tag.DateFrom && oi.Order.PurchaseDate <= periodTo)
            .Select(oi => oi.Order.CustomerId!.Value).Distinct().ToListAsync();

        var allTimeCustomerIds = await baseItemQuery
            .Select(oi => oi.Order.CustomerId!.Value).Distinct().ToListAsync();

        var periodCounts = await _context.Set<PersonaTagAssignment>().AsNoTracking()
            .Where(a => a.IsActive && periodCustomerIds.Contains(a.CustomerId))
            .GroupBy(a => a.TagId)
            .Select(g => new TagCountDTO { TagId = g.Key, Count = g.Count() })
            .ToListAsync();

        var allTimeCounts = await _context.Set<PersonaTagAssignment>().AsNoTracking()
            .Where(a => a.IsActive && allTimeCustomerIds.Contains(a.CustomerId))
            .GroupBy(a => a.TagId)
            .Select(g => new TagCountDTO { TagId = g.Key, Count = g.Count() })
            .ToListAsync();

        return new CampaignTagCountsDTO { PeriodCounts = periodCounts, AllTimeCounts = allTimeCounts };
    }

    public async Task<PagedResult<CareOpportunityCustomerDTO>> GetCareOpportunitiesAsync(int id, int? personaTagId, int page, int pageSize, int? minDays = null, int? maxDays = null, string? sortByDays = null)
    {
        var tag = await _context.Set<FbCampaignTag>().AsNoTracking().FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null)
            ?? throw new NotFoundException("Không tìm thấy nhãn chiến dịch");

        var categories = JsonSerializer.Deserialize<List<string>>(tag.CategoriesJson) ?? new();
        var branchIds = string.IsNullOrEmpty(tag.BranchIdsJson) ? null : JsonSerializer.Deserialize<List<int>>(tag.BranchIdsJson);
        return await _personaTagService.GetCareOpportunitiesAsync(categories, branchIds, personaTagId, page, pageSize, minDays, maxDays, sortByDays);
    }

    private async Task<(int OrderCount, decimal Revenue, int CustomerCount)> AggregateCategoryOrdersAsync(List<string> categories, List<int>? branchIds, DateTime from, DateTime to)
    {
        var hasBranchFilter = branchIds != null && branchIds.Count > 0;
        var items = _context.Set<OrderItem>().AsNoTracking()
            .Where(oi => oi.Order.DeletedAt == null && oi.Category != null && categories.Contains(oi.Category)
                && oi.Order.PurchaseDate >= from && oi.Order.PurchaseDate <= to
                && (!hasBranchFilter || (oi.Order.BranchesId != null && branchIds!.Contains(oi.Order.BranchesId.Value))));

        var orderCount = await items.Select(oi => oi.OrderId).Distinct().CountAsync();
        var revenue = await items.SumAsync(oi => (decimal?)oi.Revenue) ?? 0;
        var customerCount = await items.Where(oi => oi.Order.CustomerId != null)
            .Select(oi => oi.Order.CustomerId!.Value).Distinct().CountAsync();

        return (orderCount, revenue, customerCount);
    }

    private static FbCampaignTagDTO ToDTO(FbCampaignTag t, string? createdByName) => new()
    {
        Id = t.Id,
        CampaignId = t.CampaignId,
        CampaignName = t.CampaignName,
        Categories = JsonSerializer.Deserialize<List<string>>(t.CategoriesJson) ?? new(),
        BranchIds = string.IsNullOrEmpty(t.BranchIdsJson) ? new() : JsonSerializer.Deserialize<List<int>>(t.BranchIdsJson) ?? new(),
        DateFrom = t.DateFrom,
        DateTo = t.DateTo,
        Note = t.Note,
        CreatedByName = createdByName,
        CreatedAt = t.CreatedAt,
        UpdatedAt = t.UpdatedAt,
    };
}
