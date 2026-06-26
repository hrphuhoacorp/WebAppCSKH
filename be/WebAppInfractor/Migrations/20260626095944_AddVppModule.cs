using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddVppModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "vpp_dispatch_lines",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    dispatch_id = table.Column<int>(type: "integer", nullable: false),
                    item_id = table.Column<int>(type: "integer", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    vat_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("vpp_dispatch_lines_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vpp_dispatches",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    dispatch_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    department = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    branch = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    request_id = table.Column<int>(type: "integer", nullable: true),
                    attachment_invoice = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    attachment_approval = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("vpp_dispatches_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vpp_import_lines",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    import_id = table.Column<int>(type: "integer", nullable: false),
                    item_id = table.Column<int>(type: "integer", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    vat_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("vpp_import_lines_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vpp_imports",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    import_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    period_month = table.Column<int>(type: "integer", nullable: false),
                    period_year = table.Column<int>(type: "integer", nullable: false),
                    attachment_invoice = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    attachment_approval = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("vpp_imports_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vpp_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    group = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    vat_rate = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    min_stock = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    max_stock = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("vpp_items_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vpp_request_lines",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    request_id = table.Column<int>(type: "integer", nullable: false),
                    item_id = table.Column<int>(type: "integer", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("vpp_request_lines_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vpp_requests",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    requester_id = table.Column<int>(type: "integer", nullable: false),
                    department = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    reason = table.Column<string>(type: "text", nullable: true),
                    reference_price = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "pending"),
                    admin_note = table.Column<string>(type: "text", nullable: true),
                    dispatch_id = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("vpp_requests_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vpp_stock_count_lines",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    stock_count_id = table.Column<int>(type: "integer", nullable: false),
                    item_id = table.Column<int>(type: "integer", nullable: false),
                    system_qty = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: false),
                    actual_qty = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: false),
                    difference = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("vpp_stock_count_lines_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vpp_stock_counts",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    count_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    period_month = table.Column<int>(type: "integer", nullable: false),
                    period_year = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "draft"),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("vpp_stock_counts_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_vpp_dispatch_lines_dispatch_id",
                table: "vpp_dispatch_lines",
                column: "dispatch_id");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_dispatch_lines_item_id",
                table: "vpp_dispatch_lines",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_dispatches_code",
                table: "vpp_dispatches",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vpp_dispatches_deleted_at",
                table: "vpp_dispatches",
                column: "deleted_at");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_dispatches_dispatch_date",
                table: "vpp_dispatches",
                column: "dispatch_date");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_dispatches_request_id",
                table: "vpp_dispatches",
                column: "request_id");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_import_lines_import_id",
                table: "vpp_import_lines",
                column: "import_id");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_import_lines_item_id",
                table: "vpp_import_lines",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_imports_deleted_at",
                table: "vpp_imports",
                column: "deleted_at");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_imports_import_date",
                table: "vpp_imports",
                column: "import_date");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_items_code",
                table: "vpp_items",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vpp_items_deleted_at",
                table: "vpp_items",
                column: "deleted_at");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_items_group",
                table: "vpp_items",
                column: "group");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_request_lines_item_id",
                table: "vpp_request_lines",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_request_lines_request_id",
                table: "vpp_request_lines",
                column: "request_id");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_requests_created_at",
                table: "vpp_requests",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_requests_requester_id",
                table: "vpp_requests",
                column: "requester_id");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_requests_status",
                table: "vpp_requests",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_stock_count_lines_item_id",
                table: "vpp_stock_count_lines",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_stock_count_lines_stock_count_id",
                table: "vpp_stock_count_lines",
                column: "stock_count_id");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_stock_counts_count_date",
                table: "vpp_stock_counts",
                column: "count_date");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_stock_counts_status",
                table: "vpp_stock_counts",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "vpp_dispatch_lines");

            migrationBuilder.DropTable(
                name: "vpp_dispatches");

            migrationBuilder.DropTable(
                name: "vpp_import_lines");

            migrationBuilder.DropTable(
                name: "vpp_imports");

            migrationBuilder.DropTable(
                name: "vpp_items");

            migrationBuilder.DropTable(
                name: "vpp_request_lines");

            migrationBuilder.DropTable(
                name: "vpp_requests");

            migrationBuilder.DropTable(
                name: "vpp_stock_count_lines");

            migrationBuilder.DropTable(
                name: "vpp_stock_counts");
        }
    }
}
