'use client';

import {
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    Tooltip,
    Typography,
    alpha,
} from '@mui/material';
import { Close, LockOutlined, SelectAll, DeselectOutlined } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    permissionApi,
    PermissionGroupDTO,
    UserPermissionDetailDTO,
} from '../api/permission.api';

const MODULE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    'CSKH':         { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    'GÓI QUÀ':     { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
    'BÁN HÀNG':    { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    'KHO ẢNH':     { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    'TIN NỘI BỘ':  { bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
    'NHÂN SỰ':     { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
};

const getModuleColor = (module: string) =>
    MODULE_COLORS[module] ?? { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };

type Props = {
    open: boolean;
    userId: number | null;
    userName: string;
    onClose: () => void;
};

export default function PermissionDialog({ open, userId, userName, onClose }: Props) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [groups, setGroups] = useState<PermissionGroupDTO[]>([]);
    const [detail, setDetail] = useState<UserPermissionDetailDTO | null>(null);
    const [extraIds, setExtraIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!open || !userId) return;

        const load = async () => {
            setLoading(true);
            try {
                const [allGroups, userDetail] = await Promise.all([
                    permissionApi.getAll(),
                    permissionApi.getUser(userId),
                ]);
                setGroups(allGroups);
                setDetail(userDetail);
                setExtraIds(new Set(userDetail.extraPermissionIds));
            } catch (err: any) {
                toast.error(err?.response?.data?.Message ?? 'Không tải được danh sách quyền');
                onClose();
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [open, userId]);

    const roleCodesSet = new Set(detail?.rolePermissionCodes ?? []);

    const togglePerm = (id: number, code: string) => {
        if (roleCodesSet.has(code)) return;
        setExtraIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllInModule = (group: PermissionGroupDTO) => {
        setExtraIds((prev) => {
            const next = new Set(prev);
            group.permissions.forEach(({ id, code }) => {
                if (!roleCodesSet.has(code)) next.add(id);
            });
            return next;
        });
    };

    const deselectAllInModule = (group: PermissionGroupDTO) => {
        setExtraIds((prev) => {
            const next = new Set(prev);
            group.permissions.forEach(({ id, code }) => {
                if (!roleCodesSet.has(code)) next.delete(id);
            });
            return next;
        });
    };

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        try {
            await permissionApi.updateUser(userId, Array.from(extraIds));
            toast.success('Cập nhật quyền thành công');
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.Message ?? 'Cập nhật quyền thất bại');
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        if (!saving) onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: '20px',
                        maxHeight: '90vh',
                    },
                },
            }}
        >
            <DialogTitle sx={{ pb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: 17, color: '#1e293b' }}>
                            Phân quyền nhân sự
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.3 }}>
                            {userName}
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={handleClose} disabled={saving}>
                        <Close fontSize="small" />
                    </IconButton>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: '#e2e8f0', border: '1.5px solid #94a3b8' }} />
                        <Typography sx={{ fontSize: 12, color: '#64748b' }}>Quyền từ vai trò (không thể bỏ)</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: '#086839', border: '1.5px solid #086839' }} />
                        <Typography sx={{ fontSize: 12, color: '#64748b' }}>Quyền bổ sung (có thể thay đổi)</Typography>
                    </Box>
                </Box>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                        <CircularProgress size={36} sx={{ color: '#086839' }} />
                    </Box>
                ) : (
                    groups.map((group) => {
                        const c = getModuleColor(group.module);
                        const editablePerms = group.permissions.filter(p => !roleCodesSet.has(p.code));
                        const allSelected = editablePerms.length > 0 && editablePerms.every(p => extraIds.has(p.id));
                        const noneSelected = editablePerms.every(p => !extraIds.has(p.id));

                        return (
                            <Box key={group.module}>
                                {/* Module header */}
                                <Box
                                    sx={{
                                        px: 3,
                                        py: 1.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        bgcolor: c.bg,
                                        borderBottom: `1px solid ${c.border}`,
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1,
                                    }}
                                >
                                    <Chip
                                        label={group.module}
                                        size="small"
                                        sx={{
                                            bgcolor: c.bg,
                                            color: c.color,
                                            border: `1.5px solid ${c.border}`,
                                            fontWeight: 800,
                                            fontSize: 12,
                                            letterSpacing: '0.5px',
                                        }}
                                    />
                                    {editablePerms.length > 0 && (
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <Tooltip title="Chọn tất cả (quyền bổ sung)" arrow>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => selectAllInModule(group)}
                                                        disabled={allSelected}
                                                        sx={{ color: c.color, '&:hover': { bgcolor: alpha(c.color, 0.08) } }}
                                                    >
                                                        <SelectAll fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Bỏ chọn tất cả (quyền bổ sung)" arrow>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => deselectAllInModule(group)}
                                                        disabled={noneSelected}
                                                        sx={{ color: c.color, '&:hover': { bgcolor: alpha(c.color, 0.08) } }}
                                                    >
                                                        <DeselectOutlined fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    )}
                                </Box>

                                {/* Permission rows */}
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                                        px: 2,
                                        py: 1,
                                        gap: 0.5,
                                    }}
                                >
                                    {group.permissions.map((perm) => {
                                        const isFromRole = roleCodesSet.has(perm.code);
                                        const isExtra = extraIds.has(perm.id);
                                        const checked = isFromRole || isExtra;

                                        return (
                                            <FormControlLabel
                                                key={perm.id}
                                                label={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Typography sx={{ fontSize: 13, color: isFromRole ? '#94a3b8' : '#1e293b', fontWeight: isFromRole ? 400 : 500 }}>
                                                            {perm.name}
                                                        </Typography>
                                                        {isFromRole && (
                                                            <LockOutlined sx={{ fontSize: 12, color: '#cbd5e1' }} />
                                                        )}
                                                    </Box>
                                                }
                                                control={
                                                    <Checkbox
                                                        size="small"
                                                        checked={checked}
                                                        disabled={isFromRole}
                                                        onChange={() => togglePerm(perm.id, perm.code)}
                                                        sx={{
                                                            color: isFromRole ? '#cbd5e1' : '#94a3b8',
                                                            '&.Mui-checked': {
                                                                color: isFromRole ? '#cbd5e1' : '#086839',
                                                            },
                                                            '&.Mui-disabled': {
                                                                color: '#cbd5e1',
                                                            },
                                                            p: '4px',
                                                        }}
                                                    />
                                                }
                                                sx={{
                                                    mx: 0,
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: '8px',
                                                    '&:hover': !isFromRole ? { bgcolor: '#f0fdf4' } : {},
                                                    width: '100%',
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                                <Divider />
                            </Box>
                        );
                    })
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                <Button
                    onClick={handleClose}
                    disabled={saving}
                    sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        color: '#64748b',
                        '&:hover': { bgcolor: '#f1f5f9' },
                    }}
                >
                    Đóng
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={loading || saving}
                    sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: '#086839',
                        px: 3,
                        '&:hover': { bgcolor: '#0e4837' },
                        '&.Mui-disabled': { bgcolor: '#e2e8f0' },
                    }}
                >
                    {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Lưu quyền'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
