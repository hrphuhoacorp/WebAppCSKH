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
