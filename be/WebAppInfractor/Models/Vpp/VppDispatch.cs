using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Vpp;

[Index(nameof(Code), IsUnique = true)]
[Index(nameof(DispatchDate))]
[Index(nameof(RequestId))]
[Index(nameof(DeletedAt))]
public class VppDispatch
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public DateTime DispatchDate { get; set; }
    public string? Department { get; set; }
    public string? Branch { get; set; }
    public int? RequestId { get; set; }
    public string? AttachmentInvoice { get; set; }
    public string? AttachmentApproval { get; set; }
    public string? Note { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
