using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class DropNxtAdjustmentLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "nxt_adjustment_logs");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "nxt_adjustment_logs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branch = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    close_date = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "now()"),
                    detail = table.Column<string>(type: "text", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    right_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    user = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    wrong_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("nxt_adjustment_logs_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_nxt_adj_close_date",
                table: "nxt_adjustment_logs",
                column: "close_date");

            migrationBuilder.CreateIndex(
                name: "idx_nxt_adj_created_at",
                table: "nxt_adjustment_logs",
                column: "created_at");
        }
    }
}
