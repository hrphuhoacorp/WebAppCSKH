using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using WebAppInfractor.Data;

#nullable disable

namespace WebAppInfractor.Migrations
{
    [DbContext(typeof(MemBerContext))]
    [Migration("20260624000000_AddStockStatusToNxtRow")]
    public partial class AddStockStatusToNxtRow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "stock_status",
                table: "nxt_rows",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "stock_status",
                table: "nxt_rows");
        }
    }
}
