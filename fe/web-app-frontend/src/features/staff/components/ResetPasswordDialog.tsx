'use client';

import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '@/features/auth/api/auth.api';

type Props = {
    open: boolean;
    user: any | null;
    onClose: () => void;
};

export default function ResetPasswordDialog({ open, user, onClose }: Props) {
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!user) return;

        try {
            setLoading(true);

            const response = await authApi.resetPassword(user.id);

            toast.success(
                response?.Message ??
                'Reset mật khẩu thành công. Mật khẩu mới là số điện thoại.'
            );

            onClose();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.Message ??
                'Reset mật khẩu thất bại'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, color: '#f59e0b' }}>
                Reset mật khẩu
            </DialogTitle>

            <DialogContent>
                <Typography sx={{ mb: 1 }}>
                    Bạn có chắc muốn reset mật khẩu cho nhân sự:
                </Typography>

                <Typography sx={{ fontWeight: 800, color: '#086839', mb: 2 }}>
                    {user?.name}
                </Typography>

                <Typography sx={{ fontSize: 13, color: '#64748b', mb: 3 }}>
                    Mật khẩu mới sẽ được đặt về số điện thoại của nhân sự.
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                    <Button onClick={onClose} disabled={loading}>
                        Hủy
                    </Button>

                    <Button
                        variant="contained"
                        disabled={loading}
                        onClick={handleReset}
                        sx={{
                            bgcolor: '#f59e0b',
                            '&:hover': {
                                bgcolor: '#d97706',
                            },
                        }}
                    >
                        {loading ? 'Đang reset...' : 'Reset mật khẩu'}
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
}