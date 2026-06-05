'use client';

import { Box, Button, Dialog, DialogContent, DialogTitle, Typography, Divider } from '@mui/material';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { userApi } from '@/features/user/api/user.api';

type Props = {
    open: boolean;
    user: any | null;
    onClose: () => void;
    onSuccess: () => void;
};

export default function DeleteUserDialog({ open, user, onClose, onSuccess }: Props) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!user) return;
        try {
            setDeleting(true);
            await userApi.deleteUser(user.id, user.updatedAt);
            toast.success('Xóa nhân sự thành công');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.Message ?? 'Xóa nhân sự thất bại');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{
            paper: {
                sx: {
                    borderRadius: '14px',
                },
            },
        }}>
            <DialogTitle sx={{ fontWeight: 800, color: '#d32f2f', pb: 1.5 }}>
                Xác nhận xóa nhân sự
            </DialogTitle>
            <Divider />

            <DialogContent sx={{ pt: 2.5 }}>
                <Typography sx={{ mb: 1.5, color: '#1e293b', fontSize: '1rem' }}>
                    Bạn có chắc chắn muốn gỡ bỏ nhân sự{' '}
                    <Box component="span" sx={{ fontWeight: 800, color: '#d32f2f' }}>
                        {user?.name}
                    </Box>
                    {' '}khỏi danh sách hiển thị không?
                </Typography>

                <Typography sx={{ color: '#64748b', fontSize: 13, mb: 3, bgcolor: '#fef2f2', p: 1.5, borderRadius: '8px', border: '1px solid #fee2e2' }}>
                    💡 Thao tác này sẽ chỉ ẩn nhân sự khỏi danh sách quản lý hiện hành và hoàn toàn không xóa vĩnh viễn dữ liệu gốc trong hệ thống.
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                    <Button onClick={onClose} disabled={deleting} sx={{ color: '#64748b', fontWeight: 600 }}>
                        Hủy bỏ
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        disabled={deleting}
                        onClick={handleDelete}
                        sx={{ borderRadius: '8px', px: 3, fontWeight: 600, boxShadow: 'none', bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
                    >
                        {deleting ? 'Đang xử lý...' : 'Xác nhận xóa'}
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
}