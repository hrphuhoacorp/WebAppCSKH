using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

public interface IZaloService
{
    Task<string> ExchangeCodeAsync(string code);
    Task<string?> GetValidTokenAsync();
    Task<bool> SendOaMessageAsync(string userId, string text);
    Task<bool> SendZnsAsync(string phone, string templateId, Dictionary<string, string> templateData, string? trackingId = null);
    Task<List<ZaloFollower>> GetFollowersAsync(string? offset = null);
    ZaloTokenInfo? GetTokenInfo();
}

public class ZaloFollower
{
    public string UserId { get; set; } = "";
    public string DisplayName { get; set; } = "";
}

public class ZaloTokenInfo
{
    public string AccessToken { get; set; } = "";
    public string RefreshToken { get; set; } = "";
    public DateTime AccessTokenExpiresAt { get; set; }
    public DateTime RefreshTokenExpiresAt { get; set; }
}

public class ZaloService : IZaloService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _cfg;
    private readonly ILogger<ZaloService> _logger;
    private readonly string _tokenFilePath;
    private ZaloTokenInfo? _cached;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private string AppId => _cfg["Zalo:AppId"] ?? "";
    private string AppSecret => _cfg["Zalo:AppSecret"] ?? "";

    public ZaloService(HttpClient http, IConfiguration cfg, IWebHostEnvironment env, ILogger<ZaloService> logger)
    {
        _http = http;
        _cfg = cfg;
        _logger = logger;
        _tokenFilePath = Path.Combine(env.ContentRootPath, _cfg["Zalo:TokenFilePath"] ?? "zalo-tokens.json");
        _cached = LoadFromFile();
    }

    public ZaloTokenInfo? GetTokenInfo() => _cached;

    public async Task<string> ExchangeCodeAsync(string code)
    {
        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["app_id"] = AppId,
            ["code"] = code,
            ["grant_type"] = "authorization_code",
        });

        var req = new HttpRequestMessage(HttpMethod.Post, "https://oauth.zaloapp.com/v4/oa/access_token")
        {
            Content = body
        };
        req.Headers.Add("secret_key", AppSecret);

        var res = await _http.SendAsync(req);
        var json = await res.Content.ReadAsStringAsync();

        JsonElement root;
        try { root = JsonDocument.Parse(json).RootElement; }
        catch { throw new Exception($"Zalo trả về response không hợp lệ: {json}"); }

        // Kiểm tra lỗi (error != 0 hoặc có key "error" với giá trị khác 0)
        if (root.TryGetProperty("error", out var errProp))
        {
            var errCode = errProp.ValueKind == JsonValueKind.String
                ? int.Parse(errProp.GetString()!)
                : errProp.GetInt32();
            if (errCode != 0)
            {
                var msg = root.TryGetProperty("message", out var m) ? m.GetString() : json;
                throw new Exception($"Zalo lỗi {errCode}: {msg}");
            }
        }

        if (!root.TryGetProperty("access_token", out var atProp))
            throw new Exception($"Zalo không trả về access_token. Response: {json}");

        var expiresIn = root.TryGetProperty("expires_in", out var expProp)
            ? (expProp.ValueKind == JsonValueKind.String ? long.Parse(expProp.GetString()!) : expProp.GetInt64())
            : 3600L;

        var tokens = new ZaloTokenInfo
        {
            AccessToken = atProp.GetString() ?? "",
            RefreshToken = root.TryGetProperty("refresh_token", out var rtProp) ? rtProp.GetString() ?? "" : "",
            AccessTokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn - 60),
            RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(89),
        };

        SaveToFile(tokens);
        _cached = tokens;
        return tokens.AccessToken;
    }

    public async Task<string?> GetValidTokenAsync()
    {
        await _lock.WaitAsync();
        try
        {
            if (_cached == null) return null;
            if (DateTime.UtcNow < _cached.AccessTokenExpiresAt) return _cached.AccessToken;
            if (DateTime.UtcNow > _cached.RefreshTokenExpiresAt) return null;
            return await RefreshAsync(_cached.RefreshToken);
        }
        finally { _lock.Release(); }
    }

    public async Task<bool> SendOaMessageAsync(string userId, string text)
    {
        var token = await GetValidTokenAsync();
        if (token == null) return false;

        var payload = new
        {
            recipient = new { user_id = userId },
            message = new { text }
        };

        var req = new HttpRequestMessage(HttpMethod.Post, "https://openapi.zalo.me/v3.0/oa/message/cs")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        req.Headers.Add("access_token", token);

        var res = await _http.SendAsync(req);
        var json = await res.Content.ReadAsStringAsync();
        _logger.LogInformation("Zalo SendOaMessage response: {Json}", json);
        var doc = JsonDocument.Parse(json);
        return doc.RootElement.TryGetProperty("error", out var e) && e.GetInt32() == 0;
    }

    public async Task<List<ZaloFollower>> GetFollowersAsync(string? offset = null)
    {
        var token = await GetValidTokenAsync();
        if (token == null) return [];

        var dataParam = Uri.EscapeDataString($"{{\"offset\":{offset ?? "0"},\"count\":50}}");
        var url = $"https://openapi.zalo.me/v2.0/oa/getfollowers?data={dataParam}";

        var req = new HttpRequestMessage(HttpMethod.Get, url);
        req.Headers.Add("access_token", token);

        var res = await _http.SendAsync(req);
        var json = await res.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (!root.TryGetProperty("data", out var data)) return [];

        // Zalo trả về danh sách user_id, cần gọi thêm để lấy tên
        var userIds = new List<string>();
        if (data.TryGetProperty("followers", out var followers))
            userIds = followers.EnumerateArray()
                .Select(f => f.TryGetProperty("user_id", out var uid) ? uid.GetString() ?? "" : "")
                .Where(id => !string.IsNullOrEmpty(id)).ToList();

        if (!userIds.Any()) return [];

        // Lấy profile từng người
        var result = new List<ZaloFollower>();
        foreach (var uid in userIds)
        {
            var profile = await GetUserProfileAsync(uid, token);
            result.Add(profile);
        }
        return result;
    }

    private async Task<ZaloFollower> GetUserProfileAsync(string userId, string token)
    {
        var dataParam = Uri.EscapeDataString($"{{\"user_id\":\"{userId}\"}}");
        var req = new HttpRequestMessage(HttpMethod.Get, $"https://openapi.zalo.me/v2.0/oa/getprofile?data={dataParam}");
        req.Headers.Add("access_token", token);

        var res = await _http.SendAsync(req);
        var json = await res.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var displayName = root.TryGetProperty("data", out var d) && d.TryGetProperty("display_name", out var dn)
            ? dn.GetString() ?? userId : userId;

        return new ZaloFollower { UserId = userId, DisplayName = displayName };
    }

    public async Task<bool> SendZnsAsync(string phone, string templateId, Dictionary<string, string> templateData, string? trackingId = null)
    {
        var token = await GetValidTokenAsync();
        if (token == null) return false;

        var payload = new
        {
            phone,
            template_id = templateId,
            template_data = templateData,
            tracking_id = trackingId ?? Guid.NewGuid().ToString("N")[..16],
        };

        var req = new HttpRequestMessage(HttpMethod.Post, "https://business.openapi.zalo.me/message/template")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        req.Headers.Add("access_token", token);

        var res = await _http.SendAsync(req);
        var json = await res.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(json);
        return doc.RootElement.TryGetProperty("error", out var e) && e.GetInt32() == 0;
    }

    private async Task<string?> RefreshAsync(string refreshToken)
    {
        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["app_id"] = AppId,
            ["refresh_token"] = refreshToken,
            ["grant_type"] = "refresh_token",
        });

        var req = new HttpRequestMessage(HttpMethod.Post, "https://oauth.zaloapp.com/v4/oa/access_token")
        {
            Content = body
        };
        req.Headers.Add("secret_key", AppSecret);

        var res = await _http.SendAsync(req);
        var json = await res.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (root.TryGetProperty("error", out var err) && err.GetInt32() != 0) return null;

        var tokens = new ZaloTokenInfo
        {
            AccessToken = root.GetProperty("access_token").GetString() ?? "",
            RefreshToken = root.GetProperty("refresh_token").GetString() ?? "",
            AccessTokenExpiresAt = DateTime.UtcNow.AddSeconds(root.GetProperty("expires_in").GetInt64() - 60),
            RefreshTokenExpiresAt = _cached?.RefreshTokenExpiresAt ?? DateTime.UtcNow.AddDays(89),
        };

        SaveToFile(tokens);
        _cached = tokens;
        return tokens.AccessToken;
    }

    private void SaveToFile(ZaloTokenInfo tokens)
    {
        var json = JsonSerializer.Serialize(tokens, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(_tokenFilePath, json);
    }

    private ZaloTokenInfo? LoadFromFile()
    {
        if (!File.Exists(_tokenFilePath)) return null;
        try
        {
            var json = File.ReadAllText(_tokenFilePath);
            return JsonSerializer.Deserialize<ZaloTokenInfo>(json);
        }
        catch { return null; }
    }
}
