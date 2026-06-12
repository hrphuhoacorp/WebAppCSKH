using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class FixGiftBasketColumnMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Price",
                table: "gift_code_change_requests",
                newName: "price");

            migrationBuilder.RenameColumn(
                name: "SentZaloPhoto",
                table: "gift_code_change_requests",
                newName: "sent_zalo_photo");

            migrationBuilder.RenameColumn(
                name: "OldCode",
                table: "gift_code_change_requests",
                newName: "old_code");

            migrationBuilder.RenameColumn(
                name: "NewCode",
                table: "gift_code_change_requests",
                newName: "new_code");

            migrationBuilder.RenameColumn(
                name: "GroupCode",
                table: "gift_code_change_requests",
                newName: "group_code");

            migrationBuilder.RenameColumn(
                name: "ApprovedDate",
                table: "gift_code_change_requests",
                newName: "approved_date");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "gift_code_mappings",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "gift_code_change_requests",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "price",
                table: "gift_code_change_requests",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "sent_zalo_photo",
                table: "gift_code_change_requests",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<string>(
                name: "old_code",
                table: "gift_code_change_requests",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "new_code",
                table: "gift_code_change_requests",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "group_code",
                table: "gift_code_change_requests",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "approved_date",
                table: "gift_code_change_requests",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "gift_baskets",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "gift_baskets",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "price",
                table: "gift_code_change_requests",
                newName: "Price");

            migrationBuilder.RenameColumn(
                name: "sent_zalo_photo",
                table: "gift_code_change_requests",
                newName: "SentZaloPhoto");

            migrationBuilder.RenameColumn(
                name: "old_code",
                table: "gift_code_change_requests",
                newName: "OldCode");

            migrationBuilder.RenameColumn(
                name: "new_code",
                table: "gift_code_change_requests",
                newName: "NewCode");

            migrationBuilder.RenameColumn(
                name: "group_code",
                table: "gift_code_change_requests",
                newName: "GroupCode");

            migrationBuilder.RenameColumn(
                name: "approved_date",
                table: "gift_code_change_requests",
                newName: "ApprovedDate");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "gift_code_mappings",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<decimal>(
                name: "Price",
                table: "gift_code_change_requests",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "gift_code_change_requests",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<bool>(
                name: "SentZaloPhoto",
                table: "gift_code_change_requests",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<string>(
                name: "OldCode",
                table: "gift_code_change_requests",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "NewCode",
                table: "gift_code_change_requests",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "GroupCode",
                table: "gift_code_change_requests",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ApprovedDate",
                table: "gift_code_change_requests",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "gift_baskets",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "gift_baskets",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");
        }
    }
}
