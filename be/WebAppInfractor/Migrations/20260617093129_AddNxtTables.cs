using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddNxtTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "nxt_adjustment_logs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    close_date = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    branch = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    wrong_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    right_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    user = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    detail = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("nxt_adjustment_logs_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "nxt_rows",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    close_date = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    branch = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    item_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    opening_stock = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    opening_source = table.Column<string>(type: "text", nullable: true),
                    gift_in = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    receive_branch = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    transfer_branch = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    cancel_basket = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    sapo_sold = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    adjustment = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    actual_stock = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    sold_not_picked = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    revenue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    order_count = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    transfer_notes = table.Column<string>(type: "jsonb", nullable: true),
                    inactive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("nxt_rows_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_nxt_adj_close_date",
                table: "nxt_adjustment_logs",
                column: "close_date");

            migrationBuilder.CreateIndex(
                name: "idx_nxt_adj_created_at",
                table: "nxt_adjustment_logs",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "idx_nxt_rows_key",
                table: "nxt_rows",
                columns: new[] { "close_date", "branch", "item_code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "nxt_adjustment_logs");

            migrationBuilder.DropTable(
                name: "nxt_rows");
        }
    }
}
