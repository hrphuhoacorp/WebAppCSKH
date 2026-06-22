using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddPermissionSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "permissions",
                columns: table => new
                {
                    id = table
                        .Column<int>(type: "integer", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    code = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: false
                    ),
                    name = table.Column<string>(
                        type: "character varying(255)",
                        maxLength: 255,
                        nullable: false
                    ),
                    module = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: false
                    ),
                    created_at = table.Column<DateTime>(
                        type: "timestamp with time zone",
                        nullable: true,
                        defaultValueSql: "now()"
                    ),
                },
                constraints: table =>
                {
                    table.PrimaryKey("permissions_pkey", x => x.id);
                }
            );

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    id = table
                        .Column<int>(type: "integer", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    role_id = table.Column<int>(type: "integer", nullable: false),
                    permission_id = table.Column<int>(type: "integer", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("role_permissions_pkey", x => x.id);
                    table.ForeignKey(
                        name: "role_permissions_permission_id_fkey",
                        column: x => x.permission_id,
                        principalTable: "permissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                    table.ForeignKey(
                        name: "role_permissions_role_id_fkey",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateTable(
                name: "user_permissions",
                columns: table => new
                {
                    id = table
                        .Column<int>(type: "integer", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    permission_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(
                        type: "timestamp with time zone",
                        nullable: true,
                        defaultValueSql: "now()"
                    ),
                },
                constraints: table =>
                {
                    table.PrimaryKey("user_permissions_pkey", x => x.id);
                    table.ForeignKey(
                        name: "user_permissions_permission_id_fkey",
                        column: x => x.permission_id,
                        principalTable: "permissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                    table.ForeignKey(
                        name: "user_permissions_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "permissions_code_key",
                table: "permissions",
                column: "code",
                unique: true
            );

            migrationBuilder.CreateIndex(
                name: "IX_role_permissions_permission_id",
                table: "role_permissions",
                column: "permission_id"
            );

            migrationBuilder.CreateIndex(
                name: "role_permissions_role_id_permission_id_key",
                table: "role_permissions",
                columns: new[] { "role_id", "permission_id" },
                unique: true
            );

            migrationBuilder.CreateIndex(
                name: "IX_user_permissions_permission_id",
                table: "user_permissions",
                column: "permission_id"
            );

            migrationBuilder.CreateIndex(
                name: "user_permissions_user_id_permission_id_key",
                table: "user_permissions",
                columns: new[] { "user_id", "permission_id" },
                unique: true
            );

            // ── Seed: 65 permissions ────────────────────────────────────────────
            migrationBuilder.Sql(
                @"
INSERT INTO permissions (code, name, module) VALUES
('cskh.dashboard.view',           'Xem dashboard CSKH',              'CSKH'),
('cskh.order.view_list',          'Xem danh sach don hang',          'CSKH'),
('cskh.order.view_detail',        'Xem chi tiet don hang',           'CSKH'),
('cskh.order.import',             'Import don hang',                 'CSKH'),
('cskh.order.rollback',           'Rollback import don hang',        'CSKH'),
('cskh.order.restore',            'Khoi phuc don hang da xoa',       'CSKH'),
('cskh.customer.view_list',       'Xem danh sach khach hang',        'CSKH'),
('cskh.customer.view_detail',     'Xem chi tiet khach hang',         'CSKH'),
('cskh.customer.edit',            'Chinh sua khach hang',            'CSKH'),
('cskh.customer.delete',          'Xoa khach hang',                  'CSKH'),
('cskh.customer.return_rate',     'Xem ty le quay lai',              'CSKH'),
('cskh.customer.segment',         'Xem phan khuc khach hang',        'CSKH'),
('cskh.message_report.view',      'Xem bao cao tin nhan',            'CSKH'),
('cskh.message_report.create',    'Tao bao cao tin nhan',            'CSKH'),
('cskh.message_report.delete',    'Xoa bao cao tin nhan',            'CSKH'),
('gift.basket.view',              'Xem goi qua',                     'Goi Qua'),
('gift.basket.create',            'Tao goi qua',                     'Goi Qua'),
('gift.basket.edit',              'Chinh sua goi qua',               'Goi Qua'),
('gift.basket.upload_image',      'Upload hinh goi qua',             'Goi Qua'),
('gift.change_request.view',      'Xem yeu cau doi ma',              'Goi Qua'),
('gift.change_request.create',    'Tao yeu cau doi ma',              'Goi Qua'),
('gift.change_request.handle',    'Duyet yeu cau doi ma',            'Goi Qua'),
('gift.change_request.toggle_active', 'Bat/tat yeu cau doi ma',      'Goi Qua'),
('gift.change_request.delete',    'Xoa yeu cau doi ma',              'Goi Qua'),
('gift.change_request.export',    'Xuat yeu cau doi ma',             'Goi Qua'),
('sales.dashboard.view',          'Xem dashboard ban hang',          'Ban Hang'),
('sales.order.view_list',         'Xem danh sach don ban hang',      'Ban Hang'),
('sales.sapo.view',               'Xem du lieu Sapo',                'Ban Hang'),
('sales.sapo.import',             'Import du lieu Sapo',             'Ban Hang'),
('sales.sapo.admin',              'Quan tri Sapo',                   'Ban Hang'),
('sales.nxt.view',                'Xem du lieu NXT',                 'Ban Hang'),
('sales.nxt.edit',                'Chinh sua du lieu NXT',           'Ban Hang'),
('sales.nxt.manage_logs',         'Quan ly log NXT',                 'Ban Hang'),
('media.folder.view',             'Xem thu muc',                     'Kho Anh'),
('media.folder.create',           'Tao thu muc',                     'Kho Anh'),
('media.folder.rename',           'Doi ten thu muc',                 'Kho Anh'),
('media.folder.copy',             'Sao chep thu muc',                'Kho Anh'),
('media.folder.delete',           'Xoa thu muc',                     'Kho Anh'),
('media.folder.restore',          'Khoi phuc thu muc',               'Kho Anh'),
('media.file.view',               'Xem file',                        'Kho Anh'),
('media.file.upload',             'Upload file',                     'Kho Anh'),
('media.file.move',               'Di chuyen file',                  'Kho Anh'),
('media.file.delete',             'Xoa file',                        'Kho Anh'),
('media.file.restore',            'Khoi phuc file',                  'Kho Anh'),
('media.recycle_bin.view',        'Xem thung rac',                   'Kho Anh'),
('news.view',                     'Xem tin noi bo',                  'Tin Noi Bo'),
('news.create',                   'Tao tin noi bo',                  'Tin Noi Bo'),
('news.edit',                     'Sua tin noi bo',                  'Tin Noi Bo'),
('news.delete',                   'Xoa tin noi bo',                  'Tin Noi Bo'),
('news.toggle_pin',               'Ghim/bo ghim tin noi bo',         'Tin Noi Bo'),
('news.publish',                  'Dang tin noi bo',                 'Tin Noi Bo'),
('news.upload_media',             'Upload media tin noi bo',         'Tin Noi Bo'),
('staff.view_list',               'Xem danh sach nhan su',           'Nhan Su'),
('staff.view_detail',             'Xem chi tiet nhan su',            'Nhan Su'),
('staff.update',                  'Cap nhat thong tin nhan su',      'Nhan Su'),
('staff.create_account',          'Tao tai khoan nhan su',           'Nhan Su'),
('staff.delete_account',          'Xoa tai khoan nhan su',           'Nhan Su'),
('staff.restore_account',         'Khoi phuc tai khoan nhan su',     'Nhan Su'),
('staff.reset_password',          'Dat lai mat khau nhan su',        'Nhan Su'),
('staff.import',                  'Import nhan su',                  'Nhan Su'),
('staff.view_roles',              'Xem danh sach vai tro',           'Nhan Su'),
('staff.view_activity_log',       'Xem nhat ky hoat dong',           'Nhan Su'),
('staff.manage_permissions',      'Quan ly phan quyen nhan su',      'Nhan Su'),
('staff.import_history.view',     'Xem lich su import',              'Nhan Su'),
('staff.import_history.download', 'Tai file lich su import',         'Nhan Su')
ON CONFLICT (code) DO NOTHING;
"
            );

            // ── Seed: new roles ──────────────────────────────────────────────────
            migrationBuilder.Sql(
                @"
INSERT INTO roles (name, description) VALUES
('Admin',               'Quan tri vien he thong'),
('Ban Hang',            'Nhan vien ban hang'),
('Truong Ca Ban Hang',  'Truong ca ban hang'),
('Goi Qua',             'Nhan vien goi qua'),
('Online',              'Nhan vien CSKH online'),
('Giam Sat',            'Giam sat van hanh'),
('Van Hanh',            'Nhan vien van hanh'),
('Ke Toan',             'Nhan vien ke toan'),
('Kho',                 'Nhan vien kho'),
('Giam Doc',            'Giam doc'),
('Nhan Su',             'Nhan vien nhan su'),
('Thu Mua',             'Nhan vien thu mua'),
('Marketing',           'Nhan vien marketing')
ON CONFLICT (name) DO NOTHING;
"
            );

            // ── Seed: role_permissions ───────────────────────────────────────────
            // Admin gets ALL permissions
            migrationBuilder.Sql(
                @"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
"
            );

            migrationBuilder.Sql(
                @"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Ban Hang'
  AND p.code IN (
    'gift.basket.view','gift.basket.upload_image',
    'gift.change_request.view','gift.change_request.create',
    'sales.dashboard.view','sales.order.view_list','sales.sapo.view','sales.nxt.view',
    'cskh.order.view_detail','cskh.customer.view_detail',
    'cskh.order.import','cskh.order.rollback',
    'media.folder.view','media.file.view',
    'news.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
"
            );

            migrationBuilder.Sql(
                @"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Truong Ca Ban Hang'
  AND p.code IN (
    'gift.basket.view','gift.basket.upload_image',
    'gift.change_request.view','gift.change_request.create',
    'sales.dashboard.view','sales.order.view_list',
    'sales.sapo.view','sales.sapo.import',
    'sales.nxt.view','sales.nxt.edit','sales.nxt.manage_logs',
    'cskh.order.view_detail','cskh.customer.view_detail',
    'cskh.order.import','cskh.order.rollback','cskh.order.restore',
    'media.folder.view','media.file.view',
    'news.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
"
            );

            migrationBuilder.Sql(
                @"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Goi Qua'
  AND p.code IN (
    'gift.basket.view','gift.basket.upload_image',
    'gift.change_request.view','gift.change_request.create',
    'media.folder.view',
    'news.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
"
            );

            migrationBuilder.Sql(
                @"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Online'
  AND p.code IN (
    'cskh.dashboard.view','cskh.order.view_list','cskh.order.view_detail',
    'cskh.customer.view_list','cskh.customer.view_detail',
    'cskh.customer.return_rate','cskh.customer.segment',
    'cskh.message_report.view',
    'gift.basket.view','gift.basket.upload_image',
    'gift.change_request.view','gift.change_request.create',
    'media.folder.view','media.file.view',
    'news.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
"
            );

            migrationBuilder.Sql(
                @"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('Giam Sat', 'Van Hanh')
  AND p.code IN (
    'cskh.dashboard.view','cskh.order.view_list','cskh.order.view_detail',
    'cskh.order.import','cskh.order.rollback','cskh.order.restore',
    'cskh.customer.view_list','cskh.customer.view_detail','cskh.customer.edit',
    'cskh.customer.return_rate','cskh.customer.segment',
    'cskh.message_report.view','cskh.message_report.create',
    'gift.basket.view','gift.basket.create','gift.basket.edit','gift.basket.upload_image',
    'gift.change_request.view','gift.change_request.create','gift.change_request.handle',
    'gift.change_request.toggle_active','gift.change_request.delete','gift.change_request.export',
    'sales.dashboard.view','sales.order.view_list',
    'sales.sapo.view','sales.sapo.import',
    'sales.nxt.view','sales.nxt.edit','sales.nxt.manage_logs',
    'media.folder.view','media.folder.create','media.folder.rename',
    'media.folder.copy','media.folder.delete','media.folder.restore',
    'media.file.view','media.file.upload','media.file.move',
    'media.file.delete','media.file.restore','media.recycle_bin.view',
    'news.view','news.create','news.edit','news.delete',
    'news.toggle_pin','news.publish','news.upload_media'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
"
            );

            migrationBuilder.Sql(
                @"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Ke Toan'
  AND p.code IN (
    'cskh.dashboard.view','cskh.order.view_list','cskh.order.view_detail',
    'cskh.customer.view_list','cskh.customer.view_detail',
    'gift.basket.view','gift.change_request.view',
    'sales.dashboard.view','sales.order.view_list','sales.sapo.view','sales.nxt.view',
    'media.file.upload','media.file.move','media.file.delete','media.file.restore','media.recycle_bin.view',
    'news.view','news.create','news.edit','news.delete','news.toggle_pin','news.publish','news.upload_media',
    'staff.view_list','staff.view_detail'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
"
            );

            migrationBuilder.Sql(
                @"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Giam Doc'
  AND p.code IN (
    'cskh.dashboard.view','cskh.order.view_list','cskh.order.view_detail',
    'cskh.customer.view_list','cskh.customer.view_detail',
    'cskh.customer.return_rate','cskh.customer.segment',
    'cskh.message_report.view',
    'gift.basket.view','gift.change_request.view',
    'sales.dashboard.view','sales.order.view_list','sales.sapo.view','sales.nxt.view',
    'media.file.view',
    'news.view','news.create','news.edit','news.delete','news.toggle_pin','news.publish','news.upload_media',
    'staff.view_list','staff.view_detail'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
"
            );

            migrationBuilder.Sql(
                @"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Nhan Su'
  AND p.code IN (
    'cskh.dashboard.view','cskh.order.view_list','cskh.order.view_detail',
    'cskh.customer.view_list','cskh.customer.view_detail',
    'cskh.customer.return_rate','cskh.customer.segment',
    'cskh.message_report.view',
    'news.view','news.create','news.edit','news.delete','news.toggle_pin','news.publish','news.upload_media',
    'staff.view_list','staff.view_detail','staff.update',
    'staff.create_account','staff.delete_account','staff.restore_account',
    'staff.reset_password','staff.import'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
"
            );

            migrationBuilder.Sql(
                @"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Thu Mua' AND p.code = 'news.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
"
            );

            migrationBuilder.Sql(
                @"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Marketing'
  AND p.code IN (
    'cskh.customer.view_detail','cskh.customer.return_rate',
    'cskh.customer.segment','cskh.message_report.view',
    'sales.dashboard.view','sales.order.view_list','sales.sapo.view','sales.nxt.view',
    'media.folder.view','media.folder.create','media.folder.rename','media.folder.copy',
    'media.file.view','media.file.upload','media.file.move',
    'media.file.delete','media.file.restore','media.recycle_bin.view',
    'news.view','news.create','news.edit','news.delete','news.toggle_pin','news.publish','news.upload_media'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "role_permissions");
            migrationBuilder.DropTable(name: "user_permissions");
            migrationBuilder.DropTable(name: "permissions");
        }
    }
}
