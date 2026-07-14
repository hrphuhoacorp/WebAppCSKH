using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddFbCampaignTagsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "fb_campaign_tags",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    campaign_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    campaign_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    categories_json = table.Column<string>(type: "jsonb", nullable: false),
                    date_from = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_to = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("fb_campaign_tags_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_fb_campaign_tags_campaign_id",
                table: "fb_campaign_tags",
                column: "campaign_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "fb_campaign_tags");
        }
    }
}
