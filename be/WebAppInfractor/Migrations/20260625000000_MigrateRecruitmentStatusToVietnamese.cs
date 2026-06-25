using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using WebAppInfractor.Data;

#nullable disable

namespace WebAppInfractor.Migrations
{
    [DbContext(typeof(MemBerContext))]
    [Migration("20260625000000_MigrateRecruitmentStatusToVietnamese")]
    public partial class MigrateRecruitmentStatusToVietnamese : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Increase column size to hold Vietnamese status strings
            migrationBuilder.Sql(@"
ALTER TABLE recruitment_candidates ALTER COLUMN status TYPE character varying(100);
ALTER TABLE recruitment_candidates ALTER COLUMN status SET DEFAULT 'CV mới / NV Đã gửi';
");

            // Migrate old English statuses to Vietnamese workflow statuses
            migrationBuilder.Sql(@"
UPDATE recruitment_candidates SET status = 'CV mới / NV Đã gửi'              WHERE status = 'new';
UPDATE recruitment_candidates SET status = 'Chờ TBP kiểm tra CV'             WHERE status = 'reviewing';
UPDATE recruitment_candidates SET status = 'Đã hẹn PV - chưa mail'           WHERE status = 'interview';
UPDATE recruitment_candidates SET status = 'Pass - chưa gửi thỏa thuận'      WHERE status = 'offer';
UPDATE recruitment_candidates SET status = 'Hoàn tất'                         WHERE status = 'hired';
UPDATE recruitment_candidates SET status = 'Không phù hợp CV'                 WHERE status = 'rejected';
UPDATE recruitment_candidates SET status = 'Chờ Nhân viên liên hệ hẹn PV'    WHERE status = 'waiting';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE recruitment_candidates SET status = 'new'        WHERE status = 'CV mới / NV Đã gửi';
UPDATE recruitment_candidates SET status = 'reviewing'  WHERE status = 'Chờ TBP kiểm tra CV';
UPDATE recruitment_candidates SET status = 'interview'  WHERE status = 'Đã hẹn PV - chưa mail';
UPDATE recruitment_candidates SET status = 'offer'      WHERE status = 'Pass - chưa gửi thỏa thuận';
UPDATE recruitment_candidates SET status = 'hired'      WHERE status = 'Hoàn tất';
UPDATE recruitment_candidates SET status = 'rejected'   WHERE status = 'Không phù hợp CV';
UPDATE recruitment_candidates SET status = 'waiting'    WHERE status = 'Chờ Nhân viên liên hệ hẹn PV';
UPDATE recruitment_candidates SET status = 'new'        WHERE status NOT IN ('new','reviewing','interview','offer','hired','rejected','waiting');
");

            migrationBuilder.Sql(@"
ALTER TABLE recruitment_candidates ALTER COLUMN status TYPE character varying(50);
ALTER TABLE recruitment_candidates ALTER COLUMN status SET DEFAULT 'new';
");
        }
    }
}
