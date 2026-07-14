using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class SeedValueBehaviorTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 4 tag "theo giá trị/hành vi mua chung" — không phụ thuộc sản phẩm cụ thể, áp dụng
            // được cho phần lớn khách chưa khớp 1 trong 15 chân dung gốc (đa số chỉ mua 1-2 lần,
            // không có hành vi lặp lại theo nhóm hàng nào). Ngưỡng mặc định (5 triệu, 30/90 ngày)
            // là gợi ý ban đầu — chỉnh lại qua UI (Luật tự động) cho khớp thực tế dữ liệu.
            migrationBuilder.Sql(@"
INSERT INTO persona_tags (code, name, description, color, rule_config, is_active, display_order)
VALUES
(
    'kh_vip',
    N'Khách VIP',
    N'Khách có tổng doanh thu lũy kế từ 5 triệu đồng trở lên — nhóm khách giá trị cao nhất, ưu tiên chăm sóc riêng.',
    '#eab308',
    '{""combinator"":""AND"",""conditions"":[{""type"":""total_revenue"",""minRevenue"":5000000}]}',
    true, 160
),
(
    'kh_moi',
    N'Khách mới',
    N'Khách có đơn hàng đầu tiên trong vòng 30 ngày gần đây — cần chăm sóc sớm để giữ chân, xây thói quen mua lặp lại.',
    '#38bdf8',
    '{""combinator"":""AND"",""conditions"":[{""type"":""days_since_first_order"",""maxDays"":30}]}',
    true, 170
),
(
    'kh_mua_1_lan',
    N'Khách mua 1 lần',
    N'Khách chỉ mới có đúng 1 đơn hàng trong toàn bộ lịch sử, chưa quay lại lần nào — cần chăm sóc để chuyển thành khách trung thành.',
    '#64748b',
    '{""combinator"":""AND"",""conditions"":[{""type"":""total_order_count"",""minCount"":1,""maxCount"":1}]}',
    true, 180
),
(
    'kh_lau_khong_quay_lai',
    N'Khách lâu không quay lại',
    N'Khách đã từng mua nhưng đơn gần nhất cách đây từ 90 ngày trở lên — rủi ro rời bỏ, cần chăm sóc lại (win-back).',
    '#f97316',
    '{""combinator"":""AND"",""conditions"":[{""type"":""days_since_last_order"",""minDays"":90}]}',
    true, 190
)
ON CONFLICT (code) DO NOTHING;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM persona_tags WHERE code IN (
    'kh_vip', 'kh_moi', 'kh_mua_1_lan', 'kh_lau_khong_quay_lai'
);
");
        }
    }
}
