using System.Text.Json;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Npgsql;

public interface IActivityService
{
    Task SaveLogAsync(
        int? userId,
        string? staffCode,
        string action,
        string tableName,
        int? recordId,
        object? oldData = null,
        object? newData = null
    );
    Task<PagedResult<ActivityLogDTO>> GetAllActivityLog(ActivityFilter filter);
}

public class ActivityService : IActivityService
{
    private readonly string _connectionString;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IActivityLogRepository _activityLogRepository;

    public ActivityService(
        IConfiguration configuration,
        IHttpContextAccessor httpContextAccessor,
        IActivityLogRepository activityLogRepository
    )
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        _httpContextAccessor = httpContextAccessor;
        _activityLogRepository = activityLogRepository;
    }

    public async Task SaveLogAsync(
        int? userId,
        string? staffCode,
        string action,
        string tableName,
        int? recordId,
        object? oldData = null,
        object? newData = null
    )
    {
        var context = _httpContextAccessor.HttpContext;
        string? ipAddress = context?.Connection?.RemoteIpAddress?.ToString();
        string? userAgent = context?.Request?.Headers.UserAgent.ToString();

        // Serialize object thành JsonNode để lưu vào cột JSONB của Postgres
        var oldDataJson = oldData != null ? JsonSerializer.SerializeToNode(oldData) : null;
        var newDataJson = newData != null ? JsonSerializer.SerializeToNode(newData) : null;

        const string sql =
            @"
            INSERT INTO activity_logs (user_id, staff_code, action, table_name, record_id, old_data, new_data, ip_address, user_agent)
            VALUES (@UserId, @StaffCode, @Action, @TableName, @RecordId, @OldData::jsonb, @NewData::jsonb, @IpAddress, @UserAgent);";

        using var connection = new NpgsqlConnection(_connectionString);
        await connection.ExecuteAsync(
            sql,
            new
            {
                UserId = userId,
                StaffCode = staffCode,
                Action = action,
                TableName = tableName,
                RecordId = recordId,
                OldData = oldDataJson?.ToString(),
                NewData = newDataJson?.ToString(),
                IpAddress = ipAddress,
                UserAgent = userAgent,
            }
        );
    }

    public async Task<PagedResult<ActivityLogDTO>> GetAllActivityLog(ActivityFilter filter)
    {
        var query = _activityLogRepository.GetAll().Include(al => al.User).AsNoTracking();

        if (!string.IsNullOrEmpty(filter.Search))
        {
            query = query.Where(al =>
                (
                    al.User.Name != null && al.User.Name.ToLower().Contains(filter.Search.ToLower())
                    || al.User.StaffCode != null
                        && al.User.StaffCode.ToLower().Contains(filter.Search.ToLower())
                    || al.Action != null && al.Action.ToLower().Contains(filter.Search.ToLower())
                )
            );
        }

        if (filter.FromDate.HasValue && filter.ToDate.HasValue)
        {
            if (filter.FromDate.Value > DateTime.UtcNow || filter.ToDate.Value < DateTime.UtcNow)
            {
                throw new BadRequestException("Ngày Không Hợp Lệ");
            }
            if (filter.FromDate.Value > filter.ToDate.Value)
                throw new BadRequestException("Ngày Bắt Đầu phải nhỏ hơn Ngày Kết Thúc");
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(al => al.CreatedAt >= filter.FromDate.Value);
        }
        if (filter.ToDate.HasValue)
        {
            query = query.Where(al => al.CreatedAt <= filter.ToDate.Value);
        }

        var totalItems = await query.CountAsync();

        var activityLogs = await query
            .OrderByDescending(al => al.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(al => new ActivityLogDTO
            {
                Id = al.Id,
                UserId = al.UserId,
                StaffCode = al.User.StaffCode,
                Action = al.Action,
                TableName = al.TableName,
                RecordId = al.RecordId,
                OldData = al.OldData,
                NewData = al.NewData,
                IpAddress = al.IpAddress,
                UserAgent = al.UserAgent,
                CreatedAt = al.CreatedAt,
                Name = al.User.Name,
            })
            .ToListAsync();
        return new PagedResult<ActivityLogDTO>
        {
            Items = activityLogs,
            TotalItems = totalItems,
            Page = filter.Page,
            PageSize = filter.PageSize,
        };
    }
}
