using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class RemovePersonaInvoiceImportPermission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Chủ doanh nghiệp muốn nút "Nạp file" cũng mở cho ai vào được module Persona,
            // giống 2 tab xem (xem RemovePersonaInvoiceViewPermission) — không cần quyền
            // riêng nữa. Controller/FE đã đổi sang persona.dashboard.view.
            migrationBuilder.Sql(@"
DELETE FROM role_permissions WHERE permission_id = (SELECT id FROM permissions WHERE code = 'persona.invoice.import');
DELETE FROM user_permissions WHERE permission_id = (SELECT id FROM permissions WHERE code = 'persona.invoice.import');
DELETE FROM permissions WHERE code = 'persona.invoice.import';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
INSERT INTO permissions (code, name, module)
VALUES ('persona.invoice.import', N'Nạp file hóa đơn doanh nghiệp', 'persona')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions cp ON cp.id = rp.permission_id AND cp.code = 'cskh.customer.edit'
CROSS JOIN permissions p
WHERE p.code = 'persona.invoice.import'
ON CONFLICT (role_id, permission_id) DO NOTHING;
");
        }
    }
}
