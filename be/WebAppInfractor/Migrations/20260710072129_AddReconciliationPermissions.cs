using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddReconciliationPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
INSERT INTO permissions (code, name, module)
VALUES
    ('reconciliation.view',   N'Xem rà soát số liệu đơn hàng',  'reconciliation'),
    ('reconciliation.run',    N'Chạy rà soát số liệu đơn hàng', 'reconciliation'),
    ('reconciliation.delete', N'Xóa dòng lệch sau rà soát',     'reconciliation')
ON CONFLICT (code) DO NOTHING;

-- Cấp cho các role đang có quyền cskh.order.restore (nhóm đã được tin cậy thao tác
-- rollback/restore đơn hàng) — tự động khớp đúng role hiện tại mà không cần hardcode id.
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions cp ON cp.id = rp.permission_id AND cp.code = 'cskh.order.restore'
CROSS JOIN permissions p
WHERE p.module = 'reconciliation'
ON CONFLICT (role_id, permission_id) DO NOTHING;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE module = 'reconciliation'
);
DELETE FROM user_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE module = 'reconciliation'
);
DELETE FROM permissions WHERE module = 'reconciliation';
");
        }
    }
}
