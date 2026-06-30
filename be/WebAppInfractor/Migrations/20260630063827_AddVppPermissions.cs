using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddVppPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
INSERT INTO permissions (code, name, module)
VALUES
    ('vpp.view',                N'Xem danh mục & tồn kho VPP',         'vpp'),
    ('vpp.item.create',         N'Tạo vật tư VPP',                      'vpp'),
    ('vpp.item.edit',           N'Sửa / đổi trạng thái vật tư VPP',    'vpp'),
    ('vpp.item.delete',         N'Xóa vật tư VPP',                      'vpp'),
    ('vpp.item.uniform_return', N'Ghi nhận hoàn trả đồng phục',         'vpp'),
    ('vpp.import.view',         N'Xem phiếu nhập VPP',                  'vpp'),
    ('vpp.import.create',       N'Tạo phiếu nhập VPP',                  'vpp'),
    ('vpp.import.delete',       N'Xóa phiếu nhập VPP',                  'vpp'),
    ('vpp.dispatch.view',       N'Xem phiếu xuất VPP',                  'vpp'),
    ('vpp.dispatch.create',     N'Tạo phiếu xuất VPP',                  'vpp'),
    ('vpp.dispatch.delete',     N'Xóa phiếu xuất VPP',                  'vpp'),
    ('vpp.request.view',        N'Xem đề nghị VPP',                     'vpp'),
    ('vpp.request.create',      N'Gửi đề nghị VPP',                     'vpp'),
    ('vpp.request.approve',     N'Duyệt / từ chối đề nghị VPP',         'vpp'),
    ('vpp.stock_count.view',    N'Xem phiếu kiểm kho VPP',              'vpp'),
    ('vpp.stock_count.create',  N'Tạo phiếu kiểm kho VPP',              'vpp'),
    ('vpp.stock_count.edit',    N'Cập nhật dòng kiểm kho VPP',          'vpp'),
    ('vpp.stock_count.confirm', N'Xác nhận phiếu kiểm kho VPP',         'vpp'),
    ('vpp.upload',              N'Upload file đính kèm VPP',             'vpp')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions WHERE module = 'vpp'
ON CONFLICT DO NOTHING;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM role_permissions WHERE role_id = 7 AND permission_id IN (
    SELECT id FROM permissions WHERE module = 'vpp'
);
DELETE FROM user_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE module = 'vpp'
);
DELETE FROM permissions WHERE module = 'vpp';
");
        }
    }
}
