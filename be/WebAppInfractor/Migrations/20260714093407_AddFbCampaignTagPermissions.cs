using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddFbCampaignTagPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
INSERT INTO permissions (code, name, module)
VALUES
    ('facebook.campaign_tag.view',   N'Xem nhãn nhóm hàng & hiệu suất chiến dịch Facebook', 'facebook'),
    ('facebook.campaign_tag.manage', N'Gắn/sửa/gỡ nhãn nhóm hàng cho chiến dịch Facebook',   'facebook')
ON CONFLICT (code) DO NOTHING;

-- Cấp cho các role đang có quyền persona.tag.manage (nhóm đã được tin cậy quản lý gắn nhãn/
-- phân loại khách hàng) — tự động khớp đúng role hiện tại mà không cần hardcode id.
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions cp ON cp.id = rp.permission_id AND cp.code = 'persona.tag.manage'
CROSS JOIN permissions p
WHERE p.module = 'facebook'
ON CONFLICT (role_id, permission_id) DO NOTHING;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE module = 'facebook'
);
DELETE FROM user_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE module = 'facebook'
);
DELETE FROM permissions WHERE module = 'facebook';
");
        }
    }
}
