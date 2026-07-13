using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppInfractor.Migrations
{
    /// <inheritdoc />
    public partial class SeedPersonaTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Dựng sẵn 15 chân dung khách hàng đúng theo file "CHÂN DUNG KHÁCH HÀNG.xlsx" của
            // công ty. 6 chân dung có luật tự động (dựa trên nhóm hàng + tần suất mua — những
            // gì dữ liệu đơn hàng hiện có cho phép tính được); 9 chân dung còn lại để
            // rule_config = NULL (chỉ gắn thủ công) vì tiêu chí gốc phụ thuộc tín hiệu "xuất
            // hóa đơn VAT công ty"/"địa chỉ giao là công ty" mà hệ thống CHƯA có (chờ tính năng
            // hóa đơn điện tử sau này, đã thống nhất với chủ doanh nghiệp).
            //
            // LƯU Ý QUAN TRỌNG: tên nhóm hàng trong rule_config (vd "Trái cây tươi nội địa")
            // lấy nguyên văn từ file Excel gốc — CHƯA được đối chiếu với giá trị category thật
            // trong dữ liệu Sapo (không có quyền truy vấn DB trực tiếp). Trước khi bấm "Chạy
            // phân loại", vào từng tag mục "Luật tự động" → xem lại/chỉnh sửa ô chọn nhóm hàng
            // cho khớp đúng danh sách thật (đã có sẵn ô tìm kiếm lấy từ dữ liệu thật).
            migrationBuilder.Sql(@"
INSERT INTO persona_tags (code, name, description, color, rule_config, is_active, display_order)
VALUES
(
    'kh_trai_cay_rau_cu_hang_ngay',
    N'Khách mua trái cây/rau củ hằng ngày',
    N'Mua trái cây tươi, rau củ để tiêu dùng hằng ngày cho gia đình, tần suất 1-3 lần/tuần.',
    '#086839',
    '{""combinator"":""AND"",""conditions"":[{""type"":""category_revenue_share"",""categories"":[""Trái cây tươi nội địa"",""Trái cây tươi nhập khẩu"",""Rau Củ Quả""],""minSharePercent"":50,""lookbackDays"":90},{""type"":""order_frequency"",""minOrderCount"":4,""lookbackDays"":30,""categories"":null}]}',
    true, 10
),
(
    'kh_mua_trai_cay_cung',
    N'Khách mua trái cây cúng',
    N'Mua trái cây cúng mùng 1, rằm, giỗ, lễ, khai trương, thần tài — đơn hàng lặp lại theo chu kỳ âm lịch.',
    '#f59e0b',
    '{""combinator"":""AND"",""conditions"":[{""type"":""lunar_date_recurrence"",""lunarDays"":[1,15],""windowDays"":1,""minOccurrences"":3,""lookbackMonths"":6}]}',
    true, 20
),
(
    'kh_gio_qua_tang_ca_nhan',
    N'Khách mua giỏ quà tặng cá nhân',
    N'Mua giỏ quà đi thăm, cúng, viếng, tặng sếp — phát sinh ngẫu nhiên, không cố định. File gốc ghi rõ: không cần gắn tag tự động cho nhóm này.',
    '#0ea5e9',
    NULL,
    true, 30
),
(
    'kh_tang_dip_le',
    N'Khách tặng quà dịp lễ/kỷ niệm',
    N'Tặng người thân dịp lễ, tặng thầy cô/đối tác nữ dịp 8/3, 20/10 — phát sinh theo dịp lễ, khoảng 2-8 lần/năm.',
    '#ec4899',
    NULL,
    true, 40
),
(
    'kh_do_an_vat_banh_keo',
    N'Khách mua đồ ăn vặt/bánh kẹo',
    N'Mua bánh kẹo, snack, hạt, ngũ cốc, trái cây sấy, nước giải khát để ăn vặt hằng ngày — ưa sản phẩm mới/hot trend.',
    '#8b5cf6',
    '{""combinator"":""AND"",""conditions"":[{""type"":""category_revenue_share"",""categories"":[""Bánh kẹo"",""Snack"",""Hạt"",""Ngũ cốc"",""Trái cây sấy"",""Nước giải khát""],""minSharePercent"":50,""lookbackDays"":90},{""type"":""order_frequency"",""minOrderCount"":4,""lookbackDays"":30,""categories"":null}]}',
    true, 50
),
(
    'kh_do_kho_gia_dinh',
    N'Khách mua đồ khô/thực phẩm chế biến cho gia đình',
    N'Mua đồ khô, thực phẩm đóng gói, nguyên liệu chế biến phục vụ bữa ăn hằng ngày cho gia đình, khoảng 1-2 lần/tháng.',
    '#10b981',
    '{""combinator"":""AND"",""conditions"":[{""type"":""category_revenue_share"",""categories"":[""Đồ khô"",""Thực phẩm đóng gói""],""minSharePercent"":50,""lookbackDays"":180},{""type"":""order_frequency"",""minOrderCount"":2,""lookbackDays"":60,""categories"":null}]}',
    true, 60
),
(
    'gd_tre_nho_1_3_tuoi',
    N'Gia đình có bé nhỏ 1-3 tuổi',
    N'Mua bánh ăn dặm, sữa, phô mai, thực phẩm chức năng cho bé — có chu kỳ mua lặp lại theo nhu cầu dinh dưỡng của trẻ.',
    '#6366f1',
    '{""combinator"":""AND"",""conditions"":[{""type"":""category_revenue_share"",""categories"":[""Sản phẩm mẹ và bé"",""Thực phẩm ăn dặm""],""minSharePercent"":40,""lookbackDays"":180},{""type"":""order_frequency"",""minOrderCount"":3,""lookbackDays"":90,""categories"":null}]}',
    true, 70
),
(
    'gd_tre_nho_3_tuoi_plus',
    N'Gia đình có trẻ nhỏ 3 tuổi trở lên',
    N'Mua bánh kẹo, đồ uống trẻ em theo hành vi mua sắm ngẫu hứng khi đi cùng gia đình. File gốc ghi rõ: gần như không cần gắn tag chăm sóc.',
    '#dc2626',
    NULL,
    true, 80
),
(
    'kh_quan_tam_suc_khoe',
    N'Khách quan tâm sức khỏe / có người thân lớn tuổi',
    N'Mua thực phẩm chức năng, vitamin, yến sào, đông trùng hạ thảo để bồi bổ sức khỏe, khoảng 1-4 lần/tháng.',
    '#086839',
    '{""combinator"":""AND"",""conditions"":[{""type"":""category_revenue_share"",""categories"":[""Thực phẩm chức năng"",""Yến sào"",""Đông trùng hạ thảo""],""minSharePercent"":40,""lookbackDays"":180},{""type"":""order_frequency"",""minOrderCount"":2,""lookbackDays"":60,""categories"":null}]}',
    true, 90
),
(
    'dn_qua_tang_noi_bo',
    N'Doanh nghiệp mua quà tặng nhân viên (nội bộ)',
    N'Mua giỏ quà Tết/Trung Thu/sinh nhật cho nhân viên. Cần dấu hiệu xuất hóa đơn VAT công ty — hệ thống hiện chưa có dữ liệu này, chờ tính năng hóa đơn điện tử.',
    '#0ea5e9',
    NULL,
    true, 100
),
(
    'dn_qua_tang_doi_tac',
    N'Doanh nghiệp mua quà tặng đối tác/khách hàng',
    N'Mua giỏ quà cao cấp tặng đối tác, khách VIP. Cần dấu hiệu xuất hóa đơn VAT công ty, tương tự nhóm quà nội bộ — chưa tự động hoá được.',
    '#f59e0b',
    NULL,
    true, 110
),
(
    'dn_pantry_tea_break',
    N'Doanh nghiệp mua trái cây/pantry/tea break',
    N'Mua trái cây, bánh, tea break phục vụ văn phòng/tiếp khách. Cần dấu hiệu VAT công ty để phân biệt với khách lẻ mua trái cây hằng ngày.',
    '#ec4899',
    NULL,
    true, 120
),
(
    'kh_fnb_nguyen_lieu',
    N'Khách ngành F&B mua nguyên liệu',
    N'Mua trái cây, rau củ, nguyên liệu pha chế với tần suất rất cao (2-7 lần/tuần) cho quán/nhà hàng. Cần dấu hiệu VAT công ty để tránh nhầm với khách lẻ mua nhiều.',
    '#8b5cf6',
    NULL,
    true, 130
),
(
    'dai_ly_ban_si',
    N'Đại lý, nhà bán lẻ khác (mua sỉ)',
    N'Mua sỉ để phân phối lại. Theo ghi chú gốc, công ty hiện đã ngưng khai thác nhóm này do giá chưa cạnh tranh.',
    '#10b981',
    NULL,
    true, 140
),
(
    'dv_gio_qua_tiem_hoa',
    N'Dịch vụ giỏ quà thủ công/tiệm hoa',
    N'Mua trái cây/bánh kẹo để kết hợp vào giỏ quà, bó hoa của tiệm hoa/dịch vụ sự kiện. Cần dấu hiệu VAT công ty để tự động hoá đầy đủ.',
    '#6366f1',
    NULL,
    true, 150
)
ON CONFLICT (code) DO NOTHING;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM persona_tags WHERE code IN (
    'kh_trai_cay_rau_cu_hang_ngay', 'kh_mua_trai_cay_cung', 'kh_gio_qua_tang_ca_nhan',
    'kh_tang_dip_le', 'kh_do_an_vat_banh_keo', 'kh_do_kho_gia_dinh', 'gd_tre_nho_1_3_tuoi',
    'gd_tre_nho_3_tuoi_plus', 'kh_quan_tam_suc_khoe', 'dn_qua_tang_noi_bo', 'dn_qua_tang_doi_tac',
    'dn_pantry_tea_break', 'kh_fnb_nguyen_lieu', 'dai_ly_ban_si', 'dv_gio_qua_tiem_hoa'
);
");
        }
    }
}
