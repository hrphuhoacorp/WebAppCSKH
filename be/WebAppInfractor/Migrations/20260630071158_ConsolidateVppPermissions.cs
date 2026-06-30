using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class ConsolidateVppPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
-- Remove role/user assignments for granular permissions being dropped
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE code IN (
        'vpp.item.create','vpp.item.edit','vpp.item.delete','vpp.item.uniform_return',
        'vpp.import.view','vpp.import.create','vpp.import.delete',
        'vpp.dispatch.view','vpp.dispatch.create','vpp.dispatch.delete',
        'vpp.request.view',
        'vpp.stock_count.view','vpp.stock_count.create','vpp.stock_count.edit','vpp.stock_count.confirm',
        'vpp.upload'
    )
);
DELETE FROM user_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE code IN (
        'vpp.item.create','vpp.item.edit','vpp.item.delete','vpp.item.uniform_return',
        'vpp.import.view','vpp.import.create','vpp.import.delete',
        'vpp.dispatch.view','vpp.dispatch.create','vpp.dispatch.delete',
        'vpp.request.view',
        'vpp.stock_count.view','vpp.stock_count.create','vpp.stock_count.edit','vpp.stock_count.confirm',
        'vpp.upload'
    )
);
DELETE FROM permissions WHERE code IN (
    'vpp.item.create','vpp.item.edit','vpp.item.delete','vpp.item.uniform_return',
    'vpp.import.view','vpp.import.create','vpp.import.delete',
    'vpp.dispatch.view','vpp.dispatch.create','vpp.dispatch.delete',
    'vpp.request.view',
    'vpp.stock_count.view','vpp.stock_count.create','vpp.stock_count.edit','vpp.stock_count.confirm',
    'vpp.upload'
);

-- Add consolidated manage permission
INSERT INTO permissions (code, name, module)
VALUES ('vpp.manage', N'Quản lý VPP (thêm / sửa / xóa / nhập / xuất / kiểm kho)', 'vpp')
ON CONFLICT (code) DO NOTHING;

-- Grant vpp.view to all roles (mọi NV xem danh mục để xin cấp phát)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE p.code = 'vpp.view'
ON CONFLICT DO NOTHING;

-- Grant vpp.manage and vpp.request.approve to admin role (7)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, p.id
FROM permissions p
WHERE p.code IN ('vpp.manage', 'vpp.request.approve')
ON CONFLICT DO NOTHING;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
-- Restore granular permissions
INSERT INTO permissions (code, name, module) VALUES
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
    ('vpp.stock_count.view',    N'Xem phiếu kiểm kho VPP',              'vpp'),
    ('vpp.stock_count.create',  N'Tạo phiếu kiểm kho VPP',              'vpp'),
    ('vpp.stock_count.edit',    N'Cập nhật dòng kiểm kho VPP',          'vpp'),
    ('vpp.stock_count.confirm', N'Xác nhận phiếu kiểm kho VPP',         'vpp'),
    ('vpp.upload',              N'Upload file đính kèm VPP',             'vpp')
ON CONFLICT (code) DO NOTHING;

-- Restore role 7 assignments
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions WHERE module = 'vpp'
ON CONFLICT DO NOTHING;

-- Remove vpp.manage
DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'vpp.manage');
DELETE FROM user_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'vpp.manage');
DELETE FROM permissions WHERE code = 'vpp.manage';

-- Remove vpp.view from non-admin roles
DELETE FROM role_permissions
WHERE permission_id = (SELECT id FROM permissions WHERE code = 'vpp.view')
  AND role_id != 7;
");
        }
    }
}
