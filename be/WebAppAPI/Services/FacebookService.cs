using System.Text.Json;

public interface IFacebookService
{
    Task<List<FbCampaign>> GetCampaignsAsync();
    Task<List<FbInsight>> GetInsightsAsync(string since, string until, string level = "campaign");
    Task<List<FbBreakdownInsight>> GetInsightsWithBreakdownAsync(string since, string until, string breakdown, string level = "campaign");
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
    public string AdSetId { get; set; } = "";
    public string AdSetName { get; set; } = "";
    public string AdId { get; set; } = "";
    public string AdName { get; set; } = "";
    // Chi phí & hiệu suất cơ bản
    public decimal Spend { get; set; }
    public long Impressions { get; set; }
    public long Clicks { get; set; }
    public long Reach { get; set; }
    public long UniqueClicks { get; set; }
    public decimal Cpc { get; set; }
    public decimal Cpm { get; set; }
    public decimal Ctr { get; set; }
    public decimal UniqueCtr { get; set; }
    public decimal Frequency { get; set; }
    // Video
    public long VideoP25Watched { get; set; }
    public long VideoP50Watched { get; set; }
    public long VideoP75Watched { get; set; }
    public long VideoP100Watched { get; set; }
    // Actions (chuyển đổi)
    public long MessagingConversations { get; set; }
    public long LinkClicks { get; set; }
    public long PostEngagement { get; set; }
    public long PostReactions { get; set; }
    public long PostComments { get; set; }
    public long PostShares { get; set; }
    public long PageLikes { get; set; }
}

public class FbBreakdownInsight
{
    public string Date { get; set; } = "";
    public string CampaignId { get; set; } = "";
    public string CampaignName { get; set; } = "";
    public string BreakdownKey { get; set; } = "";   // "age", "gender", "region", etc.
    public string BreakdownValue { get; set; } = ""; // "18-24", "female", "Ho Chi Minh City"
    public decimal Spend { get; set; }
    public long Impressions { get; set; }
    public long Clicks { get; set; }
    public long Reach { get; set; }
    public decimal Ctr { get; set; }
    public decimal Cpc { get; set; }
}

