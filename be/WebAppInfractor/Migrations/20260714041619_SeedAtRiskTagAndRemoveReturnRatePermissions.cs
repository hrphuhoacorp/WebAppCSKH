using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class SeedAtRiskTagAndRemoveReturnRatePermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Tag thứ 5 trong nhóm "giá trị/hành vi mua" — gộp từ khái niệm "atRisk" của trang
            // Tỉ Lệ Quay Lại cũ (đã retire): đã mua ≥2 đơn nhưng đơn gần nhất cách 60-180 ngày
            // — cảnh báo sớm trước khi rơi hẳn vào nhóm "lâu không quay lại" (90+ ngày).
            migrationBuilder.Sql(@"
INSERT INTO persona_tags (code, name, description, color, rule_config, is_active, display_order)
VALUES
(
    'kh_nguy_co_roi_bo',
    N'Khách nguy cơ rời bỏ',
    N'Khách đã mua từ 2 đơn trở lên nhưng đơn gần nhất cách đây 60-180 ngày — chưa hẳn mất nhưng cần chăm sóc lại sớm trước khi rời bỏ hẳn.',
    '#ef4444',
    '{""combinator"":""AND"",""conditions"":[{""type"":""total_order_count"",""minCount"":2,""maxCount"":null},{""type"":""days_since_last_order"",""minDays"":60,""maxDays"":180}]}',
    true, 195
)
ON CONFLICT (code) DO NOTHING;
");

            // Trang ""Tỉ Lệ Quay Lại"" (sidebar Bán Hàng) đã được gộp vào module Persona (tab
            // ""Tỉ lệ quay lại"" mới, viết lại bằng truy vấn SQL-side thay vì load hết bảng
            // orders vào bộ nhớ như cách cũ) — 2 quyền dưới đây không còn endpoint nào dùng tới.
            migrationBuilder.Sql(@"
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE code IN ('cskh.customer.return_rate', 'cskh.customer.segment')
);
DELETE FROM user_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE code IN ('cskh.customer.return_rate', 'cskh.customer.segment')
);
DELETE FROM permissions WHERE code IN ('cskh.customer.return_rate', 'cskh.customer.segment');
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM persona_tags WHERE code = 'kh_nguy_co_roi_bo';
");

            migrationBuilder.Sql(@"
INSERT INTO permissions (code, name, module)
VALUES
    ('cskh.customer.return_rate', N'Xem thống kê tỉ lệ quay lại', 'cskh'),
    ('cskh.customer.segment', N'Xem danh sách khách hàng theo phân khúc', 'cskh')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions cp ON cp.id = rp.permission_id AND cp.code = 'cskh.customer.view_list'
CROSS JOIN permissions p
WHERE p.code IN ('cskh.customer.return_rate', 'cskh.customer.segment')
ON CONFLICT (role_id, permission_id) DO NOTHING;
");
        }
    }
}
