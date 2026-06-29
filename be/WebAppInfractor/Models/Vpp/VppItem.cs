using Microsoft.EntityFrameworkCore;

namespace WebAppInfractor.Models.Vpp;

[Index(nameof(Code), IsUnique = true)]
[Index(nameof(Group))]
[Index(nameof(DeletedAt))]
public class VppItem
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string Group { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Unit { get; set; } = null!;
    public decimal UnitPrice { get; set; }
    public decimal VatRate { get; set; }
    public int MinStock { get; set; }
    public int MaxStock { get; set; }
    public string? Note { get; set; }
    public bool IsActive { get; set; } = true;
    public string? UniformReturnHistory { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
