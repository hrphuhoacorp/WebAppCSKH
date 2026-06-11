using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddGiftBasketModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "gift_baskets",
                columns: table => new
                {
                    id = table.Column<int>(nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    basket_uid = table.Column<string>(maxLength: 20, nullable: false),
                    branch_id = table.Column<int>(nullable: true),
                    base_code = table.Column<string>(maxLength: 50, nullable: false),
                    basket_name = table.Column<string>(maxLength: 255, nullable: false),
                    current_code = table.Column<string>(maxLength: 50, nullable: false),
                    price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    effective_date = table.Column<string>(maxLength: 20, nullable: true),
                    status = table.Column<string>(maxLength: 20, nullable: false, defaultValue: "active"),
                    front_image_url = table.Column<string>(nullable: true),
                    back_image_url = table.Column<string>(nullable: true),
                    image_overlay_text = table.Column<string>(maxLength: 255, nullable: true),
                    notice = table.Column<string>(nullable: true),
                    note = table.Column<string>(nullable: true),
                    updated_by = table.Column<int>(nullable: true),
                    updated_at = table.Column<DateTime>(nullable: true),
                    created_at = table.Column<DateTime>(nullable: true),
                    deleted_at = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("gift_baskets_pkey", x => x.id);
                    table.ForeignKey(
                        name: "gift_baskets_branch_id_fkey",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "gift_code_mappings",
                columns: table => new
                {
                    id = table.Column<int>(nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(maxLength: 50, nullable: false),
                    base_code = table.Column<string>(maxLength: 50, nullable: false),
                    basket_name = table.Column<string>(maxLength: 255, nullable: false),
                    branch_id = table.Column<int>(nullable: true),
                    basket_id = table.Column<int>(nullable: true),
                    active = table.Column<bool>(nullable: false, defaultValue: true),
                    source = table.Column<string>(maxLength: 50, nullable: false, defaultValue: "library-sync"),
                    updated_at = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("gift_code_mappings_pkey", x => x.id);
                    table.ForeignKey(
                        name: "gift_code_mappings_branch_id_fkey",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "gift_code_mappings_basket_id_fkey",
                        column: x => x.basket_id,
                        principalTable: "gift_baskets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "sapo_sales",
                columns: table => new
                {
                    id = table.Column<int>(nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    report_date = table.Column<string>(maxLength: 20, nullable: true),
                    branch = table.Column<string>(maxLength: 100, nullable: true),
                    product_type = table.Column<string>(maxLength: 255, nullable: true),
                    sku = table.Column<string>(maxLength: 100, nullable: true),
                    basket_code = table.Column<string>(maxLength: 50, nullable: true),
                    report_code = table.Column<string>(maxLength: 50, nullable: true),
                    report_name = table.Column<string>(maxLength: 255, nullable: true),
                    product_name = table.Column<string>(maxLength: 500, nullable: true),
                    price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    qty = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    orders = table.Column<int>(nullable: false),
                    revenue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    net_revenue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    import_batch_id = table.Column<string>(maxLength: 50, nullable: true),
                    uploaded_by = table.Column<int>(nullable: true),
                    uploaded_at = table.Column<DateTime>(nullable: true),
                    imported_at = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("sapo_sales_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sapo_imports",
                columns: table => new
                {
                    id = table.Column<int>(nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    report_date = table.Column<string>(maxLength: 50, nullable: false),
                    import_batch_id = table.Column<string>(maxLength: 50, nullable: false),
                    uploaded_by = table.Column<int>(nullable: true),
                    uploaded_at = table.Column<DateTime>(nullable: true),
                    row_count = table.Column<int>(nullable: false),
                    net_revenue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    orders = table.Column<int>(nullable: false),
                    qty = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    note = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("sapo_imports_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "gift_code_change_requests",
                columns: table => new
                {
                    id = table.Column<int>(nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    batch_id = table.Column<string>(maxLength: 50, nullable: false),
                    batch_note = table.Column<string>(nullable: true),
                    request_uid = table.Column<string>(maxLength: 50, nullable: false),
                    branch_id = table.Column<int>(nullable: true),
                    basket_code_or_name = table.Column<string>(maxLength: 255, nullable: false),
                    reason = table.Column<string>(nullable: false),
                    note = table.Column<string>(nullable: true),
                    priority = table.Column<string>(maxLength: 20, nullable: false, defaultValue: "normal"),
                    front_image_url = table.Column<string>(nullable: true),
                    back_image_url = table.Column<string>(nullable: true),
                    status = table.Column<string>(maxLength: 20, nullable: false, defaultValue: "pending"),
                    handled_by = table.Column<int>(nullable: true),
                    handled_at = table.Column<DateTime>(nullable: true),
                    result_note = table.Column<string>(nullable: true),
                    created_by = table.Column<int>(nullable: true),
                    created_at = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("gift_code_change_requests_pkey", x => x.id);
                    table.ForeignKey(
                        name: "gift_ccr_branch_id_fkey",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex("idx_gift_baskets_branch_id", "gift_baskets", "branch_id");
            migrationBuilder.CreateIndex("idx_gift_baskets_current_code", "gift_baskets", "current_code");
            migrationBuilder.CreateIndex("idx_gift_baskets_status", "gift_baskets", "status");
            migrationBuilder.CreateIndex("idx_gift_code_mappings_code_branch", "gift_code_mappings", new[] { "code", "branch_id" });
            migrationBuilder.CreateIndex("idx_sapo_sales_report_date", "sapo_sales", "report_date");
            migrationBuilder.CreateIndex("idx_sapo_sales_import_batch_id", "sapo_sales", "import_batch_id");
            migrationBuilder.CreateIndex("idx_gift_ccr_status", "gift_code_change_requests", "status");
            migrationBuilder.CreateIndex("idx_gift_ccr_branch_id", "gift_code_change_requests", "branch_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable("gift_code_change_requests");
            migrationBuilder.DropTable("sapo_imports");
            migrationBuilder.DropTable("sapo_sales");
            migrationBuilder.DropTable("gift_code_mappings");
            migrationBuilder.DropTable("gift_baskets");
        }
    }
}
