using System;

namespace WebAppInfractor.Models;

public class NxtAdjustment
{
    public int Id { get; set; }
    public string ImportId { get; set; } = null!;
    public string Date { get; set; } = null!;
    public string Branch { get; set; } = null!;
    /// <summary>Mã cũ/sai/giỏ hủy</summary>
    public string WrongCode { get; set; } = null!;
    /// <summary>Mã mới/đúng (rỗng nếu là hủy giỏ)</summary>
    public string? RightCode { get; set; }
    public int Qty { get; set; }
    /// <summary>Đổi mã tạm/nhập nhầm | Sapo/check đơn bấm sai mã | Hủy/Rã giỏ | Chuyển chi nhánh</summary>
    public string Reason { get; set; } = "Đổi mã tạm/nhập nhầm";
    public string? Note { get; set; }
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
}
