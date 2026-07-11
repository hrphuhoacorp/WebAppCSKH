'use client';

import { Dialog, DialogContent, DialogTitle, IconButton, Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { CloseRounded, ExpandMoreRounded } from '@mui/icons-material';

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
        title: '1. Cách chuẩn bị file — xuất đúng từ Sapo', open: true, body: `
      <b>Đường dẫn trong Sapo:</b><br/>
      <span style="display:inline-flex;align-items:center;gap:4px;margin:6px 0 10px;flex-wrap:wrap;">
        <span style="background:#f1f5f9;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;color:#1e293b;">Báo cáo</span>
        <span style="color:#94a3b8;">›</span>
        <span style="background:#f1f5f9;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;color:#1e293b;">Báo cáo bán hàng</span>
        <span style="color:#94a3b8;">›</span>
        <span style="background:#f1f5f9;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;color:#1e293b;">Báo cáo theo thời gian</span>
        <span style="color:#94a3b8;">›</span>
        <span style="background:#f1f5f9;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;color:#1e293b;">Chọn ngày</span>
      </span>
      <ol style="margin:0 0 10px;padding-left:20px;line-height:2;">
        <li>Chọn khoảng thời gian cần xuất.</li>
        <li>Bấm <b>Điều chỉnh cột hiển thị</b>, bật đúng các cột sau rồi lưu:</li>
      </ol>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin:0 0 10px;font-size:12.5px;">
        <div style="font-weight:700;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:4px;grid-column:1/-1;">Thống kê</div>
        <div>✅ SL hàng bán ra</div><div>✅ SL hàng trả lại</div>
        <div>✅ SL hàng thực bán</div><div>✅ SL đơn hàng</div>
        <div>✅ Tiền hàng</div><div>✅ Tiền hàng trả lại</div>
        <div>✅ Tiền thuế</div><div>✅ Phí giao hàng</div>
        <div>✅ Doanh thu</div><div>✅ Lợi nhuận gộp</div>
        <div style="font-weight:700;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:4px;grid-column:1/-1;margin-top:6px;">Khách hàng</div>
        <div>✅ Tên khách hàng</div><div>✅ Sđt khách hàng</div>
        <div>✅ Mã khách hàng</div><div></div>
        <div style="font-weight:700;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:4px;grid-column:1/-1;margin-top:6px;">Sản phẩm</div>
        <div>✅ Loại sản phẩm</div><div>✅ Tên sản phẩm</div>
        <div>✅ Mã SKU</div><div>✅ Đơn giá bán</div>
        <div>✅ Đơn vị tính</div><div></div>
        <div style="font-weight:700;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:4px;grid-column:1/-1;margin-top:6px;">Đơn hàng · Chi nhánh · Nguồn</div>
        <div>✅ Mã đơn hàng</div><div>✅ Trạng thái đơn hàng</div>
        <div>✅ Tên chi nhánh</div><div>✅ Tên nguồn bán hàng</div>
      </div>
      <ol start="3" style="margin:0;padding-left:20px;line-height:2;">
        <li>Bấm <b>Xuất file</b> → chọn file <code>.xlsx</code> vừa tải về → bấm <b>Nhập Excel</b> trên trang này.</li>
        <li>Không cần chỉnh sửa gì — hệ thống tự nhận diện tên cột (thứ tự lệch vẫn đúng).</li>
      </ol>
    ` },
 
    {
        title: '2. Bỏ qua trùng — hệ thống tự xử lý', body: `
      Hệ thống chống trùng 2 tầng:
      <ul style="margin:8px 0;padding-left:20px;">
        <li><b>Tầng 1 — hash toàn file:</b> nếu đúng y chang file đã import trước (kể cả tên file khác), hệ thống báo lỗi và từ chối toàn bộ.</li>
        <li><b>Tầng 2 — fingerprint từng dòng:</b> mỗi dòng tạo 1 fingerprint từ (Mã đơn + Ngày + Doanh thu + Số lượng + SKU + Dịch vụ). Dòng nào đã tồn tại trong DB → bỏ qua, không báo lỗi, tiếp tục dòng kế.</li>
      </ul>
      Dòng số lượng âm (hoàn trả) được xử lý riêng và tự động gắn trạng thái <b>"Hoàn trả"</b>.
    ` },
    {
        title: '3. Tự động tạo dữ liệu giỏ quà (SKU 200 & 600)', body: `
      Khi import đơn hàng, hệ thống tự sinh <b>dữ liệu bán hàng giỏ quà</b> cho dashboard Giỏ Quà — không cần nạp file Sapo riêng nữa.
      ${guideTable([
            ['SKU bắt đầu 200', 'Giỏ mẫu sẵn có. Hệ thống trích mã giỏ từ <b>Tên sản phẩm</b> (tìm pattern GN..., H..., AT..., GT...). Nếu không tìm thấy → dùng SKU làm mã.'],
            ['SKU bắt đầu 600', 'Giỏ tự chọn (khách lựa riêng). Không có mã cố định → dùng <b>Mã đơn hàng</b> làm mã định danh.'],
            ['SKU khác', 'Bỏ qua, không tạo dữ liệu giỏ quà.'],
      ])}
      Các dòng cùng ngày + chi nhánh + SKU + mã giỏ sẽ được <b>cộng dồn</b> (không tạo nhiều dòng thừa).<br/>
      Dữ liệu này cũng liên kết với batch import — khi <b>rollback</b> đơn hàng, phần dữ liệu giỏ quà tương ứng sẽ bị xóa cùng.
    ` },
    {
        title: '4. Rollback & khôi phục', body: `
      Mỗi lần import tạo ra 1 <b>batch lịch sử</b> (xem ở nút Lịch sử nhập file). Mỗi batch có thể:
      ${guideTable([
            ['Rollback', 'Xóa toàn bộ đơn hàng, khách hàng mới, và dữ liệu giỏ quà được tạo từ batch đó. Không thể rollback 1 phần.'],
            ['Khôi phục', 'Hoàn tác rollback — phục hồi lại header đơn hàng và khách hàng. <b>Lưu ý:</b> chi tiết sản phẩm (OrderItems) và dữ liệu giỏ quà đã bị xóa cứng khi rollback — khôi phục <b>không thể phục hồi</b> 2 phần này.'],
      ])}
      <b>Lưu ý:</b> rollback chỉ ảnh hưởng đơn hàng tạo từ batch đó. Khách hàng đã tồn tại trước khi import sẽ không bị xóa (chỉ doanh thu của họ được điều chỉnh lại).
    ` },
    {
        title: '5. Xem lịch sử nhập file', body: `
      Bấm nút <b>Lịch sử nhập file</b> để xem:
      <ul style="margin:8px 0;padding-left:20px;">
        <li>Tất cả các lần bạn (cá nhân) đã import — tên file, ngày giờ, số dòng thành công/lỗi, trạng thái.</li>
        <li>Từng batch có nút <b>Rollback</b> (nếu chưa rollback) hoặc <b>Khôi phục</b> (nếu đã rollback).</li>
        <li>Tải lại file Excel gốc đã upload (nếu cần kiểm tra lại).</li>
      </ul>
    ` },
];