public class FacebookService : IFacebookService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _cfg;
    private readonly ILogger<FacebookService> _logger;

    private string Token => _cfg["Facebook:AccessToken"] ?? "";
    private string AdAccountId => _cfg["Facebook:AdAccountId"] ?? "";
    private const string BaseUrl = "https://graph.facebook.com/v19.0";

    private const string CommonInsightFields =
        "spend,impressions,clicks,reach,cpc,cpm,ctr,frequency,date_start";

    private static string GetInsightFields(string level) => level switch
    {
        "ad"    => "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name," + CommonInsightFields,
        "adset" => "campaign_id,campaign_name,adset_id,adset_name," + CommonInsightFields,
        _       => "campaign_id,campaign_name," + CommonInsightFields,
    };

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

        var root = await FetchAsync(url);
        if (root == null) return [];

        var result = new List<FbCampaign>();
        if (root.Value.TryGetProperty("data", out var data))
            foreach (var item in data.EnumerateArray())
                result.Add(new FbCampaign
                {
                    Id = Str(item, "id"),
                    Name = Str(item, "name"),
                    Status = Str(item, "status"),
                    Objective = Str(item, "objective"),
                    CreatedTime = Str(item, "created_time"),
                });

        return result;
    }

    public async Task<List<FbInsight>> GetInsightsAsync(string since, string until, string level = "campaign")
    {
        var url = BuildInsightUrl(since, until, level, GetInsightFields(level), "");
        var root = await FetchAsync(url);
        if (root == null) return [];

        var result = new List<FbInsight>();
        if (root.Value.TryGetProperty("data", out var data))
            foreach (var item in data.EnumerateArray())
                result.Add(ParseInsight(item));

        return result;
    }

    public async Task<List<FbBreakdownInsight>> GetInsightsWithBreakdownAsync(string since, string until, string breakdown, string level = "campaign")
    {
        var url = BuildInsightUrl(since, until, level,
            "campaign_id,campaign_name,spend,impressions,clicks,reach,ctr,cpc,date_start",
            breakdown);

        var root = await FetchAsync(url);
        if (root == null) return [];

        var result = new List<FbBreakdownInsight>();
        if (root.Value.TryGetProperty("data", out var data))
            foreach (var item in data.EnumerateArray())
            {
                var breakdownValue = breakdown switch
                {
                    "age" => Str(item, "age"),
                    "gender" => Str(item, "gender"),
                    "region" => Str(item, "region"),
                    "device_platform" => Str(item, "device_platform"),
                    "publisher_platform" => Str(item, "publisher_platform"),
                    _ => Str(item, breakdown)
                };

                result.Add(new FbBreakdownInsight
                {
                    Date = Str(item, "date_start"),
                    CampaignId = Str(item, "campaign_id"),
                    CampaignName = Str(item, "campaign_name"),
                    BreakdownKey = breakdown,
                    BreakdownValue = breakdownValue,
                    Spend = Dec(item, "spend"),
                    Impressions = Long(item, "impressions"),
                    Clicks = Long(item, "clicks"),
                    Reach = Long(item, "reach"),
                    Ctr = Dec(item, "ctr"),
                    Cpc = Dec(item, "cpc"),
                });
            }

        return result;
    }

    private FbInsight ParseInsight(JsonElement item)
    {
        var insight = new FbInsight
        {
            Date = Str(item, "date_start"),
            CampaignId = Str(item, "campaign_id"),
            CampaignName = Str(item, "campaign_name"),
            AdSetId = Str(item, "adset_id"),
            AdSetName = Str(item, "adset_name"),
            AdId = Str(item, "ad_id"),
            AdName = Str(item, "ad_name"),
            Spend = Dec(item, "spend"),
            Impressions = Long(item, "impressions"),
            Clicks = Long(item, "clicks"),
            Reach = Long(item, "reach"),
            UniqueClicks = Long(item, "unique_clicks"),
            Cpc = Dec(item, "cpc"),
            Cpm = Dec(item, "cpm"),
            Ctr = Dec(item, "ctr"),
            UniqueCtr = Dec(item, "unique_ctr"),
            Frequency = Dec(item, "frequency"),
            VideoP25Watched = ActionValue(item, "video_p25_watched_actions"),
            VideoP50Watched = ActionValue(item, "video_p50_watched_actions"),
            VideoP75Watched = ActionValue(item, "video_p75_watched_actions"),
            VideoP100Watched = ActionValue(item, "video_p100_watched_actions"),
        };

        if (item.TryGetProperty("actions", out var actions))
            foreach (var a in actions.EnumerateArray())
            {
                var type = Str(a, "action_type");
                var val = long.TryParse(Str(a, "value"), out var v) ? v : 0;
                switch (type)
                {
                    case "onsite_conversion.messaging_conversation_started_7d":
                    case "onsite_conversion.messaging_conversation_started_1d":
                        insight.MessagingConversations += val; break;
                    case "link_click": insight.LinkClicks += val; break;
                    case "post_engagement": insight.PostEngagement += val; break;
                    case "post_reaction": insight.PostReactions += val; break;
                    case "comment": insight.PostComments += val; break;
                    case "post": insight.PostShares += val; break;
                    case "like": insight.PageLikes += val; break;
                }
            }

        return insight;
    }

    private string BuildInsightUrl(string since, string until, string level, string fields, string breakdown)
    {
        var timeRange = Uri.EscapeDataString($"{{\"since\":\"{since}\",\"until\":\"{until}\"}}");
        var url = $"{BaseUrl}/act_{AdAccountId}/insights" +
                  $"?fields={Uri.EscapeDataString(fields)}" +
                  $"&time_range={timeRange}" +
                  $"&level={level}" +
                  $"&time_increment=1" +
                  $"&limit=500" +
                  $"&access_token={Token}";

        if (!string.IsNullOrEmpty(breakdown))
            url += $"&breakdowns={breakdown}";

        return url;
    }

    private async Task<JsonElement?> FetchAsync(string url)
    {
        try
        {
            var res = await _http.GetAsync(url);
            var json = await res.Content.ReadAsStringAsync();
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

    private static string Str(JsonElement el, string key) =>
        el.TryGetProperty(key, out var p) ? p.GetString() ?? "" : "";

    private static decimal Dec(JsonElement el, string key) =>
        el.TryGetProperty(key, out var p) && decimal.TryParse(p.GetString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0;

    private static long Long(JsonElement el, string key) =>
        el.TryGetProperty(key, out var p) && long.TryParse(p.GetString(), out var v) ? v : 0;

    private static long ActionValue(JsonElement el, string key)
    {
        if (!el.TryGetProperty(key, out var arr)) return 0;
        foreach (var a in arr.EnumerateArray())
            if (long.TryParse(Str(a, "value"), out var v)) return v;
        return 0;
    }
}
