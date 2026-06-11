using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class DropSapoTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sapo_imports");

            migrationBuilder.DropTable(
                name: "sapo_sales");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "sapo_imports",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    import_batch_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    net_revenue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    orders = table.Column<int>(type: "integer", nullable: false),
                    qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    report_date = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    row_count = table.Column<int>(type: "integer", nullable: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    uploaded_by = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("sapo_imports_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sapo_sales",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    basket_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    branch = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    import_batch_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    imported_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    net_revenue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    orders = table.Column<int>(type: "integer", nullable: false),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    product_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    product_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    report_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    report_date = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    report_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    revenue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    uploaded_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    uploaded_by = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("sapo_sales_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_sapo_sales_import_batch_id",
                table: "sapo_sales",
                column: "import_batch_id");

            migrationBuilder.CreateIndex(
                name: "idx_sapo_sales_report_date",
                table: "sapo_sales",
                column: "report_date");
        }
    }
}
