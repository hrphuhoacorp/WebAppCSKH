using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class RemovePersonaInvoiceViewPermission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Chủ doanh nghiệp muốn 2 tab "Nạp hóa đơn doanh nghiệp"/"Khách hàng doanh nghiệp"
            // ai vào được module Persona cũng xem được — không cần quyền xem riêng nữa (chỉ
            // giữ persona.invoice.import cho thao tác nạp file). Cả controller và FE đã đổi
            // sang persona.dashboard.view.
            migrationBuilder.Sql(@"
DELETE FROM role_permissions WHERE permission_id = (SELECT id FROM permissions WHERE code = 'persona.invoice.view');
DELETE FROM user_permissions WHERE permission_id = (SELECT id FROM permissions WHERE code = 'persona.invoice.view');
DELETE FROM permissions WHERE code = 'persona.invoice.view';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
INSERT INTO permissions (code, name, module)
VALUES ('persona.invoice.view', N'Xem hóa đơn/khách hàng doanh nghiệp', 'persona')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions cp ON cp.id = rp.permission_id AND cp.code = 'cskh.customer.view_list'
CROSS JOIN permissions p
WHERE p.code = 'persona.invoice.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
");
        }
    }
}
