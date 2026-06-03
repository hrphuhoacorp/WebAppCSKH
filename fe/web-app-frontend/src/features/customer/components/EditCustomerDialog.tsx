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
import { customerApi } from '@/features/customer/api/customer.api';

type Props = {
    open: boolean;
    customer: CustomerSchema | null;
    onClose: () => void;
    onSuccess: () => void;
};

export default function EditCustomerDialog({
    open,
    customer,
    onClose,
    onSuccess,
}: Props) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [dayOfBirth, setDayOfBirth] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!customer) return;

        setName(customer.name ?? '');
        setPhone(customer.phone ?? '');
        setDayOfBirth(
            customer.dayOfBirth
                ? customer.dayOfBirth.substring(0, 10)
                : ''
        );
    }, [customer]);

    const handleSubmit = async () => {
        if (!customer) return;

        try {
            setSaving(true);
            console.log('customer.updatedAt:', customer.updatedAt);
            await customerApi.updateCustomer(customer.id, {
                name,
                phone,
                dayOfBirth: dayOfBirth || null,
                updatedAt: customer.updatedAt,
            });

            toast.success('Cập nhật khách hàng thành công');

            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.Message ??
                error?.response?.data?.message ??
                'Cập nhật khách hàng thất bại'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle
                sx={{
                    fontWeight: 800,
                    color: '#086839',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                Sửa thông tin khách hàng

                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        mt: 1,
                    }}
                >
                    <TextField
                        label="Tên khách hàng"
                        size="small"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                    />

                    <TextField
                        label="Số điện thoại"
                        size="small"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        fullWidth
                    />

                    <TextField
                        label="Ngày sinh"
                        type="date"
                        size="small"
                        value={dayOfBirth}
                        onChange={(e) => setDayOfBirth(e.target.value)}
                        fullWidth
                        slotProps={{
                            inputLabel: {
                                shrink: true,
                            },
                        }}
                    />

                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 1.5,
                            mt: 1,
                        }}
                    >
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
                            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}