'use client';

import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Box,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    alpha
} from '@mui/material';
import { Close, CloudUploadRounded, CalendarMonth } from '@mui/icons-material';

type ImportHistoryItem = {
    id: number;
    fileName: string;
    importBy: string | null;
    status: string | null;
    successCount: number;
    errorCount: number;
    importDate: string;
    rollbackAt: string | null;
    rollbackBy: string | null;
};

type ImportHistoryDialogProps = {
    open: boolean;
    onClose: () => void;
    // Nhận mảng importHistories truyền từ profile data của Provider vào đây
    historyData: ImportHistoryItem[];
};

export default function ImportHistoryDialog({ open, onClose, historyData = [] }: ImportHistoryDialogProps) {

    const formatDateTime = (value?: string | null) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(new Date(value));
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: '24px',
                        p: 1,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    }
                }
            }}
        >
            {/* Header Dialog */}
            <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        bgcolor: alpha('#086839', 0.1),
                        color: '#086839',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <CloudUploadRounded />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', letterSpacing: '-0.3px' }}>
                            Lịch Sử Nhập File
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            Danh sách các tệp Excel kinh doanh do bạn tải lên hệ thống
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#475569', bgcolor: '#f1f5f9' } }}>
                    <Close sx={{ fontSize: 20 }} />
                </IconButton>
            </DialogTitle>

            {/* Content hiển thị Bảng */}
            <DialogContent dividers sx={{ p: 2, borderTop: '1px solid #e2e8f0', borderBottom: 'none', bgcolor: '#f8fafc' }}>
                <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                        maxHeight: '450px',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        overflow: 'auto',
                        '&::-webkit-scrollbar': { width: 5, height: 5 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 }
                    }}
                >
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                {['Thời gian nhận', 'Tên tệp Excel', 'Thành công', 'Lỗi dòng', 'Trạng thái'].map((label) => (
                                    <TableCell key={label} sx={{ bgcolor: '#fff', color: '#475569', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', py: 1.5 }}>
                                        {label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{ bgcolor: '#fff' }}>
                            {historyData.map((file, index) => (
                                <TableRow key={file.id || index} sx={{ '&:hover': { bgcolor: '#f0fdf4' } }}>
                                    <TableCell sx={{ fontSize: 12.5, color: '#475569', whiteSpace: 'nowrap', py: 1.5 }}>
                                        {formatDateTime(file.importDate)}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: 12.5, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {file.fileName}
                                    </TableCell>
                                    <TableCell sx={{ color: '#16a34a', fontWeight: 800, fontSize: 13 }}>
                                        +{file.successCount.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell sx={{ color: file.errorCount > 0 ? '#dc2626' : '#64748b', fontWeight: 800, fontSize: 13 }}>
                                        {file.errorCount.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        <Chip
                                            label={file.successCount === 0 && file.errorCount > 0 ? "Lỗi tệp" : "Thành công"}
                                            size="small"
                                            sx={file.successCount === 0 && file.errorCount > 0
                                                ? { bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 11, borderRadius: '6px' }
                                                : { bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, borderRadius: '6px' }
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}

                            {/* Trường hợp mảng trống */}
                            {!historyData.length && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                            <CalendarMonth sx={{ color: '#94a3b8', fontSize: 32 }} />
                                            <Typography sx={{ fontWeight: 700, color: '#64748b', fontSize: 14 }}>Bạn chưa tải lên tệp nào</Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
        </Dialog>
    );
}