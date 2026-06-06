'use client';

import { useEffect, useState } from 'react';
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

// Định nghĩa kiểu dữ liệu lỗi cho các trường mật khẩu
type FormErrors = {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
};

export default function ChangePasswordDialog({ open, onClose }: Props) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);

    // State quản lý lỗi cục bộ cho từng ô input
    const [errors, setErrors] = useState<FormErrors>({});

    // Reset dữ liệu và xóa lỗi cũ mỗi khi mở/đóng Dialog
    useEffect(() => {
        if (!open) return;
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setErrors({});
    }, [open]);

    // Hàm kiểm tra lỗi thủ công trước khi gửi API
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!currentPassword) {
            newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
        }

        if (!newPassword) {
            newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
        } else if (newPassword.length < 6) {
            // Thêm validate độ dài nếu cần, hoặc bỏ qua nếu backend tự xử lý
            newErrors.newPassword = 'Mật khẩu mới phải từ 6 ký tự trở lên';
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
        } else if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        // Chạy validate form
        if (!validateForm()) {
            toast.error('Vui lòng kiểm tra lại thông tin nhập vào');
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

    // Hàm xóa lỗi của ô input đó khi người dùng bắt đầu gõ lại dữ liệu
    const handleClearError = (field: keyof FormErrors) => {
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
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
                        onChange={(e) => {
                            setCurrentPassword(e.target.value);
                            handleClearError('currentPassword');
                        }}
                        error={!!errors.currentPassword}
                        helperText={errors.currentPassword}
                        fullWidth
                    />

                    <TextField
                        label="Mật khẩu mới"
                        type="password"
                        size="small"
                        value={newPassword}
                        onChange={(e) => {
                            setNewPassword(e.target.value);
                            handleClearError('newPassword');
                            // Nếu người dùng sửa mật khẩu mới, kiểm tra lại lỗi của ô confirm luôn
                            handleClearError('confirmPassword');
                        }}
                        error={!!errors.newPassword}
                        helperText={errors.newPassword}
                        fullWidth
                    />

                    <TextField
                        label="Xác nhận mật khẩu mới"
                        type="password"
                        size="small"
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            handleClearError('confirmPassword');
                        }}
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword}
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