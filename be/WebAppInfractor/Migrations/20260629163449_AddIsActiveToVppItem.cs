using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using WebAppInfractor.Data;

#nullable disable

namespace WebAppInfractor.Migrations
{
    [DbContext(typeof(MemBerContext))]
    [Migration("20260629163449_AddIsActiveToVppItem")]
    public partial class AddIsActiveToVppItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "vpp_items",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_active",
                table: "vpp_items");
        }
    }
}
