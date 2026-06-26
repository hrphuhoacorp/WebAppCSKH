using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Vpp;

[Index(nameof(ImportDate))]
[Index(nameof(DeletedAt))]
public class VppImport
{
    public int Id { get; set; }
    public DateTime ImportDate { get; set; }
    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }
    public string? AttachmentInvoice { get; set; }
    public string? AttachmentApproval { get; set; }
    public string? Note { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
