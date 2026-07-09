'use client';

import { Dialog, DialogContent, DialogTitle, IconButton, Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { CloseRounded, ExpandMoreRounded } from '@mui/icons-material';

// Port window.showXntGuide (nxt-core.js) — nội dung tĩnh do dev viết sẵn (không phải dữ liệu
// người dùng), giữ nguyên văn qua dangerouslySetInnerHTML thay vì viết lại hàng trăm dòng JSX cho
// nội dung tham khảo thuần túy này.
function guideTable(rows: [string, string][]): string {
    return `<table style="width:100%;border-collapse:collapse;font-size:12.5px;margin:8px 0;">
    <tbody>${rows.map(([a, b]) => `
      <tr>
        <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-weight:700;white-space:nowrap;color:#1e293b;vertical-align:top;">${a}</td>
        <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;color:#475569;">${b}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

const SECTIONS: { title: string; open?: boolean; body: string }[] = [
    {
        title: '1. Bảng Tổng quan là gì — ý nghĩa từng cột', open: true, body: `
      Mỗi dòng trong bảng Tổng quan = <b>1 mã hàng</b> + <b>1 ngày đóng gói</b> + <b>1 chi nhánh</b>.
      ${guideTable([
        ['Tồn đầu', 'Tồn thực tế cuối ngày <b>trước đó</b>, tự động lấy sang (đã trừ phần DTT — xem mục 4).'],
        ['Gói ra', 'Số giỏ xuất từ kho gói trong ngày (nhập ở tab <b>Gói ra</b>).'],
        ['Nhận CN / Chuyển CN', 'Số giỏ nhận từ / chuyển đi chi nhánh khác (nhập ở tab <b>Tồn CN</b>, dòng có chữ &quot;chuyển &lt;chi nhánh&gt;&quot;).'],
        ['Hủy giỏ', 'Số giỏ bị hủy trả lại kho (nhập ở tab <b>Hủy giỏ</b>).'],
        ['Sapo bán', 'Số giỏ được Sapo ghi nhận đã bán.'],
        ['Điều chỉnh', 'Điều chỉnh thủ công khác — sửa SL tay, hoặc tự động từ <b>Sapo treo</b> (xem mục 9).'],
        ['Tồn thực tế', 'Số đếm thực tế cuối ngày khi kiểm kho (nhập ở tab <b>Tồn CN</b>), gồm cả DTT lẫn CTT.'],
        ['DTT/Bán chưa lấy', 'Phần trong Tồn thực tế đã <i>đã thanh toán nhưng khách chưa lấy</i> — xem mục 3.'],
        ['Tồn so sánh', '= Tồn thực tế − DTT.'],
        ['Tồn kỳ vọng', '= Tồn đầu + Gói ra + Nhận CN − Chuyển CN − Sapo bán − Hủy giỏ + Điều chỉnh.'],
        ['Lệch', '= Tồn so sánh − Tồn kỳ vọng. Badge xanh &quot;Khớp&quot; nếu = 0, số đỏ nếu lệch.'],
        ['Gợi ý kiểm tra', 'Gợi ý tự động (không chắc chắn) dựa trên các trường có thể thiếu.'],
    ])}
    ` },
    {
        title: '2. Truy vết nguồn gốc — bấm vào bất kỳ số nào', body: `
      Mọi con số ở các cột Tồn đầu, Gói ra, Nhận CN, Chuyển CN, Hủy giỏ, Sapo bán, Điều chỉnh, Tồn thực tế, DTT
      đều <b>bấm được</b> (có gạch chân chấm khi rê chuột) — bấm vào sẽ mở modal Truy vết gồm:
      <ul style="margin:8px 0;padding-left:20px;">
        <li><b>Phân tích nguồn gốc</b>: giải thích tự động dựa trên bút ký khớp loại thao tác của đúng cột đó.</li>
        <li><b>Bảng bút ký chi tiết</b>: Ngày chốt · Thời gian nhập · Người thực hiện · Thao tác · Trạng thái · Chi tiết. Bấm vào 1 dòng để mở rộng xem toàn bộ mã trong cùng bút ký, ghi chú, mã nhân viên, địa chỉ IP, thiết bị dùng để thao tác, ID bút ký.</li>
        <li>Nếu mã hàng còn bút ký <b>khác loại thao tác</b> trong cùng ngày (không trực tiếp tạo ra số đang xem), sẽ có dòng <i>&quot;Còn X bút ký khác...&quot;</i> — bấm để xem thêm, tránh trộn lẫn gây hiểu nhầm.</li>
      </ul>
      Dữ liệu luôn lấy trực tiếp từ hệ thống tại thời điểm bấm — không dùng dữ liệu cũ trong bộ nhớ trình duyệt, nên luôn phản ánh đúng thực tế kể cả khi người khác vừa thao tác.
    ` },
    {
        title: '3. DTT và CTT — khi nào dùng, khác nhau ra sao', body: `
      Đây là 2 nhãn trạng thái gắn cho giỏ hàng khi <b>kiểm Tồn CN</b> cuối ngày, tự nhận diện qua từ khóa trong dòng bạn dán (&quot;dtt&quot;, &quot;chưa lấy&quot;, &quot;chờ lấy&quot; → DTT; &quot;ctt&quot;, &quot;chưa thanh toán&quot; → CTT).
      ${guideTable([
        ['DTT — Đã thanh toán, chưa lấy', 'Khách đã trả tiền (Sapo đã ghi nhận bán), giỏ vẫn còn tại kho. Cộng đủ vào Tồn thực tế, nhưng bị <b>trừ ra</b> ở Tồn so sánh (vì coi như đã bán).'],
        ['CTT — Chưa thanh toán, giữ giỏ', 'Khách chưa trả tiền, giỏ đang được giữ chỗ. Cộng đủ vào Tồn thực tế, <b>không trừ</b> ở đâu cả (vẫn là tồn thật).'],
    ])}
      <b>Lưu ý quan trọng:</b> nếu khách <b>vẫn chưa lấy</b> giỏ DTT ở các ngày sau, phải <b>dán lại &quot;dtt&quot; mỗi ngày</b> khi kiểm Tồn CN cho tới khi khách lấy thật — hệ thống sẽ tự trừ đúng phần DTT khi tính tồn đầu ngày kế tiếp, tránh phát sinh Lệch ảo vào đúng ngày khách lấy hàng.
    ` },
    {
        title: '4. Nhập liệu hàng loạt — Gói ra / Hủy giỏ / Tồn CN', body: `
      Dán danh sách vào ô nhập, <b>mỗi dòng 1 mã</b>. Các định dạng được nhận diện:
      <ul style="margin:8px 0;padding-left:20px;">
        <li><code>H1135 2</code>, <code>H1135 x2</code>, <code>H1135: 2</code>, <code>H1135 - 2 cái</code> — mã và SL cùng dòng.</li>
        <li><code>H1135</code> rồi xuống dòng <code>Hủy 2 cái do vỡ giỏ</code> — mã và SL/lý do <b>tách 2 dòng riêng</b> (kiểu copy tin nhắn Zalo) — hệ thống tự ghép lại đúng SL.</li>
        <li>Với Tồn CN: thêm &quot;dtt&quot;/&quot;ctt&quot; để gắn nhãn, hoặc &quot;chuyển &lt;chi nhánh&gt;&quot; để tự nhận là chuyển chi nhánh.</li>
      </ul>
      Bấm <b>Xem trước</b> để kiểm tra: dòng nền đỏ = lỗi (không đọc được mã hoặc không xác định được SL dù đã thử ghép dòng kế) — <b>chặn nút Lưu</b> cho tới khi sửa xong, tránh âm thầm ghi sai số lượng. Dòng nền vàng = cảnh báo nhẹ, vẫn lưu được nhưng nên kiểm tra lại. Nếu 2 dòng trùng mã + trùng loại trạng thái, hệ thống cũng cảnh báo và chặn lưu.
    ` },
    {
        title: '5. Sai mã / Đổi mã tạm', body: `
      Dùng khi nhập nhầm mã hoặc cần gộp phát sinh từ 1 mã sai/mã tạm sang mã đúng. Có 2 loại:
      ${guideTable([
        ['Đổi mã tạm / nhập nhầm', 'Chuyển các phát sinh nội bộ (Gói ra, Tồn thực tế, Hủy giỏ, Chuyển CN...) từ mã sai sang mã đúng. <b>Không</b> đụng tới Sapo bán/doanh thu.'],
        ['Sai mã Sapo / check đơn', 'Chuyển riêng phần Sapo bán/doanh thu/số đơn từ mã sai sang mã đúng.'],
    ])}
      Nhân viên thường chỉ tạo được <b>đề xuất</b> (chưa đổi số ngay) — cần Admin/Trưởng ca vào duyệt thì số liệu Tổng quan mới thay đổi.
    ` },
    {
        title: '6. Sửa SL', body: `
      Sửa nhanh <b>1 trường cụ thể</b> cho 1 mã/ngày/chi nhánh (không cần vào đúng dòng trong Tổng quan). Bắt buộc nhập lý do. Mọi lần sửa đều tự ghi bút ký &quot;Sửa SL&quot; — bấm Truy vết vào ô đó sẽ thấy ngay cũ → mới, ai sửa, lúc nào.
    ` },
    {
        title: '7. Sửa trực tiếp ở Tổng quan (nút &quot;Sửa&quot;)', body: `
      Bấm nút <b>Sửa</b> ngay trên 1 dòng của bảng Tổng quan để chỉnh nhanh nhiều trường cùng lúc (Gói ra, Nhận CN, Chuyển CN, Hủy giỏ, Điều chỉnh, Tồn thực tế, DTT). Mỗi trường thực sự thay đổi đều tự ghi bút ký riêng, và nếu sửa Tồn thực tế/DTT thì <b>tự đồng bộ luôn tồn đầu ngày kế tiếp</b> — giống hệt luồng Tồn CN, tránh Lệch ảo về sau.
      <div style="margin-top:8px;padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e;font-size:12.5px;">⚠️ Nút <b>Sửa</b> chỉ hiện ra với tài khoản được cấp quyền chỉnh nhanh (<code>sales.nxt.edit_quatity_nxt</code>). Không thấy nút này nghĩa là tài khoản chưa có quyền, không phải lỗi hệ thống — liên hệ Admin để được cấp nếu cần.</div>
    ` },
    {
        title: '8. Sapo treo — khi khách đã lấy hàng nhưng Sapo chưa ghi nhận', body: `
      Dùng khi khách đã trả tiền/lấy hàng nhưng đơn chưa lên hệ thống Sapo (xử lý trễ, đồng bộ chậm...).
      <ul style="margin:8px 0;padding-left:20px;">
        <li><b>Tạo treo:</b> điền ngày/chi nhánh/mã/SL — hệ thống tự trừ Điều chỉnh (−SL) vào đúng ngày đó để không bị tính dư tồn, đồng thời gắn nhãn <b>CTT</b> lên dòng đó (báo hiệu &quot;đang chờ Sapo xác nhận&quot;).</li>
        <li><b>Hoàn thành treo:</b> khi thấy đơn thật trên Sapo, vào mục Sapo treo nhập đúng <b>Ngày Sapo</b> (ngày đơn thực sự lên hệ thống) — hệ thống tự cộng lại Điều chỉnh (+SL) vào đúng ngày đó, và đổi nhãn dòng gốc từ CTT sang <b>DTT</b>.</li>
        <li><b>Hủy treo (tạo nhầm):</b> hệ thống tự cộng lại đúng phần Điều chỉnh đã trừ lúc tạo và bỏ nhãn CTT — không cần tự sửa tay.</li>
      </ul>
      <b>Lưu ý:</b> đừng tự tay vào Tổng quan chỉnh thêm Điều chỉnh song song — hệ thống đã tự làm khi tạo/hoàn thành treo, làm thêm sẽ bị trừ/cộng 2 lần. Muốn kiểm tra đã đúng chưa: xem <b>cột Lệch</b> của cả 2 ngày (ngày tạo treo và ngày hoàn thành) — phải hiện &quot;Khớp&quot; cả 2, không cần cột Điều chỉnh phải về 0 (vì 2 bút toán −SL/+SL thường nằm ở 2 ngày khác nhau).
    ` },
    {
        title: '9. Nhật ký / Lịch sử điều chỉnh', body: `
      Xem toàn bộ bút ký của cả trang XNT, lọc theo chi nhánh/loại thao tác/người thực hiện/khoảng ngày (mục "Lịch sử điều chỉnh" trong tab <b>Sai mã</b>). Dữ liệu luôn được hỏi lại hệ thống mỗi khi đổi bộ lọc — không dùng dữ liệu cũ. Với các loại thao tác nhập hàng loạt và Sửa SL, người có quyền có thể bấm <b>Hoàn tác</b> để xóa bút ký và đảo ngược số liệu đã ghi.
      <div style="margin-top:8px;padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e;font-size:12.5px;">⚠️ Cột/nút <b>Hoàn tác</b> chỉ hiện ra với tài khoản được cấp quyền xóa bút ký (<code>sales.nxt.delete_logs</code>). Tài khoản không có quyền vẫn xem được đầy đủ bút ký, chỉ không thấy nút hoàn tác.</div>
    ` },
    {
        title: '10. Trợ lý phân tích (khung chat nổi 🔎)', body: `
      Nút tròn <b>🔎</b> nổi ở góc dưới bên phải màn hình (mở/thu gọn được) — gõ mô tả vấn đề như trò chuyện bình thường, có thể hỏi tiếp dựa trên ngữ cảnh trước đó (vd hỏi &quot;H1144 Phú Lợi hôm nay bị lệch&quot;, rồi hỏi tiếp &quot;còn hôm qua thì sao&quot; — trợ lý tự hiểu vẫn đang hỏi về H1144/Phú Lợi, chỉ đổi ngày). Dải nhãn xanh phía trên khung chat hiện rõ đang ghi nhớ mã/chi nhánh/ngày nào, bấm ✕ để xóa ngữ cảnh nếu muốn hỏi sang mã khác.
      <div style="margin-top:8px;padding:8px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;color:#1e40af;font-size:12.5px;">ℹ️ Trợ lý hoạt động dựa trên đối chiếu <b>dữ liệu và công thức thật</b> của hệ thống (không gọi AI ngoài) — luôn chính xác với số liệu hiện có, nhưng chỉ nhận diện được các tình huống đã biết (DTT, CTT, Sapo treo, sai mã, lỗi nhập liệu...). Nếu câu hỏi quá lạ, trợ lý sẽ báo chưa nhận diện được thay vì đoán bừa.</div>
    ` },
];

export default function XntGuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px', maxHeight: '90vh' } } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1 }}>
                <Box>
                    <Typography sx={{ fontWeight: 900, fontSize: 17, color: '#065f2d' }}>📖 Hướng dẫn sử dụng — Xuất Nhập Tồn</Typography>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.5 }}>Bấm vào từng mục để mở rộng/thu gọn. Đọc kỹ mục 3 (DTT/CTT) và mục 8 (Sapo treo) nếu hay gặp Lệch khó hiểu.</Typography>
                </Box>
                <IconButton size="small" onClick={onClose}><CloseRounded fontSize="small" /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0.5 }}>
                {SECTIONS.map((s, i) => (
                    <Accordion key={i} defaultExpanded={s.open} disableGutters sx={{ border: '1px solid #e2e8f0', borderRadius: '12px !important', mb: 1.25, overflow: 'hidden', '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ bgcolor: '#f0fdf4' }}>
                            <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#065f2d' }}>{s.title}</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ fontSize: 13, lineHeight: 1.7, color: '#334155' }}>
                            <Box dangerouslySetInnerHTML={{ __html: s.body }} />
                        </AccordionDetails>
                    </Accordion>
                ))}
            </DialogContent>
        </Dialog>
    );
}
