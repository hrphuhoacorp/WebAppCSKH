using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddPromoTemplateKindFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "template_kind",
                table: "promo_template_layouts",
                type: "character varying(60)",
                maxLength: 60,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30);

            migrationBuilder.AddColumn<string>(
                name: "badge",
                table: "promo_template_layouts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "display_name",
                table: "promo_template_layouts",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "field_config_json",
                table: "promo_template_layouts",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "badge",
                table: "promo_template_layouts");

            migrationBuilder.DropColumn(
                name: "display_name",
                table: "promo_template_layouts");

            migrationBuilder.DropColumn(
                name: "field_config_json",
                table: "promo_template_layouts");

            migrationBuilder.AlterColumn<string>(
                name: "template_kind",
                table: "promo_template_layouts",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(60)",
                oldMaxLength: 60);
        }
    }
}
