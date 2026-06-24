using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddRecruitmentPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
INSERT INTO permissions (code, name, module)
VALUES
    ('recruitment.view',     'Xem tuyen dung',     'recruitment'),
    ('recruitment.edit',     'Quan ly tuyen dung', 'recruitment'),
    ('recruitment.settings', 'Cai dat tuyen dung', 'recruitment')
ON CONFLICT (code) DO NOTHING;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE module = 'recruitment'
);
DELETE FROM user_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE module = 'recruitment'
);
DELETE FROM permissions WHERE module = 'recruitment';
");
        }
    }
}
