'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    IconButton,
    MenuItem,
    TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import { userApi } from '@/features/user/api/user.api';
import LoadingOverlay from '@/components/common/LoadingOverlay';

type Props = {
    open: boolean;
    userId: any | null;
    branchOptions: { id: number; name: string }[];
    onClose: () => void;
    onSuccess: () => void;
};

// Định nghĩa kiểu dữ liệu cho Role từ DB
type RoleOption = {
    id: number;
    name: string;
};

export default function EditUserDialog({
    open,
    userId,
    branchOptions,
    onClose,
    onSuccess,
}: Props) {
    const [user, setUser] = useState<any>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dayOfBirth, setDayOfBirth] = useState('');
    const [branchesId, setBranchesId] = useState<number | ''>('');
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
    const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]); // Lưu danh sách roles từ DB
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    // 1. Gọi API lấy toàn bộ danh sách Roles khi mở Dialog
    const fetchAllRoles = async () => {
        const response = await userApi.getRoles();
        setRoleOptions(response.content || response.data || []);
    };
    const formatDate = (value?: string | null) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
    };
    const fetchUserById = async () => {
        const res = await userApi.getUserById(userId);
        const currentUser = res.content;

        console.log('currentUser', currentUser);

        setUser(currentUser);
        setName(currentUser.name ?? '');
        setEmail(currentUser.email ?? '');
        setPhone(currentUser.phone ?? '');
        setBranchesId(currentUser.branchesId ?? '');
        setSelectedRoleIds(currentUser.roles.map((role: any) => role.id) ?? []);
        setDayOfBirth(
            currentUser.dayOfBirth
                ? new Date(currentUser.dayOfBirth)
                    .toISOString()
                    .split('T')[0]
                : ''
        );
    };
    useEffect(() => {
        if (!open || !userId) {
            setUser(null);
            setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                setLoading(true);

                await Promise.all([
                    fetchAllRoles(),
                    fetchUserById()
                ]);
            }
            catch (error) {
                console.error(error);
                toast.error("Không tải được dữ liệu");
            }
            finally {
                setLoading(false);
            }
        };

        loadData();
    }, [open, userId]);



    // 3. Xử lý khi click vào Checkbox để chọn/bỏ chọn Role
    const handleRoleChange = (roleId: number, checked: boolean) => {
        if (checked) {
            setSelectedRoleIds((prev) =>
                prev.includes(roleId) ? prev : [...prev, roleId]
            );
        } else {
            setSelectedRoleIds((prev) => prev.filter((id) => id !== roleId));
        }
    };

    const handleSubmit = async () => {
        if (!user) return;

        try {
            setSaving(true);

            await userApi.updateUser(user.id, {
                name,
                email,
                phone,
                branchesId,
                updatedAt: user.updatedAt,
                roleIds: selectedRoleIds, // Gửi mảng ID mới đã chọn lên server
                dayOfBirth: dayOfBirth ?? null,
            });

            toast.success('Cập nhật nhân sự thành công');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.Message ??
                'Cập nhật nhân sự thất bại'
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
                Sửa thông tin nhân sự

                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <LoadingOverlay open={loading} text="Đang tải thông tin nhân sự..." />
            <DialogContent>
                <Box sx={{ display: 'grid', gap: 2.5, mt: 1.5 }}>
                    <TextField
                        label="Tên nhân sự"
                        size="small"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                    />

                    <TextField
                        label="Email"
                        size="small"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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

                    <TextField
                        select
                        label="Chi nhánh"
                        size="small"
                        value={branchesId}
                        onChange={(e) => setBranchesId(Number(e.target.value))}
                        fullWidth
                    >
                        {branchOptions.map((item) => (
                            <MenuItem key={item.id} value={item.id}>
                                {item.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* KHU VỰC CẢI TIẾN: DANH SÁCH CHECKBOX VAI TRÒ */}
                    <FormControl component="fieldset" variant="standard" sx={{ mt: 1 }}>
                        <FormLabel
                            component="legend"
                            sx={{
                                fontWeight: 700,
                                color: '#334155',
                                fontSize: '0.875rem',
                                mb: 1,
                                '&.Mui-focused': { color: '#086839' }
                            }}
                        >
                            Vai trò chức vụ
                        </FormLabel>
                        <FormGroup
                            row
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                gap: 1
                            }}
                        >
                            {roleOptions.map((role) => (
                                <FormControlLabel
                                    key={role.id}
                                    control={
                                        <Checkbox
                                            size="small"
                                            checked={selectedRoleIds.includes(role.id)}
                                            onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                                            sx={{
                                                color: '#086839',
                                                '&.Mui-checked': { color: '#086839' },
                                            }}
                                        />
                                    }
                                    label={role.name}
                                    sx={{
                                        '& .MuiFormControlLabel-label': {
                                            fontSize: '0.9rem',
                                            fontWeight: 500
                                        }
                                    }}
                                />
                            ))}
                        </FormGroup>
                    </FormControl>

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
                                '&:hover': { bgcolor: '#0e4837' },
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