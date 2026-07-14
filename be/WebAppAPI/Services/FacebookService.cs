using System.Text.Json;

public interface IFacebookService
{
    Task<List<FbCampaign>> GetCampaignsAsync();
    Task<List<FbInsight>> GetInsightsAsync(string since, string until, string level = "campaign");
}

public class FbCampaign
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Status { get; set; } = "";
    public string Objective { get; set; } = "";
    public string CreatedTime { get; set; } = "";
}

public class FbInsight
{
    public string Date { get; set; } = "";
    public string CampaignId { get; set; } = "";
    public string CampaignName { get; set; } = "";
    public decimal Spend { get; set; }
    public long Impressions { get; set; }
    public long Clicks { get; set; }
    public long Reach { get; set; }
    public decimal Cpc { get; set; }
    public decimal Cpm { get; set; }
    public decimal Ctr { get; set; }
}

public class FacebookService : IFacebookService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _cfg;
    private readonly ILogger<FacebookService> _logger;

    private string Token => _cfg["Facebook:AccessToken"] ?? "";
    private string AdAccountId => _cfg["Facebook:AdAccountId"] ?? "";
    private const string BaseUrl = "https://graph.facebook.com/v19.0";

    public FacebookService(HttpClient http, IConfiguration cfg, ILogger<FacebookService> logger)
    {
        _http = http;
        _cfg = cfg;
        _logger = logger;
    }

    public async Task<List<FbCampaign>> GetCampaignsAsync()
    {
        var url = $"{BaseUrl}/act_{AdAccountId}/campaigns" +
                  $"?fields=id,name,status,objective,created_time" +
                  $"&access_token={Token}";

        var json = await FetchAsync(url);
        if (json == null) return [];

        var result = new List<FbCampaign>();
        if (json.Value.TryGetProperty("data", out var data))
        {
            foreach (var item in data.EnumerateArray())
            {
                result.Add(new FbCampaign
                {
                    Id = item.TryGetProperty("id", out var id) ? id.GetString() ?? "" : "",
                    Name = item.TryGetProperty("name", out var name) ? name.GetString() ?? "" : "",
                    Status = item.TryGetProperty("status", out var status) ? status.GetString() ?? "" : "",
                    Objective = item.TryGetProperty("objective", out var obj) ? obj.GetString() ?? "" : "",
                    CreatedTime = item.TryGetProperty("created_time", out var ct) ? ct.GetString() ?? "" : "",
                });
            }
        }
        return result;
    }

    public async Task<List<FbInsight>> GetInsightsAsync(string since, string until, string level = "campaign")
    {
        var timeRange = Uri.EscapeDataString($"{{\"since\":\"{since}\",\"until\":\"{until}\"}}");
        var fields = "campaign_id,campaign_name,spend,impressions,clicks,reach,cpc,cpm,ctr,date_start";
        var url = $"{BaseUrl}/act_{AdAccountId}/insights" +
                  $"?fields={fields}" +
                  $"&time_range={timeRange}" +
                  $"&level={level}" +
                  $"&time_increment=1" +
                  $"&limit=500" +
                  $"&access_token={Token}";

        var json = await FetchAsync(url);
        if (json == null) return [];

        var result = new List<FbInsight>();
        if (json.Value.TryGetProperty("data", out var data))
        {
            foreach (var item in data.EnumerateArray())
            {
                result.Add(new FbInsight
                {
                    Date = item.TryGetProperty("date_start", out var ds) ? ds.GetString() ?? "" : "",
                    CampaignId = item.TryGetProperty("campaign_id", out var cid) ? cid.GetString() ?? "" : "",
                    CampaignName = item.TryGetProperty("campaign_name", out var cn) ? cn.GetString() ?? "" : "",
                    Spend = item.TryGetProperty("spend", out var spend) && decimal.TryParse(spend.GetString(), out var s) ? s : 0,
                    Impressions = item.TryGetProperty("impressions", out var imp) && long.TryParse(imp.GetString(), out var i) ? i : 0,
                    Clicks = item.TryGetProperty("clicks", out var cl) && long.TryParse(cl.GetString(), out var c) ? c : 0,
                    Reach = item.TryGetProperty("reach", out var reach) && long.TryParse(reach.GetString(), out var r) ? r : 0,
                    Cpc = item.TryGetProperty("cpc", out var cpc) && decimal.TryParse(cpc.GetString(), out var cpcV) ? cpcV : 0,
                    Cpm = item.TryGetProperty("cpm", out var cpm) && decimal.TryParse(cpm.GetString(), out var cpmV) ? cpmV : 0,
                    Ctr = item.TryGetProperty("ctr", out var ctr) && decimal.TryParse(ctr.GetString(), out var ctrV) ? ctrV : 0,
                });
            }
        }
        return result;
    }

    private async Task<JsonElement?> FetchAsync(string url)
    {
        try
        {
            var res = await _http.GetAsync(url);
            var json = await res.Content.ReadAsStringAsync();
            _logger.LogInformation("Facebook API response: {Json}", json);
            var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("error", out var err))
            {
                _logger.LogError("Facebook API error: {Error}", err.ToString());
                return null;
            }
            return doc.RootElement;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Facebook API call failed");
            return null;
        }
    }
}
