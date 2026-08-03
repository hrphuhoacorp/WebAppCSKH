namespace WebAppInfractor.Models;

public class PromoTemplateLayout
{
    public int Id { get; set; }

    // Slug định danh loại bảng giá — 4 loại cũ ('hotdeal-1'|'hotdeal-2'|'sale-1'|'sale-2') hoặc slug
    // tự sinh cho loại do người dùng tự tạo (vd 'thong-bao-gia-3-don-vi').
    public string TemplateKind { get; set; } = null!;

    // Tên hiển thị cho loại này, vd "Thông báo giá 3 đơn vị". Null với bản ghi cũ trước khi thêm
    // cột này — FE tự fallback về nhãn cứng cho 4 loại gốc.
    public string? DisplayName { get; set; }

    // 'hotdeal' | 'sale' | 'none'
    public string? Badge { get; set; }

    // jsonb — serialized FieldConfig (ô giá 1-4 bật/tắt + nhãn/kiểu hiển thị/cỡ chữ, ô ghi chú, ô
    // ngày áp dụng bật/tắt). Null với bản ghi cũ — FE fallback về cấu hình cứng cho 4 loại gốc.
    public string? FieldConfigJson { get; set; }

    // jsonb — serialized PromoCardLayout (per-element {xPct,yPct,widthPct,heightPct,auto,align})
    public string LayoutJson { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
