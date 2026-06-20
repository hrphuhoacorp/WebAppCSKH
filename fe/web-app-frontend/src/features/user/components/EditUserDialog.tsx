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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import { userApi } from '@/features/user/api/user.api';
import { permissionApi } from '@/features/staff/api/permission.api';
import LoadingOverlay from '@/components/common/LoadingOverlay';

type Props = {
    open: boolean;
    userId: any | null;
    branchOptions: { id: number; name: string }[];
    onClose: () => void;
    onSuccess: () => void;
};

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
    const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
    const [originalRoleId, setOriginalRoleId] = useState<number | ''>('');
    const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchAllRoles = async () => {
        const response = await userApi.getRoles();
        setRoleOptions(response.content || response.data || []);
    };

    const fetchUserById = async () => {
        const res = await userApi.getUserById(userId);
        const currentUser = res.content;
        setUser(currentUser);
        setName(currentUser.name ?? '');
        setEmail(currentUser.email ?? '');
        setPhone(currentUser.phone ?? '');
        setBranchesId(currentUser.branchesId ?? '');
        const roleId = currentUser.roles?.[0]?.id ?? '';
        setSelectedRoleId(roleId);
        setOriginalRoleId(roleId);
        setDayOfBirth(
            currentUser.dayOfBirth
                ? new Date(currentUser.dayOfBirth).toISOString().split('T')[0]
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
                await Promise.all([fetchAllRoles(), fetchUserById()]);
            } catch (error: any) {
                toast.error(error?.response?.data?.Message ?? 'Không tải được dữ liệu');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [open, userId]);

    const handleSubmit = async () => {
        if (!user || selectedRoleId === '') {
            toast.error('Vui lòng chọn vai trò');
            return;
        }

        try {
            setSaving(true);

            await userApi.updateUser(user.id, {
                name,
                email,
                phone,
                branchesId,
                updatedAt: user.updatedAt,
                roleIds: [selectedRoleId as number],
                dayOfBirth: dayOfBirth ?? null,
            });

            // Khi đổi role → xóa toàn bộ quyền bổ sung, reset về mặc định của role mới
            if (selectedRoleId !== originalRoleId) {
                await permissionApi.updateUser(user.id, []);
            }

            toast.success('Cập nhật nhân sự thành công');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.Message ?? 'Cập nhật nhân sự thất bại');
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
                        slotProps={{ inputLabel: { shrink: true } }}
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

                    <TextField
                        select
                        label="Vai trò chức vụ"
                        size="small"
                        value={selectedRoleId}
                        onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                        fullWidth
                        sx={{
                            '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#086839' },
                            '& label.Mui-focused': { color: '#086839' },
                        }}
                    >
                        {roleOptions.map((role) => (
                            <MenuItem key={role.id} value={role.id}>
                                {role.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    {selectedRoleId !== originalRoleId && originalRoleId !== '' && (
                        <Box
                            sx={{
                                px: 2,
                                py: 1,
                                bgcolor: '#fff7ed',
                                border: '1px solid #fed7aa',
                                borderRadius: '10px',
                                fontSize: 13,
                                color: '#c2410c',
                            }}
                        >
                            ⚠️ Đổi vai trò sẽ xóa toàn bộ quyền bổ sung. Quyền mặc định của vai trò mới sẽ được áp dụng khi nhân viên đăng nhập lại.
                        </Box>
                    )}

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
