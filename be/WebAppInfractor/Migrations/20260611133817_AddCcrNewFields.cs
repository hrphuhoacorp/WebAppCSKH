using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddCcrNewFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "reason",
                table: "gift_code_change_requests",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "basket_code_or_name",
                table: "gift_code_change_requests",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);

            migrationBuilder.AddColumn<string>(
                name: "ApprovedDate",
                table: "gift_code_change_requests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GroupCode",
                table: "gift_code_change_requests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NewCode",
                table: "gift_code_change_requests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OldCode",
                table: "gift_code_change_requests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                table: "gift_code_change_requests",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SentZaloPhoto",
                table: "gift_code_change_requests",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovedDate",
                table: "gift_code_change_requests");

            migrationBuilder.DropColumn(
                name: "GroupCode",
                table: "gift_code_change_requests");

            migrationBuilder.DropColumn(
                name: "NewCode",
                table: "gift_code_change_requests");

            migrationBuilder.DropColumn(
                name: "OldCode",
                table: "gift_code_change_requests");

            migrationBuilder.DropColumn(
                name: "Price",
                table: "gift_code_change_requests");

            migrationBuilder.DropColumn(
                name: "SentZaloPhoto",
                table: "gift_code_change_requests");

            migrationBuilder.AlterColumn<string>(
                name: "reason",
                table: "gift_code_change_requests",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "basket_code_or_name",
                table: "gift_code_change_requests",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);
        }
    }
}
