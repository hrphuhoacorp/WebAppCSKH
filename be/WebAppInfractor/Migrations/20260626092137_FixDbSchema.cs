using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class FixDbSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "trang_thai",
                table: "order_status",
                newName: "status");

            migrationBuilder.Sql(
                "ALTER TABLE sapo_code_mappings ALTER COLUMN active DROP DEFAULT");
            migrationBuilder.Sql(
                "ALTER TABLE sapo_code_mappings ALTER COLUMN active TYPE boolean USING (active::boolean)");
            migrationBuilder.Sql(
                "ALTER TABLE sapo_code_mappings ALTER COLUMN active SET DEFAULT TRUE");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "recruitment_candidates",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "new",
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldDefaultValue: "CV mới / NV Đã gửi");

            migrationBuilder.AlterColumn<decimal>(
                name: "quantity",
                table: "order_items",
                type: "numeric",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_recruitment_mail_templates_template_type",
                table: "recruitment_mail_templates",
                column: "template_type",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_recruitment_candidates_deleted_at",
                table: "recruitment_candidates",
                column: "deleted_at");

            migrationBuilder.CreateIndex(
                name: "IX_recruitment_candidates_status",
                table: "recruitment_candidates",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_recruitment_campaigns_deleted_at",
                table: "recruitment_campaigns",
                column: "deleted_at");

            migrationBuilder.CreateIndex(
                name: "IX_recruitment_campaigns_status",
                table: "recruitment_campaigns",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_recruitment_mail_templates_template_type",
                table: "recruitment_mail_templates");

            migrationBuilder.DropIndex(
                name: "IX_recruitment_candidates_deleted_at",
                table: "recruitment_candidates");

            migrationBuilder.DropIndex(
                name: "IX_recruitment_candidates_status",
                table: "recruitment_candidates");

            migrationBuilder.DropIndex(
                name: "IX_recruitment_campaigns_deleted_at",
                table: "recruitment_campaigns");

            migrationBuilder.DropIndex(
                name: "IX_recruitment_campaigns_status",
                table: "recruitment_campaigns");

            migrationBuilder.RenameColumn(
                name: "status",
                table: "order_status",
                newName: "trang_thai");

            migrationBuilder.AlterColumn<string>(
                name: "active",
                table: "sapo_code_mappings",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "TRUE",
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "recruitment_candidates",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "CV mới / NV Đã gửi",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldDefaultValue: "new");

            migrationBuilder.AlterColumn<decimal>(
                name: "quantity",
                table: "order_items",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric");
        }
    }
}
