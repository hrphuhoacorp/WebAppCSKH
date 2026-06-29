using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddUniformReturnHistoryToVppItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "uniform_return_history",
                table: "vpp_items",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "uniform_return_history",
                table: "vpp_items");
        }
    }
}