type Props = { open: boolean; onClose: () => void };

export default function OrderImportGuideDialog({ open, onClose }: Props) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: '20px', p: 1, maxHeight: '90vh' } } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 17, color: '#1e293b' }}>
                        Hướng dẫn sử dụng — Nhập đơn hàng
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.3 }}>
                        Xuất từ Sapo · Bấm vào từng mục để mở rộng
                    </Typography>
                </Box>
                <IconButton onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#475569', bgcolor: '#f1f5f9' } }}>
                    <CloseRounded sx={{ fontSize: 20 }} />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0, pb: 2 }}>
                {SECTIONS.map((s, i) => (
                    <Accordion
                        key={i}
                        defaultExpanded={!!s.open}
                        disableGutters
                        elevation={0}
                        sx={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px !important',
                            mb: 1,
                            '&:before': { display: 'none' },
                            '&.Mui-expanded': { border: '1.5px solid #bbf7d0' },
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreRounded sx={{ color: '#086839', fontSize: 20 }} />}
                            sx={{ px: 2, py: 0.5, '& .MuiAccordionSummary-content': { my: 1 } }}
                        >
                            <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#1e293b' }}>
                                {s.title}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2 }}>
                            <Box
                                sx={{ fontSize: 13, color: '#475569', lineHeight: 1.7, '& code': { bgcolor: '#f1f5f9', px: 0.5, borderRadius: '4px', fontFamily: 'monospace', fontSize: 12 }, '& b': { color: '#1e293b' }, '& ul': { pl: 2.5 }, '& li': { mb: 0.5 } }}
                                dangerouslySetInnerHTML={{ __html: s.body }}
                            />
                        </AccordionDetails>
                    </Accordion>
                ))}
            </DialogContent>
        </Dialog>
    );
}
