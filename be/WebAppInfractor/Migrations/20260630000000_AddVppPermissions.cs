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
    ('vpp.view',                'Xem danh muc & ton kho VPP',      'vpp'),
    ('vpp.item.create',         'Tao vat tu VPP',                   'vpp'),
    ('vpp.item.edit',           'Sua / doi trang thai vat tu VPP',  'vpp'),
    ('vpp.item.delete',         'Xoa vat tu VPP',                   'vpp'),
    ('vpp.item.uniform_return', 'Ghi nhan hoan tra dong phuc',      'vpp'),
    ('vpp.import.view',         'Xem phieu nhap VPP',               'vpp'),
    ('vpp.import.create',       'Tao phieu nhap VPP',               'vpp'),
    ('vpp.import.delete',       'Xoa phieu nhap VPP',               'vpp'),
    ('vpp.dispatch.view',       'Xem phieu xuat VPP',               'vpp'),
    ('vpp.dispatch.create',     'Tao phieu xuat VPP',               'vpp'),
    ('vpp.dispatch.delete',     'Xoa phieu xuat VPP',               'vpp'),
    ('vpp.request.view',        'Xem de nghi VPP',                  'vpp'),
    ('vpp.request.create',      'Gui de nghi VPP',                  'vpp'),
    ('vpp.request.approve',     'Duyet / tu choi de nghi VPP',      'vpp'),
    ('vpp.stock_count.view',    'Xem phieu kiem kho VPP',           'vpp'),
    ('vpp.stock_count.create',  'Tao phieu kiem kho VPP',           'vpp'),
    ('vpp.stock_count.edit',    'Cap nhat dong kiem kho VPP',       'vpp'),
    ('vpp.stock_count.confirm', 'Xac nhan phieu kiem kho VPP',      'vpp'),
    ('vpp.upload',              'Upload file dinh kem VPP',         'vpp')
ON CONFLICT (code) DO NOTHING;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM role_permissions WHERE permission_id IN (
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
