using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageReportCreatedBy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "created_by",
                table: "message_reports",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_message_reports_created_by",
                table: "message_reports",
                column: "created_by");

            migrationBuilder.AddForeignKey(
                name: "message_reports_created_by_fkey",
                table: "message_reports",
                column: "created_by",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "message_reports_created_by_fkey",
                table: "message_reports");

            migrationBuilder.DropIndex(
                name: "IX_message_reports_created_by",
                table: "message_reports");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "message_reports");
        }
    }
}
