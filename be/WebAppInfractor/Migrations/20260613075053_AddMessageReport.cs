using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageReport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "users",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "users",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "user_roles",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "roles",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "roles",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "orders",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "purchase_date",
                table: "orders",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "orders",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "order_items",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "media_folders",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "media_folders",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "media_files",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "internal_news",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "import_date",
                table: "imports_history",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "gift_code_mappings",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "gift_code_change_requests",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "gift_baskets",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "gift_baskets",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "customers",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "customers",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "branches",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "branches",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "activity_logs",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())");

            migrationBuilder.CreateTable(
                name: "message_reports",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    report_date = table.Column<DateOnly>(type: "date", nullable: false),
                    type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    count = table.Column<int>(type: "integer", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("message_reports_pkey", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "message_reports");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "users",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "users",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "user_roles",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "roles",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "roles",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "orders",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "purchase_date",
                table: "orders",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "orders",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "order_items",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "media_folders",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "media_folders",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "media_files",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "internal_news",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "import_date",
                table: "imports_history",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "gift_code_mappings",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "gift_code_change_requests",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "gift_baskets",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "gift_baskets",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "customers",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "customers",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "branches",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "branches",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "activity_logs",
                type: "timestamp without time zone",
                nullable: true,
                defaultValueSql: "timezone('Asia/Ho_Chi_Minh'::text, now())",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true,
                oldDefaultValueSql: "now()");
        }
    }
}
