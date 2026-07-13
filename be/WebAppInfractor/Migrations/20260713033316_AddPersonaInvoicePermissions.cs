using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonaInvoicePermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
INSERT INTO permissions (code, name, module)
VALUES
    ('persona.invoice.view',   N'Xem hóa đơn/khách hàng doanh nghiệp', 'persona'),
    ('persona.invoice.import', N'Nạp file hóa đơn doanh nghiệp',        'persona')
ON CONFLICT (code) DO NOTHING;

-- Cấp quyền xem cho các role đang có quyền xem danh sách khách hàng (giống các quyền .view khác của module persona).
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions cp ON cp.id = rp.permission_id AND cp.code = 'cskh.customer.view_list'
CROSS JOIN permissions p
WHERE p.code = 'persona.invoice.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Cấp quyền nạp file cho các role đang có quyền chỉnh sửa khách hàng (giống các quyền quản lý khác của module persona).
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions cp ON cp.id = rp.permission_id AND cp.code = 'cskh.customer.edit'
CROSS JOIN permissions p
WHERE p.code = 'persona.invoice.import'
ON CONFLICT (role_id, permission_id) DO NOTHING;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE code IN ('persona.invoice.view', 'persona.invoice.import')
);
DELETE FROM user_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE code IN ('persona.invoice.view', 'persona.invoice.import')
);
DELETE FROM permissions WHERE code IN ('persona.invoice.view', 'persona.invoice.import');
");
        }
    }
}
