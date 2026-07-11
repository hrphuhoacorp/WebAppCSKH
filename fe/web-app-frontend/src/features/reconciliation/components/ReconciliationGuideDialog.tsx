'use client';

import { Dialog, DialogContent, DialogTitle, IconButton, Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { CloseRounded, ExpandMoreRounded } from '@mui/icons-material';

// Nội dung tĩnh do dev viết sẵn (không phải dữ liệu người dùng), giữ nguyên qua
// dangerouslySetInnerHTML thay vì viết lại hàng trăm dòng JSX cho nội dung tham khảo thuần túy.
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
        title: '1. Rà soát số liệu dùng để làm gì', open: true, body: `
      Đối chiếu dữ liệu <b>trong app</b> (từ các lần Nhập Excel trước đó) với 1 file Excel bạn
      xuất LẠI từ Sapo cho cả tháng — dùng làm &quot;sự thật gốc&quot; độc lập, để phát hiện
      những đơn bị trùng/sai lệch do lỗi thao tác (nhập nhầm, Rollback/Khôi phục nhầm...) mà
      mắt thường khó soát hết khi số lượng đơn lớn.
      <div style="margin-top:8px;padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e;font-size:12.5px;">⚠️ File dùng để rà soát phải <b>đúng định dạng chi tiết từng dòng</b> giống hệt file dùng để Nhập Excel (1 dòng = 1 mã đơn + 1 SKU + 1 dịch vụ + SL + doanh thu của đúng giao dịch đó). Nếu dùng file &quot;tổng hợp tháng&quot; (gộp theo SKU/mã đơn, ít dòng hơn) thì gần như toàn bộ đơn sẽ bị báo dư sai — không phải app có lỗi, mà do sai định dạng file.</div>
    ` },
    {
        title: '2. Cách chạy rà soát 1 tháng', body: `
      <ul style="margin:8px 0;padding-left:20px;">
        <li>Chọn đúng <b>Tháng/Năm</b> cần soát.</li>
        <li>Bấm <b>Chọn file Excel gốc từ Sapo</b> — chọn file vừa export lại từ Sapo cho cả tháng đó (đúng định dạng ở mục 1).</li>
        <li>Bấm <b>Chạy rà soát</b> — hệ thống tự đọc file, so khớp với dữ liệu hiện có trong app của đúng tháng đó, rồi hiện kết quả ngay bên dưới.</li>
        <li>1 tháng có thể chạy lại nhiều lần (ví dụ sau khi đã xóa vài dòng dư) — mỗi lần chạy lưu thành 1 bản ghi riêng trong <b>Lịch sử các lần rà soát</b>, bấm vào 1 dòng lịch sử để xem lại kết quả lần đó.</li>
      </ul>
    ` },
    {
        title: '3. Ý nghĩa 3 loại kết quả — cái nào xóa được, cái nào không', body: `
      ${guideTable([
        ['🔴 Dòng dư', 'Có trong app nhưng KHÔNG có trong file gốc — <b>có thể xóa</b> sau khi kiểm tra. Chia 2 loại: <b>Trùng</b> (tìm thấy 1 dòng khác y hệt mã+ngày+SKU+dịch vụ+SL nhưng khác đợt nhập — dấu hiệu rõ của lỗi Rollback/Khôi phục nhầm) và <b>Không khớp nguồn</b> (không tìm thấy đơn tương ứng nào, cần xem kỹ hơn trước khi xóa).'],
        ['🔵 Dòng lệch giá trị', 'Đơn CÓ THẬT ở cả 2 bên (cùng mã+ngày+SKU+dịch vụ) nhưng doanh thu hoặc số lượng khác nhau. <b>KHÔNG thể xóa</b> — xóa sẽ làm mất doanh thu thật. Chỉ để đối chiếu và tự sửa số liệu thủ công nếu cần.'],
        ['🟡 Dòng thiếu', 'Có trong file gốc nhưng CHƯA có trong app — đơn bị sót, cần nhập bổ sung qua chức năng Nhập Excel bình thường (rà soát chỉ phát hiện, không tự thêm).'],
    ])}
    ` },
    {
        title: '4. Nghi ngờ lỗi nhập liệu (sai ngày / sai SKU)', body: `
      Với các dòng dư loại &quot;Không khớp nguồn&quot; và dòng thiếu còn sót lại sau khi so khớp
      chính xác, hệ thống thử nới lỏng 1 yếu tố để tìm khả năng gõ nhầm:
      <ul style="margin:8px 0;padding-left:20px;">
        <li><b>Nghi sai ngày:</b> cùng mã đơn + SKU + dịch vụ + số liệu khớp, nhưng ngày lệch nhau 1-3 ngày.</li>
        <li><b>Nghi sai SKU:</b> cùng mã đơn + ngày + dịch vụ + số liệu khớp, nhưng SKU chỉ khác 1-2 ký tự (gõ nhầm).</li>
      </ul>
      <div style="margin-top:8px;padding:8px 12px;background:#f3e8ff;border:1px solid #ddd6fe;border-radius:8px;color:#6d28d9;font-size:12.5px;">Đây chỉ là <b>gợi ý dựa trên suy đoán</b>, không chắc chắn tuyệt đối — luôn cần xác minh thủ công trước khi sửa. Các dòng này cũng <b>không thể xóa</b> qua rà soát.</div>
    ` },
    {
        title: '5. Truy ra gốc — batch nào, ai nhập, có từng Restore không', body: `
      Mỗi dòng dư/lệch đều hiện thêm <b>Chi nhánh</b> và <b>Người nhập</b> của đơn đó. Nếu batch
      import tạo ra đơn đó <b>từng bị Rollback (hoàn tác) rồi Khôi phục lại</b>, dòng sẽ có thêm
      badge <b>&quot;⚠ Từng Restore&quot;</b> — đây chính là dấu hiệu điển hình gây trùng dữ liệu
      (import → rollback → import lại file khác → sau đó lỡ khôi phục lại batch cũ).
    ` },
    {
        title: '6. Biểu đồ tổng hợp theo nhóm & xu hướng nhiều tháng', body: `
      <ul style="margin:8px 0;padding-left:20px;">
        <li><b>3 biểu đồ theo chi nhánh / nguồn đơn / người nhập</b> (phía trên bảng Dòng dư): giúp khoanh vùng nhanh xem lệch tập trung ở đâu nhiều nhất, trước khi lật từng dòng.</li>
        <li><b>Biểu đồ xu hướng</b> (đầu trang, chỉ hiện khi đã có từ 1 lần rà soát trở lên): so sánh tổng tiền dư/lệch/thiếu qua từng tháng (lấy lần chạy mới nhất của mỗi tháng) — giúp biết tình hình đang tốt lên hay xấu đi.</li>
      </ul>
    ` },
    {
        title: '7. Xóa dòng dư', body: `
      Ở bảng <b>Dòng dư</b>, tick chọn các dòng muốn xóa (chỉ chọn được loại &quot;Trùng&quot;/&quot;Không khớp nguồn&quot;, các loại khác không có ô tick) rồi bấm <b>Xóa các dòng đã chọn</b>.
      <div style="margin-top:8px;padding:8px 12px;background:#fee2e2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:12.5px;">⚠️ Thao tác xóa sẽ trừ đúng doanh thu của đơn hàng liên quan và <b>không thể hoàn tác</b> — chỉ xóa sau khi đã kiểm tra kỹ nội dung lệch. Nếu đơn nào hết sạch dòng chi tiết sau khi xóa, đơn đó cũng tự ẩn khỏi danh sách đơn hàng.</div>
    ` },
    {
        title: '8. Bảng nhiều dòng — phân trang', body: `
      Cả 3 bảng (Dòng dư, Dòng lệch giá trị, Dòng thiếu) đều có phân trang riêng ở cuối bảng, mặc định hiện <b>100 dòng/trang</b>, có thể đổi thành 50/200/500 dòng tùy nhu cầu. Khi mở 1 lần rà soát khác hoặc chạy rà soát mới, các trang tự quay về trang đầu.
    ` },
];

export default function ReconciliationGuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px', maxHeight: '90vh' } } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1 }}>
                <Box>
                    <Typography sx={{ fontWeight: 900, fontSize: 17, color: '#065f2d' }}>📖 Hướng dẫn sử dụng — Rà Soát Số Liệu</Typography>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.5 }}>Bấm vào từng mục để mở rộng/thu gọn. Đọc kỹ mục 1 và mục 3 trước khi chạy lần đầu.</Typography>
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
