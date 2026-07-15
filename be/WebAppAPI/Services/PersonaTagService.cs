using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Data;
using WebAppInfractor.Models;
using WebAppInfractor.Models.Persona;

public interface IPersonaTagService
{
    Task<List<PersonaTagDTO>> GetTagsAsync();
    Task<PersonaTagDTO> CreateTagAsync(int userId, CreatePersonaTagDTO dto);
    Task<PersonaTagDTO> UpdateTagAsync(int userId, int id, UpdatePersonaTagDTO dto);
    Task DeleteTagAsync(int userId, int id);

    Task<PersonaTagAssignmentDTO> AssignTagAsync(int userId, AssignPersonaTagRequestDTO dto);
    Task RemoveAssignmentAsync(int userId, int assignmentId);
    Task<List<PersonaTagAssignmentDTO>> GetCustomerTagsAsync(int customerId);
    Task<PagedResult<CustomerWithTagsDTO>> GetCustomersWithTagsAsync(string? search, int? tagId, bool? hasTag, int page, int pageSize);
    Task<PagedResult<CustomerWithTagsDTO>> GetCustomersByCategoryAffinityAsync(List<string> categories, List<int>? branchIds, int? personaTagId, int page, int pageSize, DateTime? dateFrom = null, DateTime? dateTo = null);
    Task<PagedResult<CareOpportunityCustomerDTO>> GetCareOpportunitiesAsync(List<string> categories, List<int>? branchIds, int? personaTagId, int page, int pageSize, int? minDays = null, int? maxDays = null, string? sortByDays = null);

    Task<List<string>> GetDistinctCategoriesAsync(string? search);
    Task<PersonaRuleConfigDTO?> GetTagRuleAsync(int tagId);
    Task SetTagRuleAsync(int userId, int tagId, PersonaRuleConfigDTO? config);
    Task<PersonaRulePreviewDTO> PreviewRuleAsync(PersonaRuleConfigDTO config);
    Task<PersonaClassificationRunDTO> RunClassificationAsync(int userId, int tagId);
    Task<PagedResult<PersonaClassificationRunDTO>> GetRunsAsync(int? tagId, int page, int pageSize);
    Task<PersonaClassificationRunDetailDTO> GetRunDetailAsync(int runId);
}

public class PersonaTagService : IPersonaTagService
{
    private readonly MemBerContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IActivityService _auditLogService;

