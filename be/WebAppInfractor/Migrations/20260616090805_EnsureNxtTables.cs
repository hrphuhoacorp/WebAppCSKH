using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class EnsureNxtTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS nxt_adjustments (
    id SERIAL PRIMARY KEY,
    import_id VARCHAR(50) NOT NULL,
    date VARCHAR(10) NOT NULL,
    branch VARCHAR(50) NOT NULL,
    wrong_code VARCHAR(50) NOT NULL,
    right_code VARCHAR(50),
    qty INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL DEFAULT 'Đổi mã tạm/nhập nhầm',
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    created_by VARCHAR(50),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS nxt_closings (
    id SERIAL PRIMARY KEY,
    date VARCHAR(10) NOT NULL,
    branch VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'closed',
    note TEXT,
    closed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    closed_by VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS nxt_gift_in (
    id SERIAL PRIMARY KEY,
    import_id VARCHAR(50) NOT NULL,
    date VARCHAR(10) NOT NULL,
    branch VARCHAR(50) NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    sku VARCHAR(100),
    item_name TEXT,
    qty INTEGER NOT NULL,
    price NUMERIC(18,2),
    code_type VARCHAR(100),
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    created_by VARCHAR(50),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS nxt_sapo_imports (
    id SERIAL PRIMARY KEY,
    import_id VARCHAR(50) NOT NULL,
    file_name TEXT,
    import_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    rows_read INTEGER NOT NULL,
    rows_saved INTEGER NOT NULL,
    date_min VARCHAR(10),
    date_max VARCHAR(10),
    total_net_qty INTEGER NOT NULL,
    total_revenue NUMERIC(18,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    created_by VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS nxt_sapo_sales (
    id SERIAL PRIMARY KEY,
    import_id VARCHAR(50) NOT NULL,
    row_no INTEGER NOT NULL,
    date VARCHAR(10) NOT NULL,
    product_type VARCHAR(100),
    sku VARCHAR(100),
    variant_name TEXT,
    item_code VARCHAR(50) NOT NULL,
    warehouse_status VARCHAR(100),
    payment_status VARCHAR(100),
    order_status VARCHAR(100),
    branch VARCHAR(50) NOT NULL,
    sold_qty INTEGER NOT NULL,
    net_sold_qty INTEGER NOT NULL,
    order_count INTEGER NOT NULL,
    revenue NUMERIC(18,2) NOT NULL,
    net_revenue NUMERIC(18,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    created_by VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS nxt_stock_counts (
    id SERIAL PRIMARY KEY,
    import_id VARCHAR(50) NOT NULL,
    date VARCHAR(10) NOT NULL,
    branch VARCHAR(50) NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    qty INTEGER NOT NULL,
    stock_status VARCHAR(100),
    note TEXT,
    source_text TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    created_by VARCHAR(50),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP TABLE IF EXISTS nxt_adjustments;
DROP TABLE IF EXISTS nxt_closings;
DROP TABLE IF EXISTS nxt_gift_in;
DROP TABLE IF EXISTS nxt_sapo_imports;
DROP TABLE IF EXISTS nxt_sapo_sales;
DROP TABLE IF EXISTS nxt_stock_counts;
");
        }
    }
}
