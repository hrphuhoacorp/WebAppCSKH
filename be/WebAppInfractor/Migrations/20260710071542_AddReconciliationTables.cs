using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddReconciliationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "reconciliation_excess_rows",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    run_id = table.Column<int>(type: "integer", nullable: false),
                    order_id = table.Column<int>(type: "integer", nullable: true),
                    order_item_id = table.Column<int>(type: "integer", nullable: true),
                    order_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    purchase_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    service_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    revenue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    match_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    duplicate_of_order_id = table.Column<int>(type: "integer", nullable: true),
                    duplicate_of_import_history_id = table.Column<int>(type: "integer", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("reconciliation_excess_rows_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "reconciliation_missing_rows",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    run_id = table.Column<int>(type: "integer", nullable: false),
                    order_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    purchase_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    service_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    revenue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("reconciliation_missing_rows_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "reconciliation_runs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    period_month = table.Column<int>(type: "integer", nullable: false),
                    period_year = table.Column<int>(type: "integer", nullable: false),
                    source_file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    source_file_path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    run_by = table.Column<int>(type: "integer", nullable: false),
                    run_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    total_excess_rows = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    total_excess_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    total_missing_rows = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    total_missing_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m)
                },
                constraints: table =>
                {
                    table.PrimaryKey("reconciliation_runs_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_excess_rows_run_id",
                table: "reconciliation_excess_rows",
                column: "run_id");

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_missing_rows_run_id",
                table: "reconciliation_missing_rows",
                column: "run_id");

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_runs_period_month_period_year",
                table: "reconciliation_runs",
                columns: new[] { "period_month", "period_year" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "reconciliation_excess_rows");

            migrationBuilder.DropTable(
                name: "reconciliation_missing_rows");

            migrationBuilder.DropTable(
                name: "reconciliation_runs");
        }
    }
}
