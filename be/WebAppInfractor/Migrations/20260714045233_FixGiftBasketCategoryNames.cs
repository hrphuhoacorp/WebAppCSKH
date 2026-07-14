using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class FixGiftBasketCategoryNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // "Giỏ quà tặng" trong rule_config của dn_qua_tang_noi_bo/dn_qua_tang_doi_tac (seed ở
            // UpdateBusinessTagRules) là tên nhóm hàng CẤP 1 trong file DM Mã Sản Phẩm — nhưng
            // OrderItem.Category lưu tên CẤP 2 (đã xác nhận qua các category khác đang chạy đúng
            // như "Trái cây tươi nội địa"), nên "Giỏ quà tặng" không khớp được dòng nào, khiến 2
            // tag này luôn ra 0 khách dù có luật. Thay bằng danh sách đầy đủ tên cấp 2 thật thuộc
            // nhóm cấp 1 "Giỏ quà tặng" trong file phân loại SKU. Cũng CHƯA được đối chiếu với dữ
            // liệu Sapo thật — kiểm tra lại qua ô chọn nhóm hàng (Nhóm hàng > tìm "giỏ quà") trước
            // khi Chạy, giống lưu ý đã ghi ở UpdateBusinessTagRules.
            migrationBuilder.Sql(@"
UPDATE persona_tags SET
    rule_config = '{""combinator"":""AND"",""conditions"":[{""type"":""business_customer""},{""type"":""category_revenue_share"",""categories"":[""Giỏ quà tặng trái cây"",""Giỏ quà trái cây PHF"",""Giỏ quà trái cây có hoa"",""Giỏ quà trái cây có bánh kẹo"",""Giỏ quà trái cây có hoa và bánh kẹo"",""Giỏ quà trái cây bó hoa"",""Giỏ trái cây tráp cưới hỏi"",""Giỏ quà tặng bánh kẹo"",""Giỏ quà bánh kẹo PHF"",""Giỏ quà bánh kẹo Vui tết"",""Giỏ quà bánh kẹo bó hoa"",""Giỏ quà bánh kẹo có rượu"",""Giỏ quà tặng rượu"",""Giỏ quà tặng rượu có bánh kẹo"",""Giỏ quà tặng rượu có trái cây"",""Giỏ quà tặng rau củ"",""Giỏ quà tặng rau củ dạng bó hoa"",""Giỏ quà tặng rau củ có bánh kẹo""],""minSharePercent"":30,""lookbackDays"":180}]}',
    updated_at = now()
WHERE code = 'dn_qua_tang_noi_bo';

UPDATE persona_tags SET
    rule_config = '{""combinator"":""AND"",""conditions"":[{""type"":""business_customer""},{""type"":""category_revenue_share"",""categories"":[""Giỏ quà tặng trái cây"",""Giỏ quà trái cây PHF"",""Giỏ quà trái cây có hoa"",""Giỏ quà trái cây có bánh kẹo"",""Giỏ quà trái cây có hoa và bánh kẹo"",""Giỏ quà trái cây bó hoa"",""Giỏ trái cây tráp cưới hỏi"",""Giỏ quà tặng bánh kẹo"",""Giỏ quà bánh kẹo PHF"",""Giỏ quà bánh kẹo Vui tết"",""Giỏ quà bánh kẹo bó hoa"",""Giỏ quà bánh kẹo có rượu"",""Giỏ quà tặng rượu"",""Giỏ quà tặng rượu có bánh kẹo"",""Giỏ quà tặng rượu có trái cây"",""Giỏ quà tặng rau củ"",""Giỏ quà tặng rau củ dạng bó hoa"",""Giỏ quà tặng rau củ có bánh kẹo""],""minSharePercent"":30,""lookbackDays"":180}]}',
    updated_at = now()
WHERE code = 'dn_qua_tang_doi_tac';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE persona_tags SET
    rule_config = '{""combinator"":""AND"",""conditions"":[{""type"":""business_customer""},{""type"":""category_revenue_share"",""categories"":[""Giỏ quà tặng""],""minSharePercent"":30,""lookbackDays"":180}]}',
    updated_at = now()
WHERE code = 'dn_qua_tang_noi_bo';

UPDATE persona_tags SET
    rule_config = '{""combinator"":""AND"",""conditions"":[{""type"":""business_customer""},{""type"":""category_revenue_share"",""categories"":[""Giỏ quà tặng""],""minSharePercent"":30,""lookbackDays"":180}]}',
    updated_at = now()
WHERE code = 'dn_qua_tang_doi_tac';
");
        }
    }
}
