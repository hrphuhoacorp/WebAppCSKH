using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonaPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
INSERT INTO permissions (code, name, module)
VALUES
    ('persona.dashboard.view',      N'Xem tổng quan phân loại khách hàng',      'persona'),
    ('persona.tag.view',            N'Xem danh sách chân dung/tag khách hàng',  'persona'),
    ('persona.tag.manage',          N'Tạo/sửa/xóa chân dung/tag khách hàng',    'persona'),
    ('persona.classification.view', N'Xem lịch sử chạy phân loại tự động',      'persona'),
    ('persona.classification.run',  N'Xem trước/chạy phân loại tự động',        'persona'),
    ('persona.assignment.manual',   N'Gắn/gỡ tag thủ công cho khách hàng',      'persona'),
    ('persona.interaction.view',    N'Xem lịch sử chăm sóc khách hàng',         'persona'),
    ('persona.interaction.manage',  N'Ghi nhận/sửa lịch sử chăm sóc khách hàng','persona'),
    ('persona.reminder.view',       N'Xem nhắc lịch chăm sóc khách hàng',       'persona'),
    ('persona.reminder.manage',     N'Cấu hình lịch nhắc chăm sóc khách hàng',  'persona')
ON CONFLICT (code) DO NOTHING;

-- Cấp quyền xem cho các role đang có quyền xem danh sách khách hàng.
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions cp ON cp.id = rp.permission_id AND cp.code = 'cskh.customer.view_list'
CROSS JOIN permissions p
WHERE p.module = 'persona' AND p.code LIKE '%.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Cấp quyền thao tác/quản lý cho các role đang có quyền chỉnh sửa khách hàng.
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions cp ON cp.id = rp.permission_id AND cp.code = 'cskh.customer.edit'
CROSS JOIN permissions p
WHERE p.module = 'persona' AND p.code NOT LIKE '%.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE module = 'persona'
);
DELETE FROM user_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE module = 'persona'
);
DELETE FROM permissions WHERE module = 'persona';
");
        }
    }
}
