using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using WebAppInfractor.Data;
using WebAppInfractor.Models;
using WebAppInfractor.Models.Persona;

public interface IPersonaCareService
{
    Task<PagedResult<PersonaInteractionDTO>> GetInteractionsAsync(int? customerId, string? type, int page, int pageSize);
    Task<PersonaInteractionDTO> CreateInteractionAsync(int userId, CreatePersonaInteractionDTO dto);
    Task<PersonaInteractionDTO> UpdateInteractionAsync(int userId, int id, UpdatePersonaInteractionDTO dto);
    Task DeleteInteractionAsync(int userId, int id);
    Task<List<PersonaCustomerSampleDTO>> SearchCustomersAsync(string? search);

    Task<List<PersonaCareScheduleDTO>> GetSchedulesAsync();
    Task<PersonaCareScheduleDTO> CreateScheduleAsync(int userId, CreatePersonaCareScheduleDTO dto);
    Task<PersonaCareScheduleDTO> UpdateScheduleAsync(int userId, int id, UpdatePersonaCareScheduleDTO dto);
    Task DeleteScheduleAsync(int userId, int id);
    Task<List<PersonaReminderDTO>> GetRemindersAsync(int daysAhead);
    Task<PersonaOverviewDTO> GetOverviewAsync();
    Task<PersonaDashboardDTO> GetDashboardAsync();
    Task<PersonaRetentionDTO> GetRetentionStatsAsync();
}

public class PersonaCareService : IPersonaCareService
{
    private static readonly HashSet<string> ValidTypes = new() { "note", "call", "complaint", "care_action" };
    private static readonly HashSet<string> ValidChannels = new() { "phone", "zalo", "email", "in_person", "other" };

    private readonly MemBerContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IActivityService _auditLogService;

