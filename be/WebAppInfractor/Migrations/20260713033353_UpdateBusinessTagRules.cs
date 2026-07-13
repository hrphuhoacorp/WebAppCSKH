using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class UpdateBusinessTagRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Bật lại luật tự động cho 6 tag doanh nghiệp (trước đó rule_config = NULL vì thiếu
            // tín hiệu VAT). Giờ đã có Customer.IsBusinessCustomer (từ tính năng nạp hóa đơn —
            // xem PersonaInvoiceService) nên dùng điều kiện business_customer kết hợp AND với
            // tiêu chí đơn hàng "Tự động" đã ghi sẵn trong file Excel gốc cho từng dòng.
            //
            // LƯU Ý: dòng 11 (quà nội bộ) và dòng 12 (quà đối tác) trong file gốc chỉ phân biệt
            // được qua "nội dung lời chúc" — dữ liệu đơn hàng không có tín hiệu này, nên 2 luật
            // tự động dưới đây GIỐNG NHAU (chỉ khác gợi ý combo giỏ quà); tách 2 nhóm này vẫn
            // cần nhân viên xem lời chúc và gắn tay đúng nhóm. Tên nhóm hàng vẫn CHƯA được đối
            // chiếu với dữ liệu Sapo thật — kiểm tra lại qua ô chọn nhóm hàng trước khi Chạy.
            //
            // dai_ly_ban_si: file gốc ghi rõ công ty ""đã ngưng khai thác"" nhóm này — luật vẫn
            // được tạo sẵn nhưng tag chuyển is_active = false để không tự chạy/tính vào Chạy tất
            // cả, tránh phân loại nhầm vào nhóm không còn được chăm sóc. Bật lại bất cứ lúc nào
            // qua nút Sửa tag.
            migrationBuilder.Sql(@"
UPDATE persona_tags SET
    rule_config = '{""combinator"":""AND"",""conditions"":[{""type"":""business_customer""},{""type"":""category_revenue_share"",""categories"":[""Giỏ quà tặng""],""minSharePercent"":30,""lookbackDays"":180}]}',
    updated_at = now()
WHERE code = 'dn_qua_tang_noi_bo';

UPDATE persona_tags SET
    rule_config = '{""combinator"":""AND"",""conditions"":[{""type"":""business_customer""},{""type"":""category_revenue_share"",""categories"":[""Giỏ quà tặng""],""minSharePercent"":30,""lookbackDays"":180}]}',
    updated_at = now()
WHERE code = 'dn_qua_tang_doi_tac';

UPDATE persona_tags SET
    rule_config = '{""combinator"":""AND"",""conditions"":[{""type"":""business_customer""},{""type"":""category_revenue_share"",""categories"":[""Trái cây tươi nội địa"",""Trái cây tươi nhập khẩu""],""minSharePercent"":40,""lookbackDays"":90},{""type"":""order_frequency"",""minOrderCount"":2,""lookbackDays"":30,""categories"":null}]}',
    updated_at = now()
WHERE code = 'dn_pantry_tea_break';

UPDATE persona_tags SET
    rule_config = '{""combinator"":""AND"",""conditions"":[{""type"":""business_customer""},{""type"":""category_revenue_share"",""categories"":[""Trái cây tươi nội địa"",""Trái cây tươi nhập khẩu"",""Rau Củ Quả""],""minSharePercent"":50,""lookbackDays"":90},{""type"":""order_frequency"",""minOrderCount"":8,""lookbackDays"":30,""categories"":null}]}',
    updated_at = now()
WHERE code = 'kh_fnb_nguyen_lieu';

UPDATE persona_tags SET
    rule_config = '{""combinator"":""AND"",""conditions"":[{""type"":""business_customer""},{""type"":""order_frequency"",""minOrderCount"":4,""lookbackDays"":30,""categories"":null}]}',
    is_active = false,
    updated_at = now()
WHERE code = 'dai_ly_ban_si';

UPDATE persona_tags SET
    rule_config = '{""combinator"":""AND"",""conditions"":[{""type"":""business_customer""},{""type"":""order_frequency"",""minOrderCount"":3,""lookbackDays"":90,""categories"":null}]}',
    updated_at = now()
WHERE code = 'dv_gio_qua_tiem_hoa';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE persona_tags SET rule_config = NULL, updated_at = now()
WHERE code IN ('dn_qua_tang_noi_bo', 'dn_qua_tang_doi_tac', 'dn_pantry_tea_break', 'kh_fnb_nguyen_lieu', 'dv_gio_qua_tiem_hoa');

UPDATE persona_tags SET rule_config = NULL, is_active = true, updated_at = now()
WHERE code = 'dai_ly_ban_si';
");
        }
    }
}
