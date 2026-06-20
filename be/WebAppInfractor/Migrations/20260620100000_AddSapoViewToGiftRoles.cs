using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddSapoViewToGiftRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Trang gift_basket/dashboard gọi /api/sapo/dashboard (cần sales.sapo.view)
            // Thêm quyền này cho các role có thể truy cập trang dashboard giỏ quà
            migrationBuilder.Sql(@"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('Goi Qua', 'Online')
  AND p.code = 'sales.sapo.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE name IN ('Goi Qua', 'Online'))
  AND permission_id IN (SELECT id FROM permissions WHERE code = 'sales.sapo.view');
");
        }
    }
}
