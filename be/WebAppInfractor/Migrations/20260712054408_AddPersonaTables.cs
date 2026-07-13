using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonaTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "persona_care_schedules",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tag_id = table.Column<int>(type: "integer", nullable: true),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    occasion_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    occasion_config = table.Column<string>(type: "jsonb", nullable: false),
                    lead_days = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_by = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("persona_care_schedules_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "persona_classification_runs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tag_id = table.Column<int>(type: "integer", nullable: false),
                    rule_config_snapshot = table.Column<string>(type: "jsonb", nullable: false),
                    run_by = table.Column<int>(type: "integer", nullable: false),
                    run_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    matched_customer_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    newly_added_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    removed_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    unchanged_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("persona_classification_runs_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "persona_customer_interactions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    channel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    content = table.Column<string>(type: "text", nullable: false),
                    complaint_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("persona_customer_interactions_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "persona_tag_assignments",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    tag_id = table.Column<int>(type: "integer", nullable: false),
                    source = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    run_id = table.Column<int>(type: "integer", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    assigned_by = table.Column<int>(type: "integer", nullable: true),
                    assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    deactivated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deactivated_by_run_id = table.Column<int>(type: "integer", nullable: true),
                    removed_by = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("persona_tag_assignments_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "persona_tags",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    rule_config = table.Column<string>(type: "jsonb", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    display_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_by = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("persona_tags_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_persona_care_schedules_tag_id",
                table: "persona_care_schedules",
                column: "tag_id");

            migrationBuilder.CreateIndex(
                name: "idx_persona_classification_runs_tag_run_at",
                table: "persona_classification_runs",
                columns: new[] { "tag_id", "run_at" });

            migrationBuilder.CreateIndex(
                name: "idx_persona_customer_interactions_customer_occurred",
                table: "persona_customer_interactions",
                columns: new[] { "customer_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "idx_persona_customer_interactions_open_complaints",
                table: "persona_customer_interactions",
                column: "complaint_status",
                filter: "type = 'complaint' AND complaint_status <> 'resolved'");

            migrationBuilder.CreateIndex(
                name: "idx_persona_tag_assignments_customer_id",
                table: "persona_tag_assignments",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "idx_persona_tag_assignments_run_id",
                table: "persona_tag_assignments",
                column: "run_id");

            migrationBuilder.CreateIndex(
                name: "idx_persona_tag_assignments_tag_id",
                table: "persona_tag_assignments",
                column: "tag_id");

            migrationBuilder.CreateIndex(
                name: "ux_persona_tag_assignments_customer_tag_source_active",
                table: "persona_tag_assignments",
                columns: new[] { "customer_id", "tag_id", "source" },
                unique: true,
                filter: "is_active = true");

            migrationBuilder.CreateIndex(
                name: "ux_persona_tags_code",
                table: "persona_tags",
                column: "code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "persona_care_schedules");

            migrationBuilder.DropTable(
                name: "persona_classification_runs");

            migrationBuilder.DropTable(
                name: "persona_customer_interactions");

            migrationBuilder.DropTable(
                name: "persona_tag_assignments");

            migrationBuilder.DropTable(
                name: "persona_tags");
        }
    }
}
