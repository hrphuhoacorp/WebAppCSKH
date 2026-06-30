using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class RemoveVppViewPermission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM role_permissions WHERE permission_id = (SELECT id FROM permissions WHERE code = 'vpp.view');
DELETE FROM user_permissions WHERE permission_id = (SELECT id FROM permissions WHERE code = 'vpp.view');
DELETE FROM permissions WHERE code = 'vpp.view';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
INSERT INTO permissions (code, name, module)
VALUES ('vpp.view', N'Xem danh mục & tồn kho VPP', 'vpp')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions WHERE code = 'vpp.view'
ON CONFLICT DO NOTHING;
");
        }
    }
}
