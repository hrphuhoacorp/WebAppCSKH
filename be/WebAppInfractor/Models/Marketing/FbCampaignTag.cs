namespace WebAppInfractor.Models.Marketing;

public class FbCampaignTag
{
    public int Id { get; set; }
    public string CampaignId { get; set; } = null!;
    public string CampaignName { get; set; } = null!;
    public string CategoriesJson { get; set; } = null!;
    public string? BranchIdsJson { get; set; }
    public DateTime DateFrom { get; set; }
    public DateTime DateTo { get; set; }
    public string? Note { get; set; }
    public int CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