    public PersonaCareService(MemBerContext context, IUnitOfWork unitOfWork, IActivityService auditLogService)
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _auditLogService = auditLogService;
    }

    public async Task<PagedResult<PersonaInteractionDTO>> GetInteractionsAsync(int? customerId, string? type, int page, int pageSize)
    {
        var query = _context.Set<PersonaCustomerInteraction>().AsNoTracking().Where(i => i.DeletedAt == null);
        if (customerId.HasValue) query = query.Where(i => i.CustomerId == customerId.Value);
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(i => i.Type == type);

        var totalItems = await query.CountAsync();

        var items = await query
            .OrderByDescending(i => i.OccurredAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(_context.Set<Customer>(), i => i.CustomerId, c => c.Id, (i, c) => new { i, c })
            .GroupJoin(_context.Set<User>(), x => x.i.CreatedBy, u => u.Id, (x, users) => new { x.i, x.c, Users = users })
            .SelectMany(x => x.Users.DefaultIfEmpty(), (x, u) => new PersonaInteractionDTO
            {
                Id = x.i.Id,
                CustomerId = x.i.CustomerId,
                CustomerName = x.c.Name,
                CustomerCode = x.c.CustomerCode,
                Type = x.i.Type,
                Channel = x.i.Channel,
                Content = x.i.Content,
                ComplaintStatus = x.i.ComplaintStatus,
                OccurredAt = x.i.OccurredAt,
                CreatedByName = u != null ? u.Name : "",
                CreatedAt = x.i.CreatedAt,
                UpdatedAt = x.i.UpdatedAt,
            })
            .ToListAsync();

        return new PagedResult<PersonaInteractionDTO> { TotalItems = totalItems, Page = page, PageSize = pageSize, Items = items };
    }

    public async Task<PersonaInteractionDTO> CreateInteractionAsync(int userId, CreatePersonaInteractionDTO dto)
    {
        ValidateInteractionInput(dto.Type, dto.Content, dto.Channel);

        var customerExists = await _context.Set<Customer>().AnyAsync(c => c.Id == dto.CustomerId && c.DeletedAt == null);
        if (!customerExists)
            throw new NotFoundException("Không tìm thấy khách hàng");

        var interaction = new PersonaCustomerInteraction
        {
            CustomerId = dto.CustomerId,
            Type = dto.Type,
            Channel = string.IsNullOrWhiteSpace(dto.Channel) ? null : dto.Channel,
            Content = dto.Content.Trim(),
            ComplaintStatus = dto.Type == "complaint" ? (dto.ComplaintStatus ?? "open") : null,
            OccurredAt = dto.OccurredAt,
            CreatedBy = userId,
        };
        _context.Set<PersonaCustomerInteraction>().Add(interaction);
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "CREATE_PERSONA_INTERACTION", "persona_customer_interactions", interaction.Id, null,
            new { dto.CustomerId, dto.Type, dto.Content });

        return await BuildInteractionDtoAsync(interaction.Id);
    }

    public async Task<PersonaInteractionDTO> UpdateInteractionAsync(int userId, int id, UpdatePersonaInteractionDTO dto)
    {
        ValidateInteractionInput(dto.Type, dto.Content, dto.Channel);

        var interaction = await _context.Set<PersonaCustomerInteraction>().FirstOrDefaultAsync(i => i.Id == id && i.DeletedAt == null);
        if (interaction == null)
            throw new NotFoundException("Không tìm thấy lịch sử chăm sóc");

        var oldData = new { interaction.Type, interaction.Content, interaction.ComplaintStatus };

        interaction.Type = dto.Type;
        interaction.Channel = string.IsNullOrWhiteSpace(dto.Channel) ? null : dto.Channel;
        interaction.Content = dto.Content.Trim();
        interaction.ComplaintStatus = dto.Type == "complaint" ? (dto.ComplaintStatus ?? interaction.ComplaintStatus ?? "open") : null;
        interaction.OccurredAt = dto.OccurredAt;
        interaction.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "UPDATE_PERSONA_INTERACTION", "persona_customer_interactions", id, oldData,
            new { interaction.Type, interaction.Content, interaction.ComplaintStatus });

        return await BuildInteractionDtoAsync(id);
    }

    public async Task DeleteInteractionAsync(int userId, int id)
    {
        var interaction = await _context.Set<PersonaCustomerInteraction>().FirstOrDefaultAsync(i => i.Id == id && i.DeletedAt == null);
        if (interaction == null)
            throw new NotFoundException("Không tìm thấy lịch sử chăm sóc");

        interaction.DeletedAt = DateTime.UtcNow.AddHours(7);
        interaction.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "DELETE_PERSONA_INTERACTION", "persona_customer_interactions", id, null, null);
    }

    public async Task<List<PersonaCustomerSampleDTO>> SearchCustomersAsync(string? search)
    {
        var query = _context.Set<Customer>().AsNoTracking().Where(c => c.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.Trim().ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(kw)
                || c.CustomerCode.ToLower().Contains(kw)
                || (c.Phone != null && c.Phone.ToLower().Contains(kw)));
        }

        return await query
            .OrderBy(c => c.Name)
            .Take(20)
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

    private async Task<PersonaInteractionDTO> BuildInteractionDtoAsync(int id)
    {
        var result = await _context.Set<PersonaCustomerInteraction>().AsNoTracking()
            .Where(i => i.Id == id)
            .Join(_context.Set<Customer>(), i => i.CustomerId, c => c.Id, (i, c) => new { i, c })
            .GroupJoin(_context.Set<User>(), x => x.i.CreatedBy, u => u.Id, (x, users) => new { x.i, x.c, Users = users })
            .SelectMany(x => x.Users.DefaultIfEmpty(), (x, u) => new PersonaInteractionDTO
            {
                Id = x.i.Id,
                CustomerId = x.i.CustomerId,
                CustomerName = x.c.Name,
                CustomerCode = x.c.CustomerCode,
                Type = x.i.Type,
                Channel = x.i.Channel,
                Content = x.i.Content,
                ComplaintStatus = x.i.ComplaintStatus,
                OccurredAt = x.i.OccurredAt,
                CreatedByName = u != null ? u.Name : "",
                CreatedAt = x.i.CreatedAt,
                UpdatedAt = x.i.UpdatedAt,
            })
            .FirstOrDefaultAsync();

        return result ?? throw new NotFoundException("Không tìm thấy lịch sử chăm sóc");
    }

    private static void ValidateInteractionInput(string type, string content, string? channel)
    {
        if (!ValidTypes.Contains(type))
            throw new BadRequestException("Loại tương tác không hợp lệ");
        if (string.IsNullOrWhiteSpace(content))
            throw new BadRequestException("Nội dung không được để trống");
        if (!string.IsNullOrWhiteSpace(channel) && !ValidChannels.Contains(channel))
            throw new BadRequestException("Kênh liên hệ không hợp lệ");
    }

    private static readonly HashSet<string> ValidOccasionTypes = new() { "lunar_recurring", "solar_recurring", "customer_birthday" };
    private static readonly JsonSerializerOptions ScheduleJsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private class OccasionConfigData
    {
        public int? LunarDay { get; set; }
        public int? LunarMonth { get; set; }
        public int? SolarMonth { get; set; }
        public int? SolarDay { get; set; }
    }

    public async Task<List<PersonaCareScheduleDTO>> GetSchedulesAsync()
    {
        var tagNames = await _context.Set<PersonaTag>().AsNoTracking()
            .Where(t => t.DeletedAt == null)
            .ToDictionaryAsync(t => t.Id, t => t.Name);

        var schedules = await _context.Set<PersonaCareSchedule>().AsNoTracking()
            .Where(s => s.DeletedAt == null)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return schedules.Select(s => ToScheduleDto(s, tagNames)).ToList();
    }

    public async Task<PersonaCareScheduleDTO> CreateScheduleAsync(int userId, CreatePersonaCareScheduleDTO dto)
    {
        ValidateScheduleInput(dto.OccasionType, dto.LunarDay, dto.LunarMonth, dto.SolarMonth, dto.SolarDay, dto.LeadDays);
        await EnsureTagExistsIfSetAsync(dto.TagId);

        var config = new OccasionConfigData { LunarDay = dto.LunarDay, LunarMonth = dto.LunarMonth, SolarMonth = dto.SolarMonth, SolarDay = dto.SolarDay };
        var schedule = new PersonaCareSchedule
        {
            TagId = dto.TagId,
            Name = dto.Name.Trim(),
            OccasionType = dto.OccasionType,
            OccasionConfig = JsonSerializer.Serialize(config, ScheduleJsonOptions),
            LeadDays = dto.LeadDays,
            CreatedBy = userId,
        };
        _context.Set<PersonaCareSchedule>().Add(schedule);
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "CREATE_PERSONA_CARE_SCHEDULE", "persona_care_schedules", schedule.Id, null,
            new { dto.Name, dto.OccasionType });

        var tagNames = await _context.Set<PersonaTag>().AsNoTracking().Where(t => t.DeletedAt == null).ToDictionaryAsync(t => t.Id, t => t.Name);
        return ToScheduleDto(schedule, tagNames);
    }

    public async Task<PersonaCareScheduleDTO> UpdateScheduleAsync(int userId, int id, UpdatePersonaCareScheduleDTO dto)
    {
        ValidateScheduleInput(dto.OccasionType, dto.LunarDay, dto.LunarMonth, dto.SolarMonth, dto.SolarDay, dto.LeadDays);
        await EnsureTagExistsIfSetAsync(dto.TagId);

        var schedule = await _context.Set<PersonaCareSchedule>().FirstOrDefaultAsync(s => s.Id == id && s.DeletedAt == null);
        if (schedule == null)
            throw new NotFoundException("Không tìm thấy cấu hình nhắc lịch");

        var config = new OccasionConfigData { LunarDay = dto.LunarDay, LunarMonth = dto.LunarMonth, SolarMonth = dto.SolarMonth, SolarDay = dto.SolarDay };
        schedule.TagId = dto.TagId;
        schedule.Name = dto.Name.Trim();
        schedule.OccasionType = dto.OccasionType;
        schedule.OccasionConfig = JsonSerializer.Serialize(config, ScheduleJsonOptions);
        schedule.LeadDays = dto.LeadDays;
        schedule.IsActive = dto.IsActive;
        schedule.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "UPDATE_PERSONA_CARE_SCHEDULE", "persona_care_schedules", id, null,
            new { dto.Name, dto.OccasionType, dto.IsActive });

        var tagNames = await _context.Set<PersonaTag>().AsNoTracking().Where(t => t.DeletedAt == null).ToDictionaryAsync(t => t.Id, t => t.Name);
        return ToScheduleDto(schedule, tagNames);
    }

    public async Task DeleteScheduleAsync(int userId, int id)
    {
        var schedule = await _context.Set<PersonaCareSchedule>().FirstOrDefaultAsync(s => s.Id == id && s.DeletedAt == null);
        if (schedule == null)
            throw new NotFoundException("Không tìm thấy cấu hình nhắc lịch");

        schedule.DeletedAt = DateTime.UtcNow.AddHours(7);
        schedule.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        await _auditLogService.SaveLogAsync(userId, null, "DELETE_PERSONA_CARE_SCHEDULE", "persona_care_schedules", id, null, null);
    }

    public async Task<List<PersonaReminderDTO>> GetRemindersAsync(int daysAhead)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

        var schedules = await _context.Set<PersonaCareSchedule>().AsNoTracking()
            .Where(s => s.IsActive && s.DeletedAt == null)
            .ToListAsync();

        var reminders = new List<PersonaReminderDTO>();

        foreach (var schedule in schedules)
        {
            var config = JsonSerializer.Deserialize<OccasionConfigData>(schedule.OccasionConfig, ScheduleJsonOptions) ?? new OccasionConfigData();

            if (schedule.OccasionType == "customer_birthday")
            {
                var customersQuery = _context.Set<Customer>().AsNoTracking().Where(c => c.DeletedAt == null && c.DayOfBirth != null);
                if (schedule.TagId.HasValue)
                {
                    var taggedIds = await _context.Set<PersonaTagAssignment>().AsNoTracking()
                        .Where(a => a.TagId == schedule.TagId.Value && a.IsActive)
                        .Select(a => a.CustomerId)
                        .ToListAsync();
                    customersQuery = customersQuery.Where(c => taggedIds.Contains(c.Id));
                }

                var customers = await customersQuery
                    .Select(c => new { c.Id, c.CustomerCode, c.Name, c.Phone, DayOfBirth = c.DayOfBirth!.Value })
                    .ToListAsync();

                foreach (var c in customers)
                {
                    var occasionDate = NextAnniversary(c.DayOfBirth, today);
                    var daysAway = occasionDate.DayNumber - today.DayNumber;
                    if (daysAway < 0 || daysAway > schedule.LeadDays) continue;

                    reminders.Add(new PersonaReminderDTO
                    {
                        ScheduleId = schedule.Id,
                        OccasionName = schedule.Name,
                        CustomerId = c.Id,
                        CustomerCode = c.CustomerCode,
                        CustomerName = c.Name,
                        Phone = c.Phone,
                        OccasionDate = occasionDate,
                        DaysAway = daysAway,
                    });
                }
            }
            else if (schedule.OccasionType == "lunar_recurring" && config.LunarDay.HasValue)
            {
                var occasionDate = LunarCalendar.FindNextOccurrence(today, config.LunarDay.Value, config.LunarMonth);
                if (occasionDate == null) continue;
                var daysAway = occasionDate.Value.DayNumber - today.DayNumber;
                if (daysAway < 0 || daysAway > schedule.LeadDays) continue;

                await AddScheduleRemindersAsync(reminders, schedule, occasionDate.Value, daysAway);
            }
            else if (schedule.OccasionType == "solar_recurring" && config.SolarMonth.HasValue && config.SolarDay.HasValue)
            {
                var occasionDate = NextSolarOccurrence(config.SolarMonth.Value, config.SolarDay.Value, today);
                var daysAway = occasionDate.DayNumber - today.DayNumber;
                if (daysAway < 0 || daysAway > schedule.LeadDays) continue;

                await AddScheduleRemindersAsync(reminders, schedule, occasionDate, daysAway);
            }
        }

        // Lọc bỏ dịp quá xa so với daysAhead — LeadDays quyết định khi nào BẮT ĐẦU hiện,
        // daysAhead là giới hạn tầm nhìn tổng thể của FE.
        reminders = reminders.Where(r => r.DaysAway <= daysAhead).ToList();

        // Đánh dấu "đã liên hệ" nếu có ghi nhận care_action trong vòng ~30 ngày trước dịp.
        var customerIds = reminders.Where(r => r.CustomerId.HasValue).Select(r => r.CustomerId!.Value).Distinct().ToList();
        if (customerIds.Count > 0)
        {
            var recentCareActions = await _context.Set<PersonaCustomerInteraction>().AsNoTracking()
                .Where(i => i.DeletedAt == null && i.Type == "care_action" && customerIds.Contains(i.CustomerId)
                    && i.OccurredAt >= DateTime.UtcNow.AddDays(-60))
                .Select(i => new { i.CustomerId, i.OccurredAt })
                .ToListAsync();

            foreach (var r in reminders.Where(r => r.CustomerId.HasValue))
            {
                var windowStart = r.OccasionDate.AddDays(-30);
                r.AlreadyContacted = recentCareActions.Any(a => a.CustomerId == r.CustomerId
                    && DateOnly.FromDateTime(a.OccurredAt) >= windowStart
                    && DateOnly.FromDateTime(a.OccurredAt) <= r.OccasionDate);
            }
        }

        return reminders.OrderBy(r => r.DaysAway).ToList();
    }

    public async Task<PersonaOverviewDTO> GetOverviewAsync()
    {
        var totalCustomers = await _context.Set<Customer>().CountAsync(c => c.DeletedAt == null);

        var taggedCustomerCount = await _context.Set<PersonaTagAssignment>().AsNoTracking()
            .Where(a => a.IsActive)
            .Select(a => a.CustomerId)
            .Distinct()
            .CountAsync();

        var tagDistribution = await _context.Set<PersonaTagAssignment>().AsNoTracking()
            .Where(a => a.IsActive)
            .Join(_context.Set<PersonaTag>(), a => a.TagId, t => t.Id, (a, t) => new { t.Name, t.Color })
            .GroupBy(x => new { x.Name, x.Color })
            .Select(g => new PersonaTagDistributionDTO { TagName = g.Key.Name, TagColor = g.Key.Color, Count = g.Count() })
            .OrderByDescending(d => d.Count)
            .ToListAsync();

        var openComplaints = await _context.Set<PersonaCustomerInteraction>().AsNoTracking()
            .CountAsync(i => i.DeletedAt == null && i.Type == "complaint" && i.ComplaintStatus != "resolved");

        var upcomingReminders = await GetRemindersAsync(7);

        return new PersonaOverviewDTO
        {
            TotalCustomers = totalCustomers,
            TaggedCustomers = taggedCustomerCount,
            UntaggedCustomers = totalCustomers - taggedCustomerCount,
            OpenComplaints = openComplaints,
            UpcomingReminders7Days = upcomingReminders.Count,
            TagDistribution = tagDistribution,
        };
    }

    // Thống kê toàn diện cho Tab Tổng quan — không riêng khách doanh nghiệp, bao quát tất cả
    // chân dung. Doanh thu dùng Customer.TotalRevenue (tổng lũy kế đã có sẵn, nhất quán với
    // các DTO khác trong module) — 1 khách giữ nhiều tag thì doanh thu của họ CỘNG VÀO MỖI tag
    // (có chủ đích: đây là view "mỗi chân dung đóng góp bao nhiêu", không phải phân bổ độc quyền).
    public async Task<PersonaDashboardDTO> GetDashboardAsync()
    {
        var now = DateTime.UtcNow.AddHours(7);
        var cutoff = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11);
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var totalCustomers = await _context.Set<Customer>().CountAsync(c => c.DeletedAt == null);

        var distinctAssignments = _context.Set<PersonaTagAssignment>().AsNoTracking()
            .Where(a => a.IsActive)
            .Select(a => new { a.TagId, a.CustomerId })
            .Distinct();

        var taggedCustomerIds = distinctAssignments.Select(a => a.CustomerId).Distinct();
        var taggedCustomerCount = await taggedCustomerIds.CountAsync();

        var activeCustomers = _context.Set<Customer>().AsNoTracking().Where(c => c.DeletedAt == null);

        var totalRevenue = await activeCustomers.SumAsync(c => c.TotalRevenue);
        var taggedRevenue = await activeCustomers.Where(c => taggedCustomerIds.Contains(c.Id)).SumAsync(c => c.TotalRevenue);
        var businessCustomers = await activeCustomers.CountAsync(c => c.IsBusinessCustomer);
        var businessRevenue = await activeCustomers.Where(c => c.IsBusinessCustomer).SumAsync(c => c.TotalRevenue);

        var openComplaints = await _context.Set<PersonaCustomerInteraction>().AsNoTracking()
            .CountAsync(i => i.DeletedAt == null && i.Type == "complaint" && i.ComplaintStatus != "resolved");
        var upcomingReminders = await GetRemindersAsync(7);

        var newTaggedThisMonth = await _context.Set<PersonaTagAssignment>().AsNoTracking()
            .Where(a => a.IsActive && a.AssignedAt >= monthStart)
            .Select(a => a.CustomerId)
            .Distinct()
            .CountAsync();

        // ── Doanh thu theo từng chân dung ──
        var tagRevenueRaw = await distinctAssignments
            .Join(activeCustomers, a => a.CustomerId, c => c.Id, (a, c) => new { a.TagId, c.TotalRevenue })
            .GroupBy(x => x.TagId)
            .Select(g => new { TagId = g.Key, CustomerCount = g.Count(), Revenue = g.Sum(x => x.TotalRevenue) })
            .ToListAsync();

        var tagMeta = await _context.Set<PersonaTag>().AsNoTracking()
            .Where(t => t.DeletedAt == null)
            .ToDictionaryAsync(t => t.Id, t => new { t.Name, t.Color });

        var tagStats = tagRevenueRaw
            .Where(x => tagMeta.ContainsKey(x.TagId))
            .Select(x => new PersonaTagStatsDTO
            {
                TagId = x.TagId,
                TagName = tagMeta[x.TagId].Name,
                TagColor = tagMeta[x.TagId].Color,
                CustomerCount = x.CustomerCount,
                TotalRevenue = x.Revenue,
                AvgRevenuePerCustomer = x.CustomerCount > 0 ? x.Revenue / x.CustomerCount : 0,
                RevenueSharePercent = totalRevenue > 0 ? (double)(x.Revenue / totalRevenue) * 100 : 0,
            })
            .OrderByDescending(t => t.TotalRevenue)
            .ToList();

        // ── Doanh thu theo tháng (12 tháng gần nhất, toàn hệ thống) ──
        var monthlyRaw = await _context.Set<Order>().AsNoTracking()
            .Where(o => o.DeletedAt == null && o.PurchaseDate >= cutoff)
            .GroupBy(o => new { o.PurchaseDate.Year, o.PurchaseDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(o => o.Revenue) })
            .ToListAsync();

        var months = Enumerable.Range(0, 12)
            .Select(i => cutoff.AddMonths(i))
            .Select(d => (d.Year, d.Month))
            .ToList();

        var monthlyRevenue = months.Select(m =>
        {
            var match = monthlyRaw.FirstOrDefault(x => x.Year == m.Year && x.Month == m.Month);
            return new PersonaMonthlyRevenueDTO { Month = $"{m.Year:0000}-{m.Month:00}", TotalRevenue = match?.Revenue ?? 0 };
        }).ToList();

        // ── Doanh thu theo tháng cho top 5 chân dung giá trị nhất ──
        var top5TagIds = tagStats.Take(5).Select(t => t.TagId).ToList();
        var tagMonthlyRaw = top5TagIds.Count == 0
            ? new List<(int TagId, int Year, int Month, decimal Revenue)>()
            : (await _context.Set<Order>().AsNoTracking()
                .Where(o => o.DeletedAt == null && o.PurchaseDate >= cutoff && o.CustomerId != null)
                .Join(distinctAssignments.Where(a => top5TagIds.Contains(a.TagId)), o => o.CustomerId!.Value, a => a.CustomerId,
                    (o, a) => new { a.TagId, o.PurchaseDate.Year, o.PurchaseDate.Month, o.Revenue })
                .GroupBy(x => new { x.TagId, x.Year, x.Month })
                .Select(g => new { g.Key.TagId, g.Key.Year, g.Key.Month, Revenue = g.Sum(x => x.Revenue) })
                .ToListAsync())
                .Select(x => (x.TagId, x.Year, x.Month, x.Revenue)).ToList();

        var topTagMonthlyRevenue = top5TagIds.Select(tagId => new PersonaTagMonthlySeriesDTO
        {
            TagId = tagId,
            TagName = tagMeta[tagId].Name,
            TagColor = tagMeta[tagId].Color,
            Points = months.Select(m =>
            {
                var match = tagMonthlyRaw.FirstOrDefault(x => x.TagId == tagId && x.Year == m.Year && x.Month == m.Month);
                return new PersonaMonthlyRevenueDTO { Month = $"{m.Year:0000}-{m.Month:00}", TotalRevenue = match.Revenue };
            }).ToList(),
        }).ToList();

        // ── Top 20 khách hàng theo doanh thu ──
        var topCustomers = await BuildTopCustomerListAsync(activeCustomers.OrderByDescending(c => c.TotalRevenue), 20);

        // ── Top 10 nhóm hàng theo doanh thu (toàn thời gian) ──
        var topCategories = await _context.Set<OrderItem>().AsNoTracking()
            .Where(oi => oi.Order.DeletedAt == null && oi.Category != null && oi.Category != "")
            .GroupBy(oi => oi.Category)
            .Select(g => new PersonaCategoryStatsDTO { Category = g.Key!, TotalRevenue = g.Sum(oi => oi.Revenue) })
            .OrderByDescending(x => x.TotalRevenue)
            .Take(10)
            .ToListAsync();

        return new PersonaDashboardDTO
        {
            TotalCustomers = totalCustomers,
            TaggedCustomers = taggedCustomerCount,
            UntaggedCustomers = totalCustomers - taggedCustomerCount,
            TotalRevenue = totalRevenue,
            TaggedRevenue = taggedRevenue,
            BusinessCustomers = businessCustomers,
            BusinessRevenue = businessRevenue,
            OpenComplaints = openComplaints,
            UpcomingReminders7Days = upcomingReminders.Count,
            NewTaggedCustomersThisMonth = newTaggedThisMonth,
            TagStats = tagStats,
            MonthlyRevenue = monthlyRevenue,
            TopTagMonthlyRevenue = topTagMonthlyRevenue,
            TopCustomers = topCustomers,
            TopCategories = topCategories,
        };
    }

    private async Task<List<PersonaTopCustomerDTO>> BuildTopCustomerListAsync(IQueryable<Customer> orderedQuery, int take)
    {
        var raw = await orderedQuery
            .Take(take)
            .Select(c => new { c.Id, c.CustomerCode, c.Name, c.Phone, c.TotalRevenue, c.TotalOrders, c.IsBusinessCustomer })
            .ToListAsync();
        var ids = raw.Select(c => c.Id).ToList();

        var tagRows = await _context.Set<PersonaTagAssignment>().AsNoTracking()
            .Where(a => a.IsActive && ids.Contains(a.CustomerId))
            .Join(_context.Set<PersonaTag>(), a => a.TagId, t => t.Id, (a, t) => new { a.CustomerId, t.Name })
            .ToListAsync();
        var tagsByCustomer = tagRows.GroupBy(x => x.CustomerId).ToDictionary(g => g.Key, g => g.Select(x => x.Name).Distinct().ToList());

        return raw.Select(c => new PersonaTopCustomerDTO
        {
            CustomerId = c.Id,
            CustomerCode = c.CustomerCode,
            Name = c.Name,
            Phone = c.Phone,
            TotalRevenue = c.TotalRevenue,
            TotalOrders = c.TotalOrders,
            IsBusinessCustomer = c.IsBusinessCustomer,
            TagNames = tagsByCustomer.TryGetValue(c.Id, out var names) ? names : new List<string>(),
        }).ToList();
    }

    // Gộp từ trang "Tỉ Lệ Quay Lại" (CustomerService.GetReturnRateStatsAsync, đã retire) — viết
    // lại theo lối SQL-side: chỉ vật chất hoá (customerId, ngày mua) cho khách có ≥2 đơn thay vì
    // load NGUYÊN bảng orders của MỌI khách như bản cũ, và group-by tháng ở SQL trước khi phân
    // loại mới/quay lại trong bộ nhớ trên tập đã rút gọn (mỗi khách 1 dòng/tháng có phát sinh).
    public async Task<PersonaRetentionDTO> GetRetentionStatsAsync()
    {
        var now = DateTime.UtcNow.AddHours(7);
        var cutoff = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11);
        var activeCustomers = _context.Set<Customer>().AsNoTracking().Where(c => c.DeletedAt == null);

        // ── Tần suất mua (lũy kế toàn thời gian) ──
        var frequency = new PersonaFrequencyDistributionDTO
        {
            Once = await activeCustomers.CountAsync(c => c.TotalOrders == 1),
            TwoToThree = await activeCustomers.CountAsync(c => c.TotalOrders >= 2 && c.TotalOrders <= 3),
            FourToTen = await activeCustomers.CountAsync(c => c.TotalOrders >= 4 && c.TotalOrders <= 10),
            MoreThanTen = await activeCustomers.CountAsync(c => c.TotalOrders > 10),
        };

        // ── Mức độ "im ắng" theo LastOrderAt ──
        var d30 = now.AddDays(-30);
        var d60 = now.AddDays(-60);
        var d90 = now.AddDays(-90);
        var dormancy = new PersonaDormancySegmentsDTO
        {
            Active30 = await activeCustomers.CountAsync(c => c.LastOrderAt != null && c.LastOrderAt >= d30),
            Dormant30To60 = await activeCustomers.CountAsync(c => c.LastOrderAt != null && c.LastOrderAt < d30 && c.LastOrderAt >= d60),
            Dormant60To90 = await activeCustomers.CountAsync(c => c.LastOrderAt != null && c.LastOrderAt < d60 && c.LastOrderAt >= d90),
            Dormant90Plus = await activeCustomers.CountAsync(c => c.LastOrderAt != null && c.LastOrderAt < d90),
            NeverBought = await activeCustomers.CountAsync(c => c.LastOrderAt == null),
        };

        var d180 = now.AddDays(-180);
        var atRiskCount = await activeCustomers.CountAsync(c => c.TotalOrders >= 2 && c.LastOrderAt != null && c.LastOrderAt < d60 && c.LastOrderAt >= d180);

        // ── Xu hướng khách mới/quay lại theo tháng ──
        var firstOrderByCustomer = await _context.Set<Order>().AsNoTracking()
            .Where(o => o.DeletedAt == null && o.CustomerId != null)
            .GroupBy(o => o.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, FirstOrderDate = g.Min(o => o.PurchaseDate) })
            .ToListAsync();
        var firstOrderMonthByCustomer = firstOrderByCustomer.ToDictionary(x => x.CustomerId, x => new DateTime(x.FirstOrderDate.Year, x.FirstOrderDate.Month, 1));

        var monthlyOrdersRaw = await _context.Set<Order>().AsNoTracking()
            .Where(o => o.DeletedAt == null && o.CustomerId != null && o.PurchaseDate >= cutoff)
            .GroupBy(o => new { o.CustomerId, o.PurchaseDate.Year, o.PurchaseDate.Month })
            .Select(g => new { CustomerId = g.Key.CustomerId!.Value, g.Key.Year, g.Key.Month, Revenue = g.Sum(o => o.Revenue) })
            .ToListAsync();

        var months = Enumerable.Range(0, 12).Select(i => cutoff.AddMonths(i)).Select(d => (d.Year, d.Month)).ToList();

        var monthlyTrend = months.Select(m =>
        {
            var monthDate = new DateTime(m.Year, m.Month, 1);
            var rowsInMonth = monthlyOrdersRaw.Where(x => x.Year == m.Year && x.Month == m.Month).ToList();
            var newCustomers = 0;
            var returningCustomers = 0;
            decimal newRevenue = 0;
            decimal returningRevenue = 0;

            foreach (var r in rowsInMonth)
            {
                var isNew = firstOrderMonthByCustomer.TryGetValue(r.CustomerId, out var firstMonth) && firstMonth == monthDate;
                if (isNew) { newCustomers++; newRevenue += r.Revenue; }
                else { returningCustomers++; returningRevenue += r.Revenue; }
            }

            var totalActive = newCustomers + returningCustomers;
            return new PersonaRetentionMonthDTO
            {
                Month = $"{m.Year:0000}-{m.Month:00}",
                NewCustomers = newCustomers,
                ReturningCustomers = returningCustomers,
                ReturnRatePercent = totalActive > 0 ? (double)returningCustomers / totalActive * 100 : 0,
                NewRevenue = newRevenue,
                ReturningRevenue = returningRevenue,
            };
        }).ToList();

        var avgReturnRate = monthlyTrend.Count > 0 ? monthlyTrend.Average(m => m.ReturnRatePercent) : 0;

        // ── TB số ngày giữa các đơn / TB số ngày đến đơn thứ 2 (chỉ khách có ≥2 đơn) ──
        var repeatCustomerIds = await activeCustomers.Where(c => c.TotalOrders >= 2).Select(c => c.Id).ToListAsync();
        var avgDaysBetweenOrders = 0.0;
        var avgDaysToSecondPurchase = 0.0;

        if (repeatCustomerIds.Count > 0)
        {
            var repeatOrderDates = await _context.Set<Order>().AsNoTracking()
                .Where(o => o.DeletedAt == null && o.CustomerId != null && repeatCustomerIds.Contains(o.CustomerId.Value))
                .Select(o => new { CustomerId = o.CustomerId!.Value, o.PurchaseDate })
                .ToListAsync();

            var gaps = new List<double>();
            var toSecond = new List<double>();
            foreach (var g in repeatOrderDates.GroupBy(x => x.CustomerId))
            {
                var dates = g.Select(x => x.PurchaseDate).OrderBy(d => d).ToList();
                if (dates.Count >= 2)
                    toSecond.Add((dates[1] - dates[0]).TotalDays);
                for (var i = 1; i < dates.Count; i++)
                    gaps.Add((dates[i] - dates[i - 1]).TotalDays);
            }

            avgDaysBetweenOrders = gaps.Count > 0 ? gaps.Average() : 0;
            avgDaysToSecondPurchase = toSecond.Count > 0 ? toSecond.Average() : 0;
        }

        // ── Top 20 khách hàng thân thiết (theo số đơn) ──
        var topLoyalCustomers = await BuildTopCustomerListAsync(
            activeCustomers.Where(c => c.TotalOrders > 1).OrderByDescending(c => c.TotalOrders).ThenByDescending(c => c.TotalRevenue), 20);

        return new PersonaRetentionDTO
        {
            AvgReturnRatePercent = avgReturnRate,
            AvgDaysBetweenOrders = avgDaysBetweenOrders,
            AvgDaysToSecondPurchase = avgDaysToSecondPurchase,
            AtRiskCount = atRiskCount,
            MonthlyTrend = monthlyTrend,
            FrequencyDistribution = frequency,
            DormancySegments = dormancy,
            TopLoyalCustomers = topLoyalCustomers,
        };
    }

    private async Task AddScheduleRemindersAsync(List<PersonaReminderDTO> reminders, PersonaCareSchedule schedule, DateOnly occasionDate, int daysAway)
    {
        if (schedule.TagId.HasValue)
        {
            var taggedCustomers = await _context.Set<PersonaTagAssignment>().AsNoTracking()
                .Where(a => a.TagId == schedule.TagId.Value && a.IsActive)
                .Join(_context.Set<Customer>(), a => a.CustomerId, c => c.Id, (a, c) => new { c.Id, c.CustomerCode, c.Name, c.Phone })
                .ToListAsync();

            foreach (var c in taggedCustomers)
            {
                reminders.Add(new PersonaReminderDTO
                {
                    ScheduleId = schedule.Id,
                    OccasionName = schedule.Name,
                    CustomerId = c.Id,
                    CustomerCode = c.CustomerCode,
                    CustomerName = c.Name,
                    Phone = c.Phone,
                    OccasionDate = occasionDate,
                    DaysAway = daysAway,
                });
            }
        }
        else
        {
            reminders.Add(new PersonaReminderDTO
            {
                ScheduleId = schedule.Id,
                OccasionName = schedule.Name,
                CustomerId = null,
                CustomerCode = "",
                CustomerName = "(Toàn bộ khách hàng)",
                Phone = null,
                OccasionDate = occasionDate,
                DaysAway = daysAway,
            });
        }
    }

    private static DateOnly NextAnniversary(DateOnly original, DateOnly today)
    {
        DateOnly BuildFor(int y)
        {
            var day = original.Day;
            if (original.Month == 2 && original.Day == 29 && !DateTime.IsLeapYear(y)) day = 28;
            return new DateOnly(y, original.Month, day);
        }

        var candidate = BuildFor(today.Year);
        if (candidate < today) candidate = BuildFor(today.Year + 1);
        return candidate;
    }

    private static DateOnly NextSolarOccurrence(int month, int day, DateOnly today)
    {
        DateOnly BuildFor(int y)
        {
            // Ngày 29/2 rơi vào năm không nhuận thì lùi về 28/2 — cùng cách xử lý với sinh nhật.
            var d = month == 2 && day == 29 && !DateTime.IsLeapYear(y) ? 28 : day;
            return new DateOnly(y, month, d);
        }

        var candidate = BuildFor(today.Year);
        if (candidate < today) candidate = BuildFor(today.Year + 1);
        return candidate;
    }

    private async Task EnsureTagExistsIfSetAsync(int? tagId)
    {
        if (!tagId.HasValue) return;
        var exists = await _context.Set<PersonaTag>().AnyAsync(t => t.Id == tagId.Value && t.DeletedAt == null);
        if (!exists)
            throw new NotFoundException("Không tìm thấy tag");
    }

    private static PersonaCareScheduleDTO ToScheduleDto(PersonaCareSchedule s, Dictionary<int, string> tagNames)
    {
        var config = JsonSerializer.Deserialize<OccasionConfigData>(s.OccasionConfig, ScheduleJsonOptions) ?? new OccasionConfigData();
        return new PersonaCareScheduleDTO
        {
            Id = s.Id,
            TagId = s.TagId,
            TagName = s.TagId.HasValue && tagNames.TryGetValue(s.TagId.Value, out var n) ? n : null,
            Name = s.Name,
            OccasionType = s.OccasionType,
            LunarDay = config.LunarDay,
            LunarMonth = config.LunarMonth,
            SolarMonth = config.SolarMonth,
            SolarDay = config.SolarDay,
            LeadDays = s.LeadDays,
            IsActive = s.IsActive,
            CreatedAt = s.CreatedAt,
        };
    }

    private static void ValidateScheduleInput(string occasionType, int? lunarDay, int? lunarMonth, int? solarMonth, int? solarDay, int leadDays)
    {
        if (!ValidOccasionTypes.Contains(occasionType))
            throw new BadRequestException("Loại dịp không hợp lệ");
        if (leadDays < 0)
            throw new BadRequestException("Số ngày nhắc trước không được âm");

        if (occasionType == "lunar_recurring")
        {
            if (!lunarDay.HasValue || lunarDay < 1 || lunarDay > 30)
                throw new BadRequestException("Ngày âm lịch phải trong khoảng 1-30");
            if (lunarMonth.HasValue && (lunarMonth < 1 || lunarMonth > 12))
                throw new BadRequestException("Tháng âm lịch phải trong khoảng 1-12");
        }
        else if (occasionType == "solar_recurring")
        {
            if (!solarMonth.HasValue || solarMonth < 1 || solarMonth > 12)
                throw new BadRequestException("Tháng dương lịch phải trong khoảng 1-12");
            // Dùng 2024 (năm nhuận) làm mốc để vẫn cho phép chọn 29/2 — NextSolarOccurrence tự
            // lùi về 28/2 vào những năm không nhuận khi tính ngày thực tế.
            var maxDay = DateTime.DaysInMonth(2024, solarMonth.Value);
            if (!solarDay.HasValue || solarDay < 1 || solarDay > maxDay)
                throw new BadRequestException($"Ngày dương lịch không hợp lệ cho tháng đã chọn (tối đa {maxDay})");
        }
    }
}
