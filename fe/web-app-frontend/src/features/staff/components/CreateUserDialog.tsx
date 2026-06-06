'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import { authApi } from '@/features/auth/api/auth.api';
import { userApi } from '@/features/user/api/user.api';

type Props = {
    open: boolean;
    branchOptions: { id: number; name: string }[];
    onClose: () => void;
    onSuccess: () => void;
};

// Định nghĩa kiểu dữ liệu cho object chứa lỗi
type FormErrors = {
    staffCode?: string;
    branchesId?: string;
    name?: string;
    email?: string;
    phone?: string;
    roleId?: string;
};

export default function CreateUserDialog({
    open,
    branchOptions,
    onClose,
    onSuccess,
}: Props) {
    const [staffCode, setStaffCode] = useState('');
    const [branchesId, setBranchesId] = useState<number | ''>('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dayOfBirth, setDayOfBirth] = useState('');
    const [roleId, setRoleId] = useState<number | ''>('');
    const [saving, setSaving] = useState(false);
    const [roleOptions, setRoleOptions] = useState<any[]>([]);

    // State quản lý lỗi cục bộ cho từng input
    const [errors, setErrors] = useState<FormErrors>({});

    const fetchRoles = async () => {
        try {
            const response = await userApi.getRoles();
            setRoleOptions(response.content);
        } catch {
            toast.error('Không tải được danh sách vai trò');
        }
    };

    useEffect(() => {
        if (!open) return;
        fetchRoles();

        // Reset dữ liệu và lỗi khi mở lại Dialog
        setStaffCode('');
        setBranchesId('');
        setName('');
        setEmail('');
        setPhone('');
        setDayOfBirth('');
        setRoleId('');
        setErrors({});
    }, [open]);

    // Hàm validate dữ liệu thủ công
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!staffCode.trim()) newErrors.staffCode = 'Vui lòng nhập mã nhân viên';
        if (!branchesId) newErrors.branchesId = 'Vui lòng chọn chi nhánh';
        if (!name.trim()) newErrors.name = 'Vui lòng nhập họ tên';

        // Validate Email căn bản
        if (!email.trim()) {
            newErrors.email = 'Vui lòng nhập email';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email không đúng định dạng';
        }

        // Validate Số điện thoại căn bản
        if (!phone.trim()) {
            newErrors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!/^\d{10,11}$/.test(phone.trim())) {
            newErrors.phone = 'Số điện thoại phải từ 10-11 chữ số';
        }

        if (!roleId) newErrors.roleId = 'Vui lòng chọn vai trò';

        setErrors(newErrors);

        // Nếu object newErrors không có key nào tức là form hợp lệ
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        // Thực hiện validate trước khi submit
        if (!validateForm()) {
            toast.error('Vui lòng kiểm tra lại các thông tin bắt buộc');
            return;
        }

        try {
            setSaving(true);

            await authApi.createAccount({
                staffCode,
                branchesId: Number(branchesId),
                name,
                email,
                phone,
                dayOfBirth: dayOfBirth || null,
                roleId: Number(roleId),
            });

            toast.success('Thêm nhân sự thành công');

            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ??
                error?.response?.data?.Message ??
                'Thêm nhân sự thất bại'
            );
        } finally {
            setSaving(false);
        }
    };

    // Hàm xóa lỗi của từng trường khi người dùng bắt đầu gõ/chọn lại
    const handleClearError = (field: keyof FormErrors) => {
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
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
                Thêm nhân sự mới

                <IconButton onClick={onClose} size="small">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Typography sx={{ color: '#64748b', fontSize: 13, mb: 2 }}>
                    Mật khẩu mặc định sẽ là số điện thoại của nhân sự.
                </Typography>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            md: '1fr 1fr',
                        },
                        gap: 2,
                        mt: 1,
                    }}
                >
                    <TextField
                        label="Mã nhân viên"
                        size="small"
                        value={staffCode}
                        onChange={(e) => {
                            setStaffCode(e.target.value);
                            handleClearError('staffCode');
                        }}
                        error={!!errors.staffCode}
                        helperText={errors.staffCode}
                        fullWidth
                    />

                    <TextField
                        select
                        label="Chi nhánh"
                        size="small"
                        value={branchesId}
                        onChange={(e) => {
                            setBranchesId(Number(e.target.value));
                            handleClearError('branchesId');
                        }}
                        error={!!errors.branchesId}
                        helperText={errors.branchesId}
                        fullWidth
                    >
                        {branchOptions.map((item) => (
                            <MenuItem key={item.id} value={item.id}>
                                {item.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label="Họ tên"
                        size="small"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            handleClearError('name');
                        }}
                        error={!!errors.name}
                        helperText={errors.name}
                        fullWidth
                    />

                    <TextField
                        label="Email"
                        size="small"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            handleClearError('email');
                        }}
                        error={!!errors.email}
                        helperText={errors.email}
                        fullWidth
                    />

                    <TextField
                        label="Số điện thoại"
                        size="small"
                        value={phone}
                        onChange={(e) => {
                            setPhone(e.target.value);
                            handleClearError('phone');
                        }}
                        error={!!errors.phone}
                        helperText={errors.phone}
                        fullWidth
                    />

                    <TextField
                        type="date"
                        label="Ngày sinh"
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

                    <TextField
                        select
                        label="Vai trò"
                        size="small"
                        value={roleId}
                        onChange={(e) => {
                            setRoleId(Number(e.target.value));
                            handleClearError('roleId');
                        }}
                        error={!!errors.roleId}
                        helperText={errors.roleId}
                        fullWidth
                    >
                        {roleOptions.map((item) => (
                            <MenuItem key={item.id} value={item.id}>
                                {item.name}
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 1.5,
                        mt: 3,
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
                        {saving ? 'Đang tạo...' : 'Thêm nhân sự'}
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
}