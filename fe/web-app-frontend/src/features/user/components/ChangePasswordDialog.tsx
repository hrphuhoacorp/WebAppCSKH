'use client';

import { useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import { authApi } from '@/features/auth/api/auth.api';

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function ChangePasswordDialog({ open, onClose }: Props) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }

        try {
            setSaving(true);

            await authApi.changePassword({
                
                currentPassword,
                newPassword,
                confirmPassword,
            });

            toast.success('Đổi mật khẩu thành công');

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onClose();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ??
                error?.response?.data?.Message ??
                'Đổi mật khẩu thất bại'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle
                sx={{
                    fontWeight: 800,
                    color: '#086839',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                Đổi mật khẩu

                <IconButton onClick={onClose} size="small">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                    <TextField
                        label="Mật khẩu hiện tại"
                        type="password"
                        size="small"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        fullWidth
                    />

                    <TextField
                        label="Mật khẩu mới"
                        type="password"
                        size="small"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        fullWidth
                    />

                    <TextField
                        label="Xác nhận mật khẩu mới"
                        type="password"
                        size="small"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        fullWidth
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 1 }}>
                        <Button onClick={onClose} disabled={saving}>
                            Hủy
                        </Button>

                        <Button
                            variant="contained"
                            disabled={saving}
                            onClick={handleSubmit}
                            sx={{
                                bgcolor: '#086839',
                                '&:hover': {
                                    bgcolor: '#0e4837',
                                },
                            }}
                        >
                            {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}