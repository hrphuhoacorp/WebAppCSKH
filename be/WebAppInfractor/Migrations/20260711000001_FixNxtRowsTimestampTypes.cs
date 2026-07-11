using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    public partial class FixNxtRowsTimestampTypes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // nxt_rows was created with "timestamp without time zone" (AddNxtTables migration)
            // but EF Core model + snapshot expect "timestamp with time zone".
            // With Npgsql.EnableLegacyTimestampBehavior=false, reading timestamp without tz
            // returns Kind=Unspecified, which Npgsql then refuses to write back to a column it
            // thinks is timestamptz — causing the "Cannot write DateTime with Kind=Unspecified"
            // error on every XNT save. This migration aligns the actual DB columns with the model.
            migrationBuilder.Sql(
                "ALTER TABLE nxt_rows ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC'");
            migrationBuilder.Sql(
                "ALTER TABLE nxt_rows ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC'");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE nxt_rows ALTER COLUMN created_at TYPE timestamp without time zone USING created_at AT TIME ZONE 'UTC'");
            migrationBuilder.Sql(
                "ALTER TABLE nxt_rows ALTER COLUMN updated_at TYPE timestamp without time zone USING updated_at AT TIME ZONE 'UTC'");
        }
    }
}
