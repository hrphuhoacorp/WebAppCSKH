using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class DropOrderCodeUniqueConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_code_key;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS orders_order_code_key;");
            migrationBuilder.CreateIndex(
                name: "orders_order_code_key",
                table: "orders",
                column: "order_code");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "orders_order_code_key",
                table: "orders");

            migrationBuilder.AddUniqueConstraint(
                name: "orders_order_code_key",
                table: "orders",
                column: "order_code");
        }
    }
}
