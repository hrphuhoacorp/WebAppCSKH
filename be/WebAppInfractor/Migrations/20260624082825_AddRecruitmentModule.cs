using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class AddRecruitmentModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "recruitment_campaigns",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    position = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    quantity_needed = table.Column<int>(type: "integer", nullable: true),
                    start_date = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    end_date = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    post_content = table.Column<string>(type: "text", nullable: true),
                    requirements = table.Column<string>(type: "text", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "open"),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("recruitment_campaigns_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "recruitment_categories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    value = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("recruitment_categories_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "recruitment_mail_templates",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    template_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    subject = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("recruitment_mail_templates_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "recruitment_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    default_contact = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    default_phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    default_location = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    signature = table.Column<string>(type: "text", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("recruitment_settings_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "recruitment_candidates",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    campaign_id = table.Column<int>(type: "integer", nullable: true),
                    candidate_name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    email = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    position = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    source_other_note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    cv_link = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    cv_file_name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    cv_file_path = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    cv_note = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "new"),
                    waiting_for = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    interview_time = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    interview_note = table.Column<string>(type: "text", nullable: true),
                    result = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    offer_note = table.Column<string>(type: "text", nullable: true),
                    onboard_date = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    mail_invite_sent = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    mail_result_sent = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("recruitment_candidates_pkey", x => x.id);
                    table.ForeignKey(
                        name: "recruitment_candidates_campaign_id_fkey",
                        column: x => x.campaign_id,
                        principalTable: "recruitment_campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "recruitment_candidate_history",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    candidate_id = table.Column<int>(type: "integer", nullable: false),
                    acted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    acted_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    action = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("recruitment_candidate_history_pkey", x => x.id);
                    table.ForeignKey(
                        name: "recruitment_candidate_history_candidate_id_fkey",
                        column: x => x.candidate_id,
                        principalTable: "recruitment_candidates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_recruitment_candidate_history_candidate_id",
                table: "recruitment_candidate_history",
                column: "candidate_id");

            migrationBuilder.CreateIndex(
                name: "IX_recruitment_candidates_campaign_id",
                table: "recruitment_candidates",
                column: "campaign_id");

            // Seed default settings row
            migrationBuilder.InsertData(
                table: "recruitment_settings",
                columns: new[] { "default_contact", "default_phone", "default_location", "signature" },
                values: new object[] { "Phòng Nhân sự - Phú Hoa Corp", "0901 234 567", "Văn phòng Phú Hoa Corp", "Trân trọng,\nPhòng Nhân sự - Phú Hoa Corp" });

            // Seed default mail templates
            migrationBuilder.InsertData(
                table: "recruitment_mail_templates",
                columns: new[] { "template_type", "subject", "content" },
                values: new object[,]
                {
                    {
                        "invite",
                        "Thư mời phỏng vấn - {position}",
                        "<p>Kính gửi Anh/Chị <strong>{name}</strong>,</p>\n<p>Cảm ơn Anh/Chị đã quan tâm đến vị trí <strong>{position}</strong> tại Phú Hoa Corp.</p>\n<p>Chúng tôi trân trọng mời Anh/Chị tham dự buổi phỏng vấn:</p>\n<ul>\n<li><strong>Thời gian:</strong> {interview_time}</li>\n<li><strong>Địa điểm:</strong> {location}</li>\n<li><strong>Liên hệ:</strong> {contact} - {phone}</li>\n</ul>\n<p>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ chúng tôi qua email hoặc số điện thoại trên.</p>\n<p>{signature}</p>"
                    },
                    {
                        "result_pass",
                        "Kết quả phỏng vấn - {position}",
                        "<p>Kính gửi Anh/Chị <strong>{name}</strong>,</p>\n<p>Cảm ơn Anh/Chị đã tham dự buổi phỏng vấn cho vị trí <strong>{position}</strong> tại Phú Hoa Corp.</p>\n<p>Chúng tôi vui mừng thông báo Anh/Chị đã <strong>vượt qua vòng phỏng vấn</strong> thành công. Chúng tôi sẽ liên hệ để trao đổi về các bước tiếp theo.</p>\n<p>Mọi thắc mắc vui lòng liên hệ: {contact} - {phone}</p>\n<p>{signature}</p>"
                    },
                    {
                        "result_fail",
                        "Kết quả phỏng vấn - {position}",
                        "<p>Kính gửi Anh/Chị <strong>{name}</strong>,</p>\n<p>Cảm ơn Anh/Chị đã dành thời gian tham dự buổi phỏng vấn cho vị trí <strong>{position}</strong> tại Phú Hoa Corp.</p>\n<p>Sau khi xem xét kỹ lưỡng, chúng tôi rất tiếc phải thông báo rằng hồ sơ của Anh/Chị chưa phù hợp với yêu cầu vị trí tại thời điểm này. Chúng tôi sẽ lưu hồ sơ và liên hệ lại khi có cơ hội phù hợp.</p>\n<p>Chúc Anh/Chị thành công trong sự nghiệp.</p>\n<p>{signature}</p>"
                    }
                });

            // Seed default categories
            migrationBuilder.InsertData(
                table: "recruitment_categories",
                columns: new[] { "type", "value", "sort_order" },
                values: new object[,]
                {
                    { "source", "Facebook", 1 },
                    { "source", "Zalo", 2 },
                    { "source", "Người quen giới thiệu", 3 },
                    { "source", "Website tuyển dụng", 4 },
                    { "source", "Khác", 5 },
                    { "status", "Mới nộp", 1 },
                    { "status", "Đang xét hồ sơ", 2 },
                    { "status", "Mời phỏng vấn", 3 },
                    { "status", "Đã phỏng vấn", 4 },
                    { "status", "Đã có kết quả", 5 },
                    { "status", "Đã nhận việc", 6 },
                    { "status", "Từ chối", 7 },
                    { "status", "Không tiếp tục", 8 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "recruitment_candidate_history");

            migrationBuilder.DropTable(
                name: "recruitment_categories");

            migrationBuilder.DropTable(
                name: "recruitment_mail_templates");

            migrationBuilder.DropTable(
                name: "recruitment_settings");

            migrationBuilder.DropTable(
                name: "recruitment_candidates");

            migrationBuilder.DropTable(
                name: "recruitment_campaigns");
        }
    }
}