    public PersonaTagService(MemBerContext context, IUnitOfWork unitOfWork, IActivityService auditLogService)
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _auditLogService = auditLogService;
    }

    public async Task<List<PersonaTagDTO>> GetTagsAsync()
    {
        var counts = await _context.Set<PersonaTagAssignment>()
            .AsNoTracking()
            .Where(a => a.IsActive)
            .GroupBy(a => a.TagId)
            .Select(g => new { TagId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TagId, x => x.Count);

        var tags = await _context.Set<PersonaTag>()
            .AsNoTracking()
            .Where(t => t.DeletedAt == null)
            .OrderBy(t => t.DisplayOrder)
            .ThenBy(t => t.Name)
            .Select(t => new PersonaTagDTO
            {
                Id = t.Id,
                Code = t.Code,
                Name = t.Name,
                Description = t.Description,
                Color = t.Color,
                HasAutoRule = t.RuleConfig != null,
                IsActive = t.IsActive,
                DisplayOrder = t.DisplayOrder,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt,
            })
            .ToListAsync();

        foreach (var tag in tags)
        {
            tag.ActiveAssignmentCount = counts.TryGetValue(tag.Id, out var c) ? c : 0;
        }

        return tags;
    }

    public async Task<PersonaTagDTO> CreateTagAsync(int userId, CreatePersonaTagDTO dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new BadRequestException("Tên tag không được để trống");

        var code = await GenerateUniqueCodeAsync(dto.Name);

        var tag = new PersonaTag
        {
            Code = code,
            Name = dto.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Color = string.IsNullOrWhiteSpace(dto.Color) ? "#086839" : dto.Color,
        };
        _context.Set<PersonaTag>().Add(tag);
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "CREATE_PERSONA_TAG", "persona_tags", tag.Id, null,
            new { tag.Code, tag.Name, tag.Color });

        return new PersonaTagDTO
        {
            Id = tag.Id,
            Code = tag.Code,
            Name = tag.Name,
            Description = tag.Description,
            Color = tag.Color,
            HasAutoRule = false,
            IsActive = tag.IsActive,
            DisplayOrder = tag.DisplayOrder,
            ActiveAssignmentCount = 0,
            CreatedAt = tag.CreatedAt,
            UpdatedAt = tag.UpdatedAt,
        };
    }

    public async Task<PersonaTagDTO> UpdateTagAsync(int userId, int id, UpdatePersonaTagDTO dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new BadRequestException("Tên tag không được để trống");

        var tag = await _context.Set<PersonaTag>().FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null);
        if (tag == null)
            throw new NotFoundException("Không tìm thấy tag");

        var oldData = new { tag.Name, tag.Color, tag.IsActive, tag.DisplayOrder };

        tag.Name = dto.Name.Trim();
        tag.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        tag.Color = string.IsNullOrWhiteSpace(dto.Color) ? tag.Color : dto.Color;
        tag.IsActive = dto.IsActive;
        tag.DisplayOrder = dto.DisplayOrder;
        tag.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "UPDATE_PERSONA_TAG", "persona_tags", tag.Id, oldData,
            new { tag.Name, tag.Color, tag.IsActive, tag.DisplayOrder });

        var activeCount = await _context.Set<PersonaTagAssignment>()
            .AsNoTracking()
            .CountAsync(a => a.TagId == tag.Id && a.IsActive);

        return new PersonaTagDTO
        {
            Id = tag.Id,
            Code = tag.Code,
            Name = tag.Name,
            Description = tag.Description,
            Color = tag.Color,
            HasAutoRule = tag.RuleConfig != null,
            IsActive = tag.IsActive,
            DisplayOrder = tag.DisplayOrder,
            ActiveAssignmentCount = activeCount,
            CreatedAt = tag.CreatedAt,
            UpdatedAt = tag.UpdatedAt,
        };
    }

    public async Task DeleteTagAsync(int userId, int id)
    {
        var tag = await _context.Set<PersonaTag>().FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null);
        if (tag == null)
            throw new NotFoundException("Không tìm thấy tag");

        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var now = DateTime.UtcNow.AddHours(7);
            tag.DeletedAt = now;
            tag.UpdatedAt = DateTime.UtcNow;

            var activeAssignments = await _context.Set<PersonaTagAssignment>()
                .Where(a => a.TagId == id && a.IsActive)
                .ToListAsync();
            foreach (var a in activeAssignments)
            {
                a.IsActive = false;
                a.DeactivatedAt = DateTime.UtcNow;
                a.RemovedBy = userId;
            }

            await _unitOfWork.SaveChangesAsync();
            await _auditLogService.SaveLogAsync(userId, null, "DELETE_PERSONA_TAG", "persona_tags", id, null,
                new { AffectedAssignments = activeAssignments.Count });
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<PersonaTagAssignmentDTO> AssignTagAsync(int userId, AssignPersonaTagRequestDTO dto)
    {
        var tag = await _context.Set<PersonaTag>()
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == dto.TagId && t.DeletedAt == null);
        if (tag == null)
            throw new NotFoundException("Không tìm thấy tag");

        var customerExists = await _context.Set<Customer>()
            .AnyAsync(c => c.Id == dto.CustomerId && c.DeletedAt == null);
        if (!customerExists)
            throw new NotFoundException("Không tìm thấy khách hàng");

        var alreadyTagged = await _context.Set<PersonaTagAssignment>()
            .AnyAsync(a => a.CustomerId == dto.CustomerId && a.TagId == dto.TagId && a.Source == "manual" && a.IsActive);
        if (alreadyTagged)
            throw new BadRequestException("Khách hàng đã được gắn tag này rồi");

        var assignment = new PersonaTagAssignment
        {
            CustomerId = dto.CustomerId,
            TagId = dto.TagId,
            Source = "manual",
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
            AssignedBy = userId,
        };
        _context.Set<PersonaTagAssignment>().Add(assignment);
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "ASSIGN_PERSONA_TAG", "persona_tag_assignments", assignment.Id, null,
            new { dto.CustomerId, dto.TagId, dto.Note });

        var userName = await _context.Set<User>().AsNoTracking()
            .Where(u => u.Id == userId).Select(u => u.Name).FirstOrDefaultAsync();

        return new PersonaTagAssignmentDTO
        {
            Id = assignment.Id,
            TagId = tag.Id,
            TagName = tag.Name,
            TagColor = tag.Color,
            Source = assignment.Source,
            Note = assignment.Note,
            AssignedByName = userName,
            AssignedAt = assignment.AssignedAt,
        };
    }

    public async Task RemoveAssignmentAsync(int userId, int assignmentId)
    {
        var assignment = await _context.Set<PersonaTagAssignment>()
            .FirstOrDefaultAsync(a => a.Id == assignmentId && a.IsActive);
        if (assignment == null)
            throw new NotFoundException("Không tìm thấy tag đã gắn");

        if (assignment.Source != "manual")
            throw new BadRequestException("Đây là tag do hệ thống tự động gắn — hãy chạy lại luật phân loại thay vì gỡ tay");

        assignment.IsActive = false;
        assignment.DeactivatedAt = DateTime.UtcNow;
        assignment.RemovedBy = userId;
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "REMOVE_PERSONA_TAG_ASSIGNMENT", "persona_tag_assignments", assignment.Id, null, null);
    }

    public async Task<List<PersonaTagAssignmentDTO>> GetCustomerTagsAsync(int customerId)
    {
        return await BuildAssignmentQuery(a => a.CustomerId == customerId).ToListAsync();
    }

    public async Task<PagedResult<CustomerWithTagsDTO>> GetCustomersWithTagsAsync(string? search, int? tagId, bool? hasTag, int page, int pageSize)
    {
        var query = _context.Set<Customer>().AsNoTracking().Where(c => c.DeletedAt == null);

        if (tagId.HasValue)
        {
            var taggedCustomerIds = _context.Set<PersonaTagAssignment>().AsNoTracking()
                .Where(a => a.IsActive && a.TagId == tagId.Value)
                .Select(a => a.CustomerId);
            query = query.Where(c => taggedCustomerIds.Contains(c.Id));
        }

        if (hasTag.HasValue)
        {
            var anyTaggedCustomerIds = _context.Set<PersonaTagAssignment>().AsNoTracking()
                .Where(a => a.IsActive)
                .Select(a => a.CustomerId)
                .Distinct();
            query = hasTag.Value
                ? query.Where(c => anyTaggedCustomerIds.Contains(c.Id))
                : query.Where(c => !anyTaggedCustomerIds.Contains(c.Id));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.Trim().ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(kw)
                || (c.Phone != null && c.Phone.ToLower().Contains(kw))
                || c.CustomerCode.ToLower().Contains(kw));
        }

        var totalItems = await query.CountAsync();

        var customers = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CustomerWithTagsDTO
            {
                Id = c.Id,
                CustomerCode = c.CustomerCode,
                Name = c.Name,
                Phone = c.Phone,
                TotalRevenue = c.TotalRevenue,
            })
            .ToListAsync();

        await HydrateTagsAndSignatureAsync(customers);

        return new PagedResult<CustomerWithTagsDTO>
        {
            TotalItems = totalItems,
            Page = page,
            PageSize = pageSize,
            Items = customers,
        };
    }

    public async Task<PagedResult<CustomerWithTagsDTO>> GetCustomersByCategoryAffinityAsync(List<string> categories, List<int>? branchIds, int? personaTagId, int page, int pageSize, DateTime? dateFrom = null, DateTime? dateTo = null)
    {
        var normalizedCategories = categories.Where(c => !string.IsNullOrWhiteSpace(c)).Distinct().ToList();
        if (normalizedCategories.Count == 0)
            return new PagedResult<CustomerWithTagsDTO> { TotalItems = 0, Page = page, PageSize = pageSize, Items = new() };

        var hasBranchFilter = branchIds != null && branchIds.Count > 0;

        var affinityQuery = _context.Set<OrderItem>().AsNoTracking()
            .Where(oi => oi.Order.DeletedAt == null && oi.Order.CustomerId != null
                && oi.Category != null && normalizedCategories.Contains(oi.Category)
                && (!hasBranchFilter || (oi.Order.BranchesId != null && branchIds!.Contains(oi.Order.BranchesId.Value)))
                && (dateFrom == null || oi.Order.PurchaseDate >= dateFrom)
                && (dateTo == null || oi.Order.PurchaseDate <= dateTo))
            .GroupBy(oi => oi.Order.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, AffinityRevenue = g.Sum(oi => oi.Revenue) });

        if (personaTagId.HasValue)
        {
            var taggedCustomerIds = _context.Set<PersonaTagAssignment>().AsNoTracking()
                .Where(a => a.IsActive && a.TagId == personaTagId.Value)
                .Select(a => a.CustomerId);
            affinityQuery = affinityQuery.Where(x => taggedCustomerIds.Contains(x.CustomerId));
        }

        var totalItems = await affinityQuery.CountAsync();

        var pageAffinity = await affinityQuery
            .OrderByDescending(x => x.AffinityRevenue)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var orderedCustomerIds = pageAffinity.Select(x => x.CustomerId).ToList();

        var customersById = await _context.Set<Customer>().AsNoTracking()
            .Where(c => orderedCustomerIds.Contains(c.Id) && c.DeletedAt == null)
            .Select(c => new CustomerWithTagsDTO
            {
                Id = c.Id,
                CustomerCode = c.CustomerCode,
                Name = c.Name,
                Phone = c.Phone,
                TotalRevenue = c.TotalRevenue,
            })
            .ToDictionaryAsync(c => c.Id);

        // Giữ đúng thứ tự xếp hạng theo AffinityRevenue (query Customer riêng làm mất thứ tự đó).
        var affinityByCustomer = pageAffinity.ToDictionary(x => x.CustomerId, x => x.AffinityRevenue);
        var customers = orderedCustomerIds
            .Where(id => customersById.ContainsKey(id))
            .Select(id => {
                var c = customersById[id];
                c.PeriodRevenue = affinityByCustomer.TryGetValue(id, out var rev) ? rev : 0;
                return c;
            })
            .ToList();

        await HydrateTagsAndSignatureAsync(customers);

        return new PagedResult<CustomerWithTagsDTO>
        {
            TotalItems = totalItems,
            Page = page,
            PageSize = pageSize,
            Items = customers,
        };
    }

    public async Task<PagedResult<CareOpportunityCustomerDTO>> GetCareOpportunitiesAsync(
        List<string> categories, List<int>? branchIds, int? personaTagId, int page, int pageSize,
        int? minDays = null, int? maxDays = null, string? sortByDays = null)
    {
        var normalizedCategories = categories.Where(c => !string.IsNullOrWhiteSpace(c)).Distinct().ToList();
        if (normalizedCategories.Count == 0)
            return new PagedResult<CareOpportunityCustomerDTO> { TotalItems = 0, Page = page, PageSize = pageSize, Items = new() };

        var hasBranchFilter = branchIds != null && branchIds.Count > 0;

        // Tất cả khách có lịch sử mua danh mục này (không giới hạn ngày)
        var affinityAll = await _context.Set<OrderItem>().AsNoTracking()
            .Where(oi => oi.Order.DeletedAt == null && oi.Order.CustomerId != null
                && oi.Category != null && normalizedCategories.Contains(oi.Category)
                && (!hasBranchFilter || (oi.Order.BranchesId != null && branchIds!.Contains(oi.Order.BranchesId.Value))))
            .GroupBy(oi => oi.Order.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, AffinityRevenue = g.Sum(oi => oi.Revenue) })
            .ToListAsync();

        if (personaTagId.HasValue)
        {
            var taggedIds = (await _context.Set<PersonaTagAssignment>().AsNoTracking()
                .Where(a => a.IsActive && a.TagId == personaTagId.Value)
                .Select(a => a.CustomerId)
                .ToListAsync()).ToHashSet();
            affinityAll = affinityAll.Where(x => taggedIds.Contains(x.CustomerId)).ToList();
        }

        var allCustomerIds = affinityAll.Select(x => x.CustomerId).ToList();

        // Ngày mua cuối của từng khách
        var now = DateTime.UtcNow.AddHours(7);
        var lastOrderDates = await _context.Set<Order>().AsNoTracking()
            .Where(o => o.DeletedAt == null && o.CustomerId.HasValue && allCustomerIds.Contains(o.CustomerId.Value))
            .GroupBy(o => o.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, LastDate = g.Max(o => o.PurchaseDate) })
            .ToDictionaryAsync(x => x.CustomerId, x => x.LastDate);

        var withDays = affinityAll
            .Select(x => new
            {
                x.CustomerId, x.AffinityRevenue,
                Days = lastOrderDates.TryGetValue(x.CustomerId, out var d) ? (int)(now - d).TotalDays : 9999,
            })
            .Where(x => (minDays == null || x.Days >= minDays) && (maxDays == null || x.Days <= maxDays));

        var sorted = sortByDays == "asc"
            ? withDays.OrderBy(x => x.Days).ThenByDescending(x => x.AffinityRevenue).ToList()
            : sortByDays == "desc"
                ? withDays.OrderByDescending(x => x.Days).ThenByDescending(x => x.AffinityRevenue).ToList()
                : withDays.OrderByDescending(x => x.Days >= 60 ? 1 : 0).ThenByDescending(x => x.AffinityRevenue).ToList();

        var totalItems = sorted.Count;
        var pageItems = sorted.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        var pageCustomerIds = pageItems.Select(x => x.CustomerId).ToList();

        var customersById = await _context.Set<Customer>().AsNoTracking()
            .Where(c => pageCustomerIds.Contains(c.Id) && c.DeletedAt == null)
            .Select(c => new { c.Id, c.CustomerCode, c.Name, c.Phone, c.TotalRevenue })
            .ToDictionaryAsync(c => c.Id);

        var dtoPage = pageItems
            .Where(x => customersById.ContainsKey(x.CustomerId))
            .Select(x => new CustomerWithTagsDTO
            {
                Id = x.CustomerId,
                CustomerCode = customersById[x.CustomerId].CustomerCode,
                Name = customersById[x.CustomerId].Name,
                Phone = customersById[x.CustomerId].Phone,
                TotalRevenue = customersById[x.CustomerId].TotalRevenue,
            })
            .ToList();

        await HydrateTagsAndSignatureAsync(dtoPage);
        var sigById = dtoPage.ToDictionary(d => d.Id, d => d.Signature);
        var tagsById = dtoPage.ToDictionary(d => d.Id, d => d.Tags);

        var items = pageItems
            .Where(x => customersById.ContainsKey(x.CustomerId))
            .Select(x => new CareOpportunityCustomerDTO
            {
                Id = x.CustomerId,
                CustomerCode = customersById[x.CustomerId].CustomerCode,
                Name = customersById[x.CustomerId].Name,
                Phone = customersById[x.CustomerId].Phone,
                TotalRevenue = customersById[x.CustomerId].TotalRevenue,
                CategoryAffinityRevenue = x.AffinityRevenue,
                DaysSinceLastOrder = x.Days,
                Signature = sigById.TryGetValue(x.CustomerId, out var sig) ? sig : new(),
                Tags = tagsById.TryGetValue(x.CustomerId, out var tags) ? tags : new(),
            })
            .ToList();

        return new PagedResult<CareOpportunityCustomerDTO> { TotalItems = totalItems, Page = page, PageSize = pageSize, Items = items };
    }

    // Gắn Tags + Signature (top 3 nhóm hàng theo doanh thu) cho đúng tập khách đang xem —
    // dùng chung cho cả GetCustomersWithTagsAsync và GetCustomersByCategoryAffinityAsync
    // (module Facebook campaign tag) để không lặp lại cùng 1 khối SQL aggregation.
    private async Task HydrateTagsAndSignatureAsync(List<CustomerWithTagsDTO> customers)
    {
        var customerIds = customers.Select(c => c.Id).ToList();
        if (customerIds.Count == 0) return;

        var assignments = await BuildAssignmentQuery(a => customerIds.Contains(a.CustomerId)).ToListAsync();
        var assignmentsByCustomer = assignments
            .GroupBy(a => a.CustomerId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var categoryRevenueRaw = await _context.Set<OrderItem>().AsNoTracking()
            .Where(oi => oi.Order.DeletedAt == null && oi.Order.CustomerId != null
                && customerIds.Contains(oi.Order.CustomerId.Value)
                && oi.Category != null && oi.Category != "")
            .GroupBy(oi => new { CustomerId = oi.Order.CustomerId!.Value, oi.Category })
            .Select(g => new { g.Key.CustomerId, Category = g.Key.Category!, Revenue = g.Sum(oi => oi.Revenue) })
            .ToListAsync();

        var signatureByCustomer = categoryRevenueRaw
            .GroupBy(x => x.CustomerId)
            .ToDictionary(g => g.Key, g =>
            {
                var totalRevenue = g.Sum(x => x.Revenue);
                return g.OrderByDescending(x => x.Revenue)
                    .Take(3)
                    .Select(x => new CustomerSignatureCategoryDTO
                    {
                        Category = x.Category,
                        Revenue = x.Revenue,
                        SharePercent = totalRevenue > 0 ? (double)(x.Revenue / totalRevenue) * 100 : 0,
                    })
                    .ToList();
            });

        foreach (var c in customers)
        {
            c.Tags = assignmentsByCustomer.TryGetValue(c.Id, out var list) ? list : new List<PersonaTagAssignmentDTO>();
            c.Signature = signatureByCustomer.TryGetValue(c.Id, out var sig) ? sig : new List<CustomerSignatureCategoryDTO>();
        }
    }

    public async Task<List<string>> GetDistinctCategoriesAsync(string? search)
    {
        var query = _context.Set<OrderItem>().AsNoTracking()
            .Where(oi => oi.Category != null && oi.Category != "");

        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.Trim().ToLower();
            query = query.Where(oi => oi.Category!.ToLower().Contains(kw));
        }

        return await query
            .Select(oi => oi.Category!)
            .Distinct()
            .OrderBy(c => c)
            .Take(50)
            .ToListAsync();
    }

    public async Task<PersonaRuleConfigDTO?> GetTagRuleAsync(int tagId)
    {
        var tag = await _context.Set<PersonaTag>().AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tagId && t.DeletedAt == null);
        if (tag == null)
            throw new NotFoundException("Không tìm thấy tag");

        return tag.RuleConfig == null ? null : JsonSerializer.Deserialize<PersonaRuleConfigDTO>(tag.RuleConfig, RuleJsonOptions);
    }

    public async Task SetTagRuleAsync(int userId, int tagId, PersonaRuleConfigDTO? config)
    {
        var tag = await _context.Set<PersonaTag>().FirstOrDefaultAsync(t => t.Id == tagId && t.DeletedAt == null);
        if (tag == null)
            throw new NotFoundException("Không tìm thấy tag");

        ValidateRuleConfig(config);

        var hadRuleBefore = tag.RuleConfig != null;
        tag.RuleConfig = config == null ? null : JsonSerializer.Serialize(config, RuleJsonOptions);
        tag.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "SET_PERSONA_TAG_RULE", "persona_tags", tag.Id,
            new { HadRule = hadRuleBefore }, new { HasRule = config != null });
    }

    public async Task<PersonaRulePreviewDTO> PreviewRuleAsync(PersonaRuleConfigDTO config)
    {
        var matchedIds = await EvaluateRuleAsync(config);
        var sample = await BuildCustomerSampleAsync(matchedIds, 20);
        return new PersonaRulePreviewDTO { MatchedCount = matchedIds.Count, Sample = sample };
    }

    public async Task<PersonaClassificationRunDTO> RunClassificationAsync(int userId, int tagId)
    {
        var tag = await _context.Set<PersonaTag>().FirstOrDefaultAsync(t => t.Id == tagId && t.DeletedAt == null);
        if (tag == null)
            throw new NotFoundException("Không tìm thấy tag");
        if (tag.RuleConfig == null)
            throw new BadRequestException("Tag này chưa có luật tự động");

        var config = JsonSerializer.Deserialize<PersonaRuleConfigDTO>(tag.RuleConfig, RuleJsonOptions)!;
        var matchedIds = await EvaluateRuleAsync(config);

        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var existingAuto = await _context.Set<PersonaTagAssignment>()
                .Where(a => a.TagId == tagId && a.Source == "auto" && a.IsActive)
                .ToListAsync();
            var existingAutoIds = existingAuto.Select(a => a.CustomerId).ToHashSet();

            var toAdd = matchedIds.Except(existingAutoIds).ToList();
            var toRemove = existingAuto.Where(a => !matchedIds.Contains(a.CustomerId)).ToList();
            var unchangedCount = existingAutoIds.Count - toRemove.Count;

            var run = new PersonaClassificationRun
            {
                TagId = tagId,
                RuleConfigSnapshot = tag.RuleConfig,
                RunBy = userId,
                MatchedCustomerCount = matchedIds.Count,
                NewlyAddedCount = toAdd.Count,
                RemovedCount = toRemove.Count,
                UnchangedCount = unchangedCount,
            };
            _context.Set<PersonaClassificationRun>().Add(run);
            await _unitOfWork.SaveChangesAsync();

            foreach (var customerId in toAdd)
            {
                _context.Set<PersonaTagAssignment>().Add(new PersonaTagAssignment
                {
                    CustomerId = customerId,
                    TagId = tagId,
                    Source = "auto",
                    RunId = run.Id,
                });
            }
            foreach (var a in toRemove)
            {
                a.IsActive = false;
                a.DeactivatedAt = DateTime.UtcNow;
                a.DeactivatedByRunId = run.Id;
            }

            await _unitOfWork.SaveChangesAsync();
            await _auditLogService.SaveLogAsync(userId, null, "RUN_PERSONA_CLASSIFICATION", "persona_classification_runs", run.Id, null,
                new { TagId = tagId, run.MatchedCustomerCount, run.NewlyAddedCount, run.RemovedCount });
            await transaction.CommitAsync();

            var runByName = await _context.Set<User>().AsNoTracking()
                .Where(u => u.Id == userId).Select(u => u.Name).FirstOrDefaultAsync();

            return new PersonaClassificationRunDTO
            {
                Id = run.Id,
                TagId = tagId,
                TagName = tag.Name,
                RunByName = runByName ?? "",
                RunAt = run.RunAt,
                MatchedCustomerCount = run.MatchedCustomerCount,
                NewlyAddedCount = run.NewlyAddedCount,
                RemovedCount = run.RemovedCount,
                UnchangedCount = run.UnchangedCount,
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<PagedResult<PersonaClassificationRunDTO>> GetRunsAsync(int? tagId, int page, int pageSize)
    {
        var query = _context.Set<PersonaClassificationRun>().AsNoTracking().AsQueryable();
        if (tagId.HasValue) query = query.Where(r => r.TagId == tagId.Value);

        var totalItems = await query.CountAsync();

        var runs = await query
            .OrderByDescending(r => r.RunAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(_context.Set<PersonaTag>(), r => r.TagId, t => t.Id, (r, t) => new { r, t })
            .GroupJoin(_context.Set<User>(), x => x.r.RunBy, u => u.Id, (x, users) => new { x.r, x.t, Users = users })
            .SelectMany(x => x.Users.DefaultIfEmpty(), (x, u) => new PersonaClassificationRunDTO
            {
                Id = x.r.Id,
                TagId = x.t.Id,
                TagName = x.t.Name,
                RunByName = u != null ? u.Name : "",
                RunAt = x.r.RunAt,
                MatchedCustomerCount = x.r.MatchedCustomerCount,
                NewlyAddedCount = x.r.NewlyAddedCount,
                RemovedCount = x.r.RemovedCount,
                UnchangedCount = x.r.UnchangedCount,
            })
            .ToListAsync();

        return new PagedResult<PersonaClassificationRunDTO> { TotalItems = totalItems, Page = page, PageSize = pageSize, Items = runs };
    }

    public async Task<PersonaClassificationRunDetailDTO> GetRunDetailAsync(int runId)
    {
        var run = await _context.Set<PersonaClassificationRun>().AsNoTracking().FirstOrDefaultAsync(r => r.Id == runId);
        if (run == null)
            throw new NotFoundException("Không tìm thấy lịch sử chạy");

        var tag = await _context.Set<PersonaTag>().AsNoTracking().FirstOrDefaultAsync(t => t.Id == run.TagId);
        var runByName = await _context.Set<User>().AsNoTracking()
            .Where(u => u.Id == run.RunBy).Select(u => u.Name).FirstOrDefaultAsync();

        var addedCustomerIds = await _context.Set<PersonaTagAssignment>().AsNoTracking()
            .Where(a => a.RunId == runId).Select(a => a.CustomerId).ToListAsync();
        var removedCustomerIds = await _context.Set<PersonaTagAssignment>().AsNoTracking()
            .Where(a => a.DeactivatedByRunId == runId).Select(a => a.CustomerId).ToListAsync();

        return new PersonaClassificationRunDetailDTO
        {
            Id = run.Id,
            TagId = run.TagId,
            TagName = tag?.Name ?? "",
            RunByName = runByName ?? "",
            RunAt = run.RunAt,
            MatchedCustomerCount = run.MatchedCustomerCount,
            NewlyAddedCount = run.NewlyAddedCount,
            RemovedCount = run.RemovedCount,
            UnchangedCount = run.UnchangedCount,
            AddedCustomers = await BuildCustomerSampleAsync(addedCustomerIds.ToHashSet(), addedCustomerIds.Count),
            RemovedCustomers = await BuildCustomerSampleAsync(removedCustomerIds.ToHashSet(), removedCustomerIds.Count),
        };
    }

    private static readonly JsonSerializerOptions RuleJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private async Task<List<PersonaCustomerSampleDTO>> BuildCustomerSampleAsync(HashSet<int> customerIds, int take)
    {
        if (customerIds.Count == 0) return new List<PersonaCustomerSampleDTO>();

        return await _context.Set<Customer>().AsNoTracking()
            .Where(c => customerIds.Contains(c.Id))
            .OrderByDescending(c => c.TotalRevenue)
            .Take(take)
            .Select(c => new PersonaCustomerSampleDTO
            {
                Id = c.Id,
                CustomerCode = c.CustomerCode,
                Name = c.Name,
                Phone = c.Phone,
                TotalRevenue = c.TotalRevenue,
            })
            .ToListAsync();
    }

    private static void ValidateRuleConfig(PersonaRuleConfigDTO? config)
    {
        if (config == null) return;
        if (config.Conditions == null || config.Conditions.Count == 0)
            throw new BadRequestException("Luật phải có ít nhất 1 điều kiện");

        foreach (var c in config.Conditions)
        {
            switch (c)
            {
                case CategoryRevenueShareConditionDTO share:
                    if (share.Categories == null || share.Categories.Count == 0)
                        throw new BadRequestException("Điều kiện tỉ trọng nhóm hàng cần chọn ít nhất 1 nhóm hàng");
                    if (share.MinSharePercent <= 0 || share.MinSharePercent > 100)
                        throw new BadRequestException("Tỉ lệ tối thiểu phải trong khoảng 0-100%");
                    break;
                case OrderFrequencyConditionDTO freq:
                    if (freq.MinOrderCount <= 0)
                        throw new BadRequestException("Số đơn tối thiểu phải lớn hơn 0");
                    if (freq.LookbackDays <= 0)
                        throw new BadRequestException("Số ngày nhìn lại phải lớn hơn 0");
                    break;
                case LunarDateRecurrenceConditionDTO lunar:
                    if (lunar.LunarDays == null || lunar.LunarDays.Count == 0)
                        throw new BadRequestException("Điều kiện lịch âm cần chọn ít nhất 1 ngày âm lịch");
                    if (lunar.LunarDays.Any(d => d < 1 || d > 30))
                        throw new BadRequestException("Ngày âm lịch phải trong khoảng 1-30");
                    if (lunar.MinOccurrences <= 0)
                        throw new BadRequestException("Số lần tối thiểu phải lớn hơn 0");
                    if (lunar.LookbackMonths <= 0)
                        throw new BadRequestException("Số tháng nhìn lại phải lớn hơn 0");
                    break;
                case BusinessCustomerConditionDTO:
                    break;
                case TotalRevenueConditionDTO revenue:
                    if (revenue.MinRevenue <= 0)
                        throw new BadRequestException("Doanh thu tối thiểu phải lớn hơn 0");
                    break;
                case TotalOrderCountConditionDTO orderCount:
                    if (orderCount.MinCount <= 0)
                        throw new BadRequestException("Số đơn tối thiểu phải lớn hơn 0");
                    if (orderCount.MaxCount.HasValue && orderCount.MaxCount.Value < orderCount.MinCount)
                        throw new BadRequestException("Số đơn tối đa phải lớn hơn hoặc bằng số đơn tối thiểu");
                    break;
                case DaysSinceLastOrderConditionDTO lastOrder:
                    if (lastOrder.MinDays <= 0)
                        throw new BadRequestException("Số ngày phải lớn hơn 0");
                    if (lastOrder.MaxDays.HasValue && lastOrder.MaxDays.Value < lastOrder.MinDays)
                        throw new BadRequestException("Số ngày tối đa phải lớn hơn hoặc bằng số ngày tối thiểu");
                    break;
                case DaysSinceFirstOrderConditionDTO firstOrder:
                    if (firstOrder.MaxDays <= 0)
                        throw new BadRequestException("Số ngày phải lớn hơn 0");
                    break;
                default:
                    throw new BadRequestException("Loại điều kiện không hợp lệ");
            }
        }
    }

    // Preview và Run dùng chung hàm này — đảm bảo "số Preview" luôn khớp đúng số thực tế sau
    // khi Run, vì cả 2 chạy chung 1 logic tính toán chứ không phải 2 cách tính riêng biệt.
    private async Task<HashSet<int>> EvaluateRuleAsync(PersonaRuleConfigDTO config)
    {
        ValidateRuleConfig(config);
        HashSet<int>? result = null;

        foreach (var condition in config.Conditions)
        {
            var matched = condition switch
            {
                CategoryRevenueShareConditionDTO share => await EvaluateCategoryShareAsync(share),
                OrderFrequencyConditionDTO freq => await EvaluateOrderFrequencyAsync(freq),
                LunarDateRecurrenceConditionDTO lunar => await EvaluateLunarRecurrenceAsync(lunar),
                BusinessCustomerConditionDTO => await EvaluateBusinessCustomerAsync(),
                TotalRevenueConditionDTO revenue => await EvaluateTotalRevenueAsync(revenue),
                TotalOrderCountConditionDTO orderCount => await EvaluateTotalOrderCountAsync(orderCount),
                DaysSinceLastOrderConditionDTO lastOrder => await EvaluateDaysSinceLastOrderAsync(lastOrder),
                DaysSinceFirstOrderConditionDTO firstOrder => await EvaluateDaysSinceFirstOrderAsync(firstOrder),
                _ => new HashSet<int>(),
            };
            result = result == null ? matched : new HashSet<int>(result.Intersect(matched));
            if (result.Count == 0) break;
        }

        return result ?? new HashSet<int>();
    }

    private async Task<HashSet<int>> EvaluateCategoryShareAsync(CategoryRevenueShareConditionDTO cond)
    {
        var itemsQuery = _context.Set<OrderItem>().AsNoTracking()
            .Where(oi => oi.Order.DeletedAt == null && oi.Order.CustomerId != null);

        if (cond.LookbackDays.HasValue)
        {
            var cutoff = DateTime.UtcNow.AddDays(-cond.LookbackDays.Value);
            itemsQuery = itemsQuery.Where(oi => oi.Order.PurchaseDate >= cutoff);
        }

        var totals = await itemsQuery
            .GroupBy(oi => oi.Order.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, Total = g.Sum(oi => oi.Revenue) })
            .ToDictionaryAsync(x => x.CustomerId, x => x.Total);

        var matched = await itemsQuery
            .Where(oi => cond.Categories.Contains(oi.Category!))
            .GroupBy(oi => oi.Order.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, Matched = g.Sum(oi => oi.Revenue) })
            .ToListAsync();

        var result = new HashSet<int>();
        foreach (var m in matched)
        {
            if (!totals.TryGetValue(m.CustomerId, out var total) || total <= 0) continue;
            var sharePercent = (double)(m.Matched / total) * 100;
            if (sharePercent >= cond.MinSharePercent) result.Add(m.CustomerId);
        }
        return result;
    }

    private async Task<HashSet<int>> EvaluateOrderFrequencyAsync(OrderFrequencyConditionDTO cond)
    {
        var cutoff = DateTime.UtcNow.AddDays(-cond.LookbackDays);
        var query = _context.Set<Order>().AsNoTracking()
            .Where(o => o.DeletedAt == null && o.CustomerId != null && o.PurchaseDate >= cutoff);

        if (cond.Categories != null && cond.Categories.Count > 0)
        {
            query = query.Where(o => o.OrderItems.Any(oi => cond.Categories.Contains(oi.Category!)));
        }

        var matchedIds = await query
            .GroupBy(o => o.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, Count = g.Count() })
            .Where(g => g.Count >= cond.MinOrderCount)
            .Select(g => g.CustomerId)
            .ToListAsync();

        return matchedIds.ToHashSet();
    }

    private async Task<HashSet<int>> EvaluateLunarRecurrenceAsync(LunarDateRecurrenceConditionDTO cond)
    {
        var cutoff = DateTime.UtcNow.AddMonths(-cond.LookbackMonths);
        var orders = await _context.Set<Order>().AsNoTracking()
            .Where(o => o.DeletedAt == null && o.CustomerId != null && o.PurchaseDate >= cutoff)
            .Select(o => new { CustomerId = o.CustomerId!.Value, o.PurchaseDate })
            .ToListAsync();

        var counts = new Dictionary<int, int>();
        foreach (var o in orders)
        {
            var lunar = LunarCalendar.ToLunarDate(DateOnly.FromDateTime(o.PurchaseDate));
            var isMatch = cond.LunarDays.Any(target => CircularDayDistance(lunar.Day, target) <= cond.WindowDays);
            if (isMatch)
            {
                counts[o.CustomerId] = counts.GetValueOrDefault(o.CustomerId) + 1;
            }
        }

        return counts.Where(kv => kv.Value >= cond.MinOccurrences).Select(kv => kv.Key).ToHashSet();
    }

    private async Task<HashSet<int>> EvaluateBusinessCustomerAsync()
    {
        var ids = await _context.Set<Customer>().AsNoTracking()
            .Where(c => c.DeletedAt == null && c.IsBusinessCustomer)
            .Select(c => c.Id)
            .ToListAsync();
        return ids.ToHashSet();
    }

    private async Task<HashSet<int>> EvaluateTotalRevenueAsync(TotalRevenueConditionDTO cond)
    {
        var ids = await _context.Set<Customer>().AsNoTracking()
            .Where(c => c.DeletedAt == null && c.TotalRevenue >= cond.MinRevenue)
            .Select(c => c.Id)
            .ToListAsync();
        return ids.ToHashSet();
    }

    private async Task<HashSet<int>> EvaluateTotalOrderCountAsync(TotalOrderCountConditionDTO cond)
    {
        var query = _context.Set<Customer>().AsNoTracking()
            .Where(c => c.DeletedAt == null && c.TotalOrders >= cond.MinCount);
        if (cond.MaxCount.HasValue)
            query = query.Where(c => c.TotalOrders <= cond.MaxCount.Value);

        var ids = await query.Select(c => c.Id).ToListAsync();
        return ids.ToHashSet();
    }

    private async Task<HashSet<int>> EvaluateDaysSinceLastOrderAsync(DaysSinceLastOrderConditionDTO cond)
    {
        var query = _context.Set<Customer>().AsNoTracking()
            .Where(c => c.DeletedAt == null && c.LastOrderAt != null);

        var minCutoff = DateTime.UtcNow.AddDays(-cond.MinDays);
        query = query.Where(c => c.LastOrderAt <= minCutoff);

        if (cond.MaxDays.HasValue)
        {
            var maxCutoff = DateTime.UtcNow.AddDays(-cond.MaxDays.Value);
            query = query.Where(c => c.LastOrderAt >= maxCutoff);
        }

        var ids = await query.Select(c => c.Id).ToListAsync();
        return ids.ToHashSet();
    }

    private async Task<HashSet<int>> EvaluateDaysSinceFirstOrderAsync(DaysSinceFirstOrderConditionDTO cond)
    {
        var cutoff = DateTime.UtcNow.AddDays(-cond.MaxDays);
        var ids = await _context.Set<Order>().AsNoTracking()
            .Where(o => o.DeletedAt == null && o.CustomerId != null)
            .GroupBy(o => o.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, FirstOrder = g.Min(o => o.PurchaseDate) })
            .Where(x => x.FirstOrder >= cutoff)
            .Select(x => x.CustomerId)
            .ToListAsync();
        return ids.ToHashSet();
    }

    private static int CircularDayDistance(int a, int b)
    {
        var diff = Math.Abs(a - b);
        return Math.Min(diff, 30 - diff);
    }

    private IQueryable<PersonaTagAssignmentDTO> BuildAssignmentQuery(System.Linq.Expressions.Expression<Func<PersonaTagAssignment, bool>> predicate)
    {
        return _context.Set<PersonaTagAssignment>()
            .AsNoTracking()
            .Where(a => a.IsActive)
            .Where(predicate)
            .Join(_context.Set<PersonaTag>(), a => a.TagId, t => t.Id, (a, t) => new { a, t })
            .GroupJoin(_context.Set<User>(), x => x.a.AssignedBy, u => u.Id, (x, users) => new { x.a, x.t, Users = users })
            .SelectMany(x => x.Users.DefaultIfEmpty(), (x, u) => new PersonaTagAssignmentDTO
            {
                Id = x.a.Id,
                CustomerId = x.a.CustomerId,
                TagId = x.t.Id,
                TagName = x.t.Name,
                TagColor = x.t.Color,
                Source = x.a.Source,
                Note = x.a.Note,
                AssignedByName = u != null ? u.Name : null,
                AssignedAt = x.a.AssignedAt,
            });
    }

    private async Task<string> GenerateUniqueCodeAsync(string name)
    {
        var baseCode = Slugify(name);
        if (string.IsNullOrEmpty(baseCode)) baseCode = "tag";

        var candidate = baseCode;
        for (var n = 2; await _context.Set<PersonaTag>().AnyAsync(t => t.Code == candidate); n++)
        {
            candidate = $"{baseCode}_{n}";
        }
        return candidate;
    }

    private static string Slugify(string input)
    {
        var normalized = input.Trim().Replace('đ', 'd').Replace('Đ', 'D').Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var ch in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (category != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(ch);
            }
        }

        var ascii = sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
        var result = new StringBuilder();
        var lastWasUnderscore = false;
        foreach (var ch in ascii)
        {
            if (ch >= 'a' && ch <= 'z' || ch >= '0' && ch <= '9')
            {
                result.Append(ch);
                lastWasUnderscore = false;
            }
            else if (!lastWasUnderscore && result.Length > 0)
            {
                result.Append('_');
                lastWasUnderscore = true;
            }
        }

        return result.ToString().Trim('_');
    }
}
