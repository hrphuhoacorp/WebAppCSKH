using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddVppItemLotsAndBranchToRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "branch",
                table: "vpp_requests",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "lot_id",
                table: "vpp_import_lines",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "lot_id",
                table: "vpp_dispatch_lines",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "total_mismatch_amount",
                table: "reconciliation_runs",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "total_mismatch_rows",
                table: "reconciliation_runs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "branch_name",
                table: "reconciliation_missing_rows",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "note",
                table: "reconciliation_missing_rows",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "source",
                table: "reconciliation_missing_rows",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "branch_id",
                table: "reconciliation_excess_rows",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "import_history_id",
                table: "reconciliation_excess_rows",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "source",
                table: "reconciliation_excess_rows",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "source_quantity",
                table: "reconciliation_excess_rows",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "source_revenue",
                table: "reconciliation_excess_rows",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "vpp_item_lots",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    item_id = table.Column<int>(type: "integer", nullable: false),
                    lot_number = table.Column<int>(type: "integer", nullable: false),
                    period_month = table.Column<int>(type: "integer", nullable: false),
                    period_year = table.Column<int>(type: "integer", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    initial_qty = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: false),
                    remaining_qty = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "active"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("vpp_item_lots_pkey", x => x.id);
                    table.ForeignKey(
                        name: "vpp_item_lots_item_id_fkey",
                        column: x => x.item_id,
                        principalTable: "vpp_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_vpp_import_lines_lot_id",
                table: "vpp_import_lines",
                column: "lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_dispatch_lines_lot_id",
                table: "vpp_dispatch_lines",
                column: "lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_vpp_item_lots_item_id_status_period_year_period_month",
                table: "vpp_item_lots",
                columns: new[] { "item_id", "status", "period_year", "period_month" });

            migrationBuilder.CreateIndex(
                name: "IX_vpp_item_lots_item_id_unit_price_status",
                table: "vpp_item_lots",
                columns: new[] { "item_id", "unit_price", "status" });

            migrationBuilder.AddForeignKey(
                name: "vpp_dispatch_lines_lot_id_fkey",
                table: "vpp_dispatch_lines",
                column: "lot_id",
                principalTable: "vpp_item_lots",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "vpp_import_lines_lot_id_fkey",
                table: "vpp_import_lines",
                column: "lot_id",
                principalTable: "vpp_item_lots",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "vpp_dispatch_lines_lot_id_fkey",
                table: "vpp_dispatch_lines");

            migrationBuilder.DropForeignKey(
                name: "vpp_import_lines_lot_id_fkey",
                table: "vpp_import_lines");

            migrationBuilder.DropTable(
                name: "vpp_item_lots");

            migrationBuilder.DropIndex(
                name: "IX_vpp_import_lines_lot_id",
                table: "vpp_import_lines");

            migrationBuilder.DropIndex(
                name: "IX_vpp_dispatch_lines_lot_id",
                table: "vpp_dispatch_lines");

            migrationBuilder.DropColumn(
                name: "branch",
                table: "vpp_requests");

            migrationBuilder.DropColumn(
                name: "lot_id",
                table: "vpp_import_lines");

            migrationBuilder.DropColumn(
                name: "lot_id",
                table: "vpp_dispatch_lines");

            migrationBuilder.DropColumn(
                name: "total_mismatch_amount",
                table: "reconciliation_runs");

            migrationBuilder.DropColumn(
                name: "total_mismatch_rows",
                table: "reconciliation_runs");

            migrationBuilder.DropColumn(
                name: "branch_name",
                table: "reconciliation_missing_rows");

            migrationBuilder.DropColumn(
                name: "note",
                table: "reconciliation_missing_rows");

            migrationBuilder.DropColumn(
                name: "source",
                table: "reconciliation_missing_rows");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "reconciliation_excess_rows");

            migrationBuilder.DropColumn(
                name: "import_history_id",
                table: "reconciliation_excess_rows");

            migrationBuilder.DropColumn(
                name: "source",
                table: "reconciliation_excess_rows");

            migrationBuilder.DropColumn(
                name: "source_quantity",
                table: "reconciliation_excess_rows");

            migrationBuilder.DropColumn(
                name: "source_revenue",
                table: "reconciliation_excess_rows");
        }
    }
}
