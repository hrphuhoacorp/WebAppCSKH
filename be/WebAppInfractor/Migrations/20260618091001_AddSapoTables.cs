using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddSapoTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "sapo_code_mappings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    old_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    new_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    effective_date = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    active = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "TRUE"),
                    uploaded_at = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("sapo_code_mappings_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sapo_import_batches",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    batch_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    imported_at = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    sapo_file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    mapping_file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    row_count = table.Column<int>(type: "integer", nullable: false),
                    date_range = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    net_revenue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    revenue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    orders = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    mapping_count = table.Column<int>(type: "integer", nullable: false),
                    warning_count = table.Column<int>(type: "integer", nullable: false),
                    uploaded_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("sapo_import_batches_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sapo_sales_rows",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    batch_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    date = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    branch = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    product_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    sapo_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    report_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    report_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    product_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    basket_group = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    price_bucket = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    orders = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    revenue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    net_revenue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    resolve_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    matched_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    mapping_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    mapping_date = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    mapping_note = table.Column<string>(type: "text", nullable: true),
                    auto_group_note = table.Column<string>(type: "text", nullable: true),
                    warning = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    uploaded_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    uploaded_at = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("sapo_sales_rows_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_sapo_code_mappings_key",
                table: "sapo_code_mappings",
                columns: new[] { "old_code", "new_code", "effective_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_sapo_import_batches_batch_id",
                table: "sapo_import_batches",
                column: "batch_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_sapo_import_batches_imported_at",
                table: "sapo_import_batches",
                column: "imported_at");

            migrationBuilder.CreateIndex(
                name: "idx_sapo_sales_rows_batch_id",
                table: "sapo_sales_rows",
                column: "batch_id");

            migrationBuilder.CreateIndex(
                name: "idx_sapo_sales_rows_date_branch_code",
                table: "sapo_sales_rows",
                columns: new[] { "date", "branch", "report_code" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sapo_code_mappings");

            migrationBuilder.DropTable(
                name: "sapo_import_batches");

            migrationBuilder.DropTable(
                name: "sapo_sales_rows");
        }
    }
}
