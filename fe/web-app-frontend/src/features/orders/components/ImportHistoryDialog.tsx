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
    alpha,
    Button,
} from '@mui/material';
import { Close, CloudUploadRounded, CalendarMonth, SettingsBackupRestoreRounded, FileDownloadRounded } from '@mui/icons-material';
import { useState } from 'react';
import { userApi } from '@/features/user/api/user.api';
import ConfirmRollbackDialog from '@/features/staff/components/ConfirmRollbackDialog';
import toast from 'react-hot-toast';
import { ImportHistory } from '@/features/user/schemas/user-profile';

type ImportHistoryDialogProps = {
    open: boolean;
    onClose: () => void;
    historyData: ImportHistory[];
    onRefresh: () => Promise<void>;
};

type SelectedFile = { id: number; fileName: string; status: 'Imported' | 'Rollbacked' };

export default function ImportHistoryDialog({ open, onClose, historyData, onRefresh }: ImportHistoryDialogProps) {
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
    const [actionType, setActionType] = useState<'rollback' | 'restore' | null>(null);

    const formatDateTime = (value?: string | null) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).format(new Date(value));
    };

    const openConfirm = (file: ImportHistory, type: 'rollback' | 'restore') => {
        setSelectedFile({ id: file.id, fileName: file.fileName, status: (file.status as any) ?? 'Imported' });
        setActionType(type);
        setConfirmOpen(true);
    };

    const closeConfirm = () => {
        setConfirmOpen(false);
        setSelectedFile(null);
        setActionType(null);
    };

    const handleConfirmAction = async () => {
        if (!selectedFile || !actionType) return;
        const toastId = toast.loading(actionType === 'rollback' ? 'Đang hoàn tác tệp Excel...' : 'Đang khôi phục tệp Excel...');
        setActionLoading(true);
        setConfirmOpen(false);
        try {
            if (actionType === 'rollback') {
                await userApi.rollbackImportExcel(selectedFile.id);
                toast.success('Hoàn tác thành công, số liệu tài chính đã được hoàn tác', { id: toastId });
            } else {
                await userApi.restoreImportExcel(selectedFile.id);
                toast.success('Khôi phục thành công, đơn hàng đã hoạt động trở lại', { id: toastId });
            }
            await onRefresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.Message ?? 'Thao tác tệp dữ liệu gặp lỗi', { id: toastId });
        } finally {
            setActionLoading(false);
            closeConfirm();
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="lg"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '24px', p: 1, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' } } }}
            >
                <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 40, height: 40, borderRadius: '12px',
                            bgcolor: alpha('#086839', 0.1), color: '#086839',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <CloudUploadRounded />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', letterSpacing: '-0.3px' }}>
                                Lịch Sử Nhập File
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                Danh sách các tệp Excel bạn đã tải lên hệ thống
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#475569', bgcolor: '#f1f5f9' } }}>
                        <Close sx={{ fontSize: 20 }} />
                    </IconButton>
                </DialogTitle>

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
                            '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 },
                        }}
                    >
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    {['Thời gian nhận', 'Tên tệp Excel', 'Thành công', 'Lỗi dòng', 'Trạng thái', 'Thời gian hủy', 'Tệp gốc', 'Thao tác'].map(label => (
                                        <TableCell key={label} sx={{ bgcolor: '#fff', color: '#475569', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', py: 1.5 }}>
                                            {label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody sx={{ bgcolor: '#fff' }}>
                                {historyData.map((file, index) => {
                                    const isRollbacked = file.status === 'Rollbacked';
                                    return (
                                        <TableRow key={file.id || index} sx={{ '&:hover': { bgcolor: '#f0fdf4' } }}>
                                            <TableCell sx={{ fontSize: 12.5, color: '#475569', whiteSpace: 'nowrap', py: 1.5 }}>
                                                {formatDateTime(file.importDate)}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: 12.5, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                                    label={isRollbacked ? 'Đã Hoàn Tác' : 'Đã Nhập'}
                                                    size="small"
                                                    sx={isRollbacked
                                                        ? { bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: 11, borderRadius: '6px' }
                                                        : { bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, borderRadius: '6px' }
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: 12.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                {formatDateTime(file.rollbackAt)}
                                            </TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                {file.fileUrl ? (
                                                    <Button
                                                        component="a"
                                                        href={file.fileUrl}
                                                        download
                                                        variant="outlined"
                                                        size="small"
                                                        startIcon={<FileDownloadRounded />}
                                                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: 12, borderColor: '#0ea5e9', color: '#0ea5e9', '&:hover': { bgcolor: '#f0f9ff' } }}
                                                    >
                                                        Tải xuống
                                                    </Button>
                                                ) : (
                                                    <Typography sx={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }}>Không có</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                {isRollbacked ? (
                                                    <Button
                                                        variant="outlined"
                                                        color="success"
                                                        size="small"
                                                        startIcon={<CloudUploadRounded />}
                                                        onClick={() => openConfirm(file, 'restore')}
                                                        disabled={actionLoading}
                                                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}
                                                    >
                                                        Khôi phục file
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outlined"
                                                        color="warning"
                                                        size="small"
                                                        startIcon={<SettingsBackupRestoreRounded />}
                                                        onClick={() => openConfirm(file, 'rollback')}
                                                        disabled={actionLoading}
                                                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}
                                                    >
                                                        Rollback
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!historyData.length && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
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

            <ConfirmRollbackDialog
                open={confirmOpen}
                file={selectedFile}
                actionType={actionType}
                loading={actionLoading}
                onClose={closeConfirm}
                onConfirm={handleConfirmAction}
            />
        </>
    );
}
