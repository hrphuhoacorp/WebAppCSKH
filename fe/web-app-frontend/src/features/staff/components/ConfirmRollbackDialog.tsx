'use client';

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    alpha
} from '@mui/material';
import { WarningAmberRounded } from '@mui/icons-material';

type ImportRow = {
    id: number;
    fileName: string;
    status: 'Imported' | 'Rollbacked';
};

type ConfirmRollbackDialogProps = {
    open: boolean;
    file: ImportRow | null;
    actionType: 'rollback' | 'restore' | null;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

export default function ConfirmRollbackDialog({
    open,
    file,
    actionType,
    loading,
    onClose,
    onConfirm
}: ConfirmRollbackDialogProps) {
    if (!file || !actionType) return null;

    const isRollback = actionType === 'rollback';

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: '24px',
                        p: 2,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                        backgroundImage: 'none',
                        bgcolor: '#fff'
                    }
                }
            }}
        >
            {/* Header với Icon Đồ họa bọc Tròn hiệu ứng phát sáng */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2, pb: 1 }}>
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '20px',
                        bgcolor: isRollback ? alpha('#f59e0b', 0.1) : alpha('#16a34a', 0.1),
                        color: isRollback ? '#f59e0b' : '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2.5,
                        boxShadow: `0 8px 20px -6px ${isRollback ? alpha('#f59e0b', 0.4) : alpha('#16a34a', 0.4)}`,
                        border: `1px solid ${isRollback ? alpha('#f59e0b', 0.15) : alpha('#16a34a', 0.15)}`
                    }}
                >
                    <WarningAmberRounded sx={{ fontSize: 36 }} />
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', letterSpacing: '-0.3px' }}>
                    {isRollback ? 'Xác nhận Rollback dữ liệu?' : 'Xác nhận Khôi phục Tệp?'}
                </Typography>
            </Box>

            {/* Nội dung chi tiết */}
            <DialogContent sx={{ textAlign: 'center', pb: 3, px: 1 }}>
                <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6, fontSize: 14.5 }}>
                    Hệ thống chuẩn bị thực hiện hành động trên tệp Excel dữ liệu kinh doanh:
                </Typography>

                <Typography
                    variant="subtitle1"
                    sx={{
                        fontWeight: 700,
                        color: '#1e293b',
                        mt: 1,
                        mb: 2,
                        wordBreak: 'break-word',
                        bgcolor: '#f8fafc',
                        p: 1.5,
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontStyle: 'italic'
                    }}
                >
                    📄 {file.fileName}
                </Typography>

                {/* Khối Cảnh báo/Thông báo chi tiết định dạng đẹp */}
                <Box
                    sx={{
                        textAlign: 'left',
                        bgcolor: isRollback ? '#fffbeb' : '#f0fdf4',
                        p: 2,
                        borderRadius: '14px',
                        border: `1px dashed ${isRollback ? '#fde68a' : '#bbf7d0'}`,
                    }}
                >
                    <Typography
                        variant="subtitle2"
                        sx={{
                            fontWeight: 800,
                            color: isRollback ? '#b45309' : '#15803d',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            mb: 0.5,
                            fontSize: 13,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                    >
                        {isRollback ? '⚠️ Hệ thống cảnh báo' : '✨ Khôi phục số liệu'}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: isRollback ? '#c2410c' : '#166534', lineHeight: 1.5, fontSize: 12.5, fontWeight: 500 }}>
                        {isRollback
                            ? 'Toàn bộ đơn hàng thuộc tệp này sẽ bị chuyển sang trạng thái xóa mềm. Doanh thu tổng và số lượng đơn hàng của khách hàng liên quan sẽ bị TRỪ đi tương ứng ngay lập tức!'
                            : 'Toàn bộ các đơn hàng đã hủy trước đó thuộc tệp này sẽ hoạt động trở lại. Số liệu tài chính, doanh thu của khách hàng sẽ được CỘNG dồn bù lại hoàn toàn tự động!'}
                    </Typography>
                </Box>
            </DialogContent>

            {/* Thanh nút bấm */}
            <DialogActions sx={{ px: 1, pb: 1.5, gap: 1.5 }}>
                <Button
                    fullWidth
                    variant="outlined"
                    onClick={onClose}
                    disabled={loading}
                    sx={{
                        borderRadius: '14px',
                        textTransform: 'none',
                        fontWeight: 700,
                        color: '#64748b',
                        borderColor: '#e2e8f0',
                        py: 1.2,
                        fontSize: 14,
                        '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }
                    }}
                >
                    Hủy bỏ
                </Button>
                <Button
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    onClick={onConfirm}
                    sx={{
                        borderRadius: '14px',
                        textTransform: 'none',
                        fontWeight: 700,
                        py: 1.2,
                        fontSize: 14,
                        bgcolor: isRollback ? '#f59e0b' : '#16a34a',
                        color: '#fff',
                        // Giữ lại dòng cấu hình bóng đổ động này
                        boxShadow: isRollback ? '0 4px 12px rgba(245,158,11,0.2)' : '0 4px 12px rgba(22,163,74,0.2)',
                        '&:hover': {
                            bgcolor: isRollback ? '#d97706' : '#15803d',
                            boxShadow: 'none'
                        }
                    }}
                >
                    Xác nhận chạy
                </Button>
            </DialogActions>
        </Dialog>
    );
}