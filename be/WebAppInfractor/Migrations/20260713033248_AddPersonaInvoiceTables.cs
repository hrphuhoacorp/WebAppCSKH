using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonaInvoiceTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_business_customer",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "customer_business_invoices",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    order_id = table.Column<int>(type: "integer", nullable: false),
                    order_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    invoice_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    company_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    buyer_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    invoice_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    import_batch_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("customer_business_invoices_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "persona_business_invoice_imports",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    imported_by = table.Column<int>(type: "integer", nullable: true),
                    imported_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    total_rows = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    matched_rows = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    unmatched_rows = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("persona_business_invoice_imports_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_customer_business_invoices_customer_id",
                table: "customer_business_invoices",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "idx_customer_business_invoices_import_batch_id",
                table: "customer_business_invoices",
                column: "import_batch_id");

            migrationBuilder.CreateIndex(
                name: "ux_customer_business_invoices_order_id",
                table: "customer_business_invoices",
                column: "order_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "customer_business_invoices");

            migrationBuilder.DropTable(
                name: "persona_business_invoice_imports");

            migrationBuilder.DropColumn(
                name: "is_business_customer",
                table: "customers");
        }
    }
}
