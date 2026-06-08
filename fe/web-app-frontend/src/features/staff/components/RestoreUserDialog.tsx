'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    alpha,
} from '@mui/material';
import { SettingsBackupRestoreRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { userApi } from '@/features/user/api/user.api';

type UserRow = {
    id: number;
    staffCode: string;
    name: string;
    email: string;
};

type RestoreUserDialogProps = {
    open: boolean;
    user: UserRow | null;
    onClose: () => void;
    onSuccess: () => void;
};

export default function RestoreUserDialog({ open, user, onClose, onSuccess }: RestoreUserDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleRestore = async () => {
        if (!user) return;

        try {
            setLoading(true);
            // Gọi API khôi phục tài khoản từ file api của bạn
            await userApi.restoreAccount(user.id);

            toast.success(`Khôi phục tài khoản [${user.staffCode}] thành công!`);
            onSuccess(); // Re-fetch lại danh sách user ở trang chính
            onClose();   // Đóng dialog
        } catch (error: any) {
            toast.error(error?.response?.data?.message ?? 'Khôi phục tài khoản thất bại, vui lòng thử lại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: '20px',
                        p: 1.5,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                    },
                },
            }}
        >
            {/* Header với Icon Đồ họa đồng bộ */}
            <DialogTitle sx={{ pt: 2, pb: 1, textAlign: 'center' }}>
                <Box
                    sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '16px',
                        bgcolor: alpha('#2563eb', 0.1),
                        color: '#2563eb',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                    }}
                >
                    <SettingsBackupRestoreRounded sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
                    Khôi phục tài khoản?
                </Typography>
            </DialogTitle>

            {/* Nội dung xác nhận */}
            <DialogContent sx={{ pb: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6 }}>
                    Bạn có chắc chắn muốn khôi phục quyền hoạt động cho nhân sự{' '}
                    <Box component="span" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {user?.name}
                    </Box>{' '}
                    (
                    <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                        {user?.staffCode}
                    </Box>
                    )?
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: '#94a3b8', mt: 1.5, bgcolor: '#f8fafc', p: 1, borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
                    Tài khoản này sau khi khôi phục có thể đăng nhập và thực hiện các chức năng trên hệ thống bình thường.
                </Typography>
            </DialogContent>

            {/* Thanh thao tác nút bấm */}
            <DialogActions sx={{ px: 2, pb: 1.5, gap: 1 }}>
                <Button
                    fullWidth
                    variant="outlined"
                    disabled={loading}
                    onClick={onClose}
                    sx={{
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 700,
                        color: '#64748b',
                        borderColor: '#e2e8f0',
                        '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
                    }}
                >
                    Hủy bỏ
                </Button>
                <Button
                    fullWidth
                    variant="contained"
                    loading={loading}
                    onClick={handleRestore}
                    sx={{
                        bgcolor: '#2563eb',
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                        '&:hover': { bgcolor: '#1d4ed8' },
                    }}
                >
                    Khôi phục
                </Button>
            </DialogActions>
        </Dialog>
    );
}