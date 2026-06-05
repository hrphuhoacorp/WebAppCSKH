using System.Text.Json;
using Npgsql;
using Dapper;
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
}

public class ActivityService : IActivityService
{
    private readonly string _connectionString;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ActivityService(IConfiguration configuration, IHttpContextAccessor httpContextAccessor)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        _httpContextAccessor = httpContextAccessor;
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
}
