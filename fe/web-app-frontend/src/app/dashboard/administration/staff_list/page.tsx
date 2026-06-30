'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
    Box,
    Button,
    Chip,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    alpha,
    Tooltip,
    TablePagination,
} from '@mui/material';
import {
    Search,
    Edit,
    Delete,
    Visibility,
    PersonSearch,
    FilterList,
    Settings,
    LockReset,
    AddCircleRounded,
    RestorePageRounded,
    FileUploadRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import PageHeader from '@/components/common/PageHeader';
import { BadgeRounded } from '@mui/icons-material';
import { userApi } from '@/features/user/api/user.api';
import { ordersApi } from '@/features/orders/api/orders.api';
import UserDetailDialog from '@/features/user/components/UserDetailDialog';
import DeleteUserDialog from '@/features/user/components/DeleteUserDialog';
import EditUserDialog from '@/features/user/components/EditUserDialog';
import ResetPasswordDialog from '@/features/staff/components/ResetPasswordDialog';
import CreateUserDialog from '@/features/staff/components/CreateUserDialog';
import RestoreUserDialog from '@/features/staff/components/RestoreUserDialog';
import ImportStaffDialog from '@/features/staff/components/ImportStaffDialog';
import PermissionDialog from '@/features/staff/components/PermissionDialog';
import { usePermission } from '@/hooks/usePermission';

type UserRow = {
    id: number;
    staffCode: string;
    name: string;
    email: string;
    phone: string;
    branchesName: string;
    branchesId: number;
    dayOfBirth: string;
    roles: string[];
    roleIds: number[];
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};



const ROLE_COLORS = [
    { bg: '#fef3c7', color: '#b45309', border: '#fde68a' }, // vàng
    { bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' }, // tím
    { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' }, // xanh lá
    { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' }, // xanh dương
    { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' }, // đỏ
    { bg: '#fce7f3', color: '#db2777', border: '#fbcfe8' }, // hồng
    { bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd' }, // sky
    { bg: '#ecfccb', color: '#65a30d', border: '#d9f99d' }, // lime
    { bg: '#ffedd5', color: '#ea580c', border: '#fed7aa' }, // cam
    { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' }, // indigo
    { bg: '#f3e8ff', color: '#9333ea', border: '#e9d5ff' }, // violet
    { bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' }, // teal
    { bg: '#fae8ff', color: '#a21caf', border: '#f5d0fe' }, // fuchsia
    { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }, // rose red
    { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }, // slate
];

export default function UsersPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [role, setRole] = useState('');
    const [branchId, setBranchId] = useState<number | ''>('');
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [restoreOpen, setRestoreOpen] = useState(false);
    const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [permOpen, setPermOpen] = useState(false);
    const canManagePermissions = usePermission('staff.manage_permissions');
    const canImport = usePermission('staff.import');
    const canCreate = usePermission('staff.create_account');
    const canUpdate = usePermission('staff.update');
    const canDelete = usePermission('staff.delete_account');
    const canRestore = usePermission('staff.restore_account');
    const canResetPassword = usePermission('staff.reset_password');

    const formatDate = (value?: string | null) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(new Date(value));
    };

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(0); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const { data: usersData, isFetching: loading } = useQuery({
        queryKey: ['users', page, pageSize, debouncedSearch, role, branchId],
        queryFn: async () => {
            const response = await userApi.getUsers({
                page: page + 1,
                pageSize,
                search: debouncedSearch || undefined,
                role: role || undefined,
                branchId: branchId || undefined,
            });
            return response.content;
        },
        placeholderData: (prev) => prev,
    });

    const users: UserRow[] = usersData?.items ?? [];
    const total: number = usersData?.totalItems ?? 0;

    const { data: branchOptions = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const response = await ordersApi.getBranches();
            return response.content as { id: number; name: string }[];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: roleOptions = [] } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const response = await userApi.getRoles();
            return response.content as { id: number; name: string }[];
        },
        staleTime: 5 * 60 * 1000,
    });

    const refreshUsers = () => queryClient.invalidateQueries({ queryKey: ['users'] });

    const getRoleColor = (role: string) => {
        let hash = 0;
        for (let i = 0; i < role.length; i++) {
            hash = role.charCodeAt(i) + ((hash << 5) - hash);
        }
        return ROLE_COLORS[Math.abs(hash) % ROLE_COLORS.length];
    };

    const hasActiveFilter = !!debouncedSearch || !!role || !!branchId;

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                height: { xs: 'calc(100vh - 56px)', lg: '100vh' },
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#f0f7f3',
                backgroundImage: `radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)`,
                overflow: 'hidden',
            }}
        >
            <LoadingOverlay open={loading} text="Đang tải danh sách nhân sự..." fullScreen />

            <PageHeader
                title="Danh Sách Nhân Sự"
                subtitle="Theo dõi thông tin nhân sự, phân quyền và chi nhánh trong hệ thống"
                icon={<BadgeRounded />}
                gradient="linear-gradient(135deg, #086839 0%, #059669 100%)"
                shadowColor="rgba(8,104,57,0.28)"
                actions={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {canImport && (
                        <Button
                            variant="outlined"
                            startIcon={<FileUploadRounded />}
                            onClick={() => setImportOpen(true)}
                            sx={{
                                borderColor: '#086839',
                                color: '#086839',
                                borderRadius: '12px',
                                fontWeight: 700,
                                textTransform: 'none',
                                px: 2,
                                '&:hover': {
                                    bgcolor: alpha('#086839', 0.06),
                                    borderColor: '#086839',
                                },
                            }}
                        >
                            Import nhân sự
                        </Button>
                    )}
                    {canCreate && (
                        <Button
                            variant="contained"
                            startIcon={<AddCircleRounded />}
                            onClick={() => setCreateOpen(true)}
                            sx={{
                                bgcolor: '#086839',
                                borderRadius: '12px',
                                fontWeight: 700,
                                textTransform: 'none',
                                px: 2,
                                boxShadow: '0 1px 6px rgba(8,104,57,0.18)',
                                '&:hover': {
                                    bgcolor: '#0e4837',
                                },
                            }}
                        >
                            Thêm nhân sự
                        </Button>
                    )}


                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            bgcolor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            px: 2,
                            py: 1,
                            boxShadow: '0 1px 6px rgba(8,104,57,0.06)',
                        }}
                    >
                        <Box
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: '#22c55e',
                                boxShadow: '0 0 0 3px rgba(34,197,94,0.2)',
                            }}
                        />

                        <Typography sx={{ fontWeight: 700, color: '#086839', fontSize: 14 }}>
                            {total.toLocaleString('vi-VN')} nhân sự
                        </Typography>
                    </Box>
                </Box>}
            />

            {/* ── Filter Bar ── */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    borderRadius: '20px',
                    mb: 2.5,
                    border: '1px solid #e2e8f0',
                    bgcolor: '#fff',
                    boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <FilterList sx={{ color: '#086839', fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>
                        Bộ lọc
                    </Typography>
                    {hasActiveFilter && (
                        <Chip
                            label="Đang lọc"
                            size="small"
                            sx={{
                                bgcolor: '#dcfce7',
                                color: '#15803d',
                                fontWeight: 700,
                                fontSize: 11,
                                height: 20,
                                border: '1px solid #bbf7d0',
                            }}
                        />
                    )}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 2 }}>
                    <TextField
                        size="small"
                        label="Tìm kiếm nhân sự"
                        placeholder="Nhập tên, email, số điện thoại..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: '#94a3b8', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                '&.Mui-focused fieldset': { borderColor: '#086839' },
                            },
                            '& label.Mui-focused': { color: '#086839' },
                        }}
                    />

                    <TextField
                        select
                        size="small"
                        label="Vai trò"
                        value={role}
                        onChange={(e) => { setRole(e.target.value); setPage(0); }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                '&.Mui-focused fieldset': { borderColor: '#086839' },
                            },
                            '& label.Mui-focused': { color: '#086839' },
                        }}
                    >
                        <MenuItem value="">Tất cả vai trò</MenuItem>
                        {roleOptions.map((item) => (
                            <MenuItem key={item.id} value={item.name}>{item.name}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        size="small"
                        label="Chi nhánh"
                        value={branchId}
                        onChange={(e) => { setBranchId(e.target.value ? Number(e.target.value) : ''); setPage(0); }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                '&.Mui-focused fieldset': { borderColor: '#086839' },
                            },
                            '& label.Mui-focused': { color: '#086839' },
                        }}
                    >
                        <MenuItem value="">Tất cả chi nhánh</MenuItem>
                        {branchOptions.map((item) => (
                            <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                        ))}
                    </TextField>
                </Box>
            </Paper>

            {/* ── Table ── */}
            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    overflow: 'auto',
                    bgcolor: '#fff',
                    boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                    '&::-webkit-scrollbar': { width: 6, height: 6 },
                    '&::-webkit-scrollbar-track': { bgcolor: '#f8fafc' },
                    '&::-webkit-scrollbar-thumb': {
                        bgcolor: '#cbd5e1',
                        borderRadius: 3,
                        '&:hover': { bgcolor: '#94a3b8' },
                    },
                }}
            >
                <Table stickyHeader size="medium">
                    <TableHead>
                        <TableRow>
                            {[
                                'Mã nhân viên',
                                'Tên nhân sự',
                                'Email',
                                'Số điện thoại',
                                'Ngày sinh',
                                'Vai trò',
                                'Chi nhánh',
                                'Ngày tạo',
                                'Thao tác',
                            ].map((label) => (
                                <TableCell
                                    key={label}
                                    sx={{
                                        bgcolor: '#f8fafc',
                                        color: '#475569',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        fontSize: 12,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.6px',
                                        py: 1.75,
                                        borderBottom: '2px solid #e2e8f0',
                                    }}
                                >
                                    {label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {users.map((user, index) => {
                            const isDeleted = user.deletedAt !== null;
                            return (
                                <TableRow
                                    key={user.id}
                                    sx={{
                                        bgcolor: index % 2 === 0 ? '#fff' : '#fafcfb',
                                        opacity: isDeleted ? 0.55 : 1,
                                        '&:hover': {
                                            bgcolor: '#f0fdf4 !important',
                                            '& .action-btn': { opacity: 1 },
                                        },
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {/* Mã nhân viên */}
                                    <TableCell>
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: 13,
                                                color: '#475569',
                                                fontFamily: 'monospace',
                                                bgcolor: '#f1f5f9',
                                                px: 1,
                                                py: 0.4,
                                                borderRadius: '6px',
                                                display: 'inline-block',
                                            }}
                                        >
                                            {user.staffCode}
                                        </Typography>
                                    </TableCell>

                                    {/* Tên */}
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '10px',
                                                    bgcolor: alpha('#086839', 0.1),
                                                    color: '#086839',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 800,
                                                    fontSize: 13,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {user.name?.charAt(0)}
                                            </Box>
                                            <Stack spacing={0.3}>
                                                <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: 14, whiteSpace: 'nowrap' }}>
                                                    {user.name}
                                                </Typography>
                                                {isDeleted && (
                                                    <Chip
                                                        label="Đã xóa mềm"
                                                        size="small"
                                                        sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 800, fontSize: 10, height: 16, borderRadius: '4px', width: 'fit-content' }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    </TableCell>

                                    <TableCell sx={{ color: '#475569', fontSize: 13 }}>{user.email || '-'}</TableCell>
                                    <TableCell sx={{ color: '#475569', fontSize: 13, whiteSpace: 'nowrap' }}>{user.phone || '-'}</TableCell>
                                    <TableCell sx={{ color: '#64748b', fontSize: 13, whiteSpace: 'nowrap' }}>{formatDate(user.dayOfBirth)}</TableCell>

                                    {/* Vai trò */}
                                    <TableCell>
                                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                            {user.roles?.length
                                                ? user.roles.map((r) => {
                                                    const c = getRoleColor(r) ?? { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
                                                    return (
                                                        <Chip
                                                            key={r}
                                                            label={r}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: c.bg,
                                                                color: c.color,
                                                                fontWeight: 700,
                                                                fontSize: 11,
                                                                border: `1px solid ${c.border}`,
                                                                borderRadius: '6px',
                                                                height: 22,
                                                            }}
                                                        />
                                                    );
                                                })
                                                : <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>-</Typography>
                                            }
                                        </Stack>
                                    </TableCell>

                                    {/* Chi nhánh */}
                                    <TableCell>
                                        <Chip
                                            label={user.branchesName || '-'}
                                            size="small"
                                            sx={{
                                                bgcolor: alpha('#2563eb', 0.06),
                                                color: '#2563eb',
                                                fontWeight: 600,
                                                fontSize: 11,
                                                border: `1px solid ${alpha('#2563eb', 0.15)}`,
                                                borderRadius: '6px',
                                                height: 22,
                                                whiteSpace: 'nowrap',
                                            }}
                                        />
                                    </TableCell>

                                    <TableCell sx={{ color: '#94a3b8', fontSize: 13, whiteSpace: 'nowrap' }}>
                                        {formatDate(user.createdAt)}
                                    </TableCell>

                                    {/* Thao tác */}
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5}>
                                            <Tooltip title="Xem chi tiết" arrow>
                                                <IconButton
                                                    size="small"
                                                    className="action-btn"
                                                    sx={{
                                                        color: '#94a3b8',
                                                        width: 30,
                                                        height: 30,
                                                        borderRadius: '8px',
                                                        '&:hover': { color: '#086839', bgcolor: alpha('#086839', 0.08) },
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onClick={() => { setSelectedUser(user); setDetailOpen(true); }}
                                                >
                                                    <Visibility sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>

                                            {canUpdate && (
                                                <Tooltip title="Chỉnh sửa" arrow>
                                                    <IconButton
                                                        size="small"
                                                        className="action-btn"
                                                        disabled={isDeleted}
                                                        sx={{
                                                            color: '#94a3b8',
                                                            width: 30,
                                                            height: 30,
                                                            borderRadius: '8px',
                                                            '&:hover': { color: '#2563eb', bgcolor: alpha('#2563eb', 0.08) },
                                                            transition: 'all 0.15s',
                                                        }}
                                                        onClick={() => { setSelectedUser(user); setEditOpen(true); }}
                                                    >
                                                        <Edit sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}

                                            {isDeleted ? (
                                                canRestore && (
                                                    <Tooltip title="Khôi phục tài khoản" arrow>
                                                        <IconButton
                                                            size="small"
                                                            className="action-btn"
                                                            sx={{
                                                                color: '#2563eb',
                                                                width: 30,
                                                                height: 30,
                                                                borderRadius: '8px',
                                                                bgcolor: alpha('#2563eb', 0.06),
                                                                '&:hover': { color: '#1d4ed8', bgcolor: alpha('#2563eb', 0.15) },
                                                            }}
                                                            onClick={() => { setSelectedUser(user); setRestoreOpen(true); }}
                                                        >
                                                            <RestorePageRounded sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )
                                            ) : (
                                                canDelete && (
                                                    <Tooltip title="Xóa" arrow>
                                                        <IconButton
                                                            size="small"
                                                            className="action-btn"
                                                            sx={{
                                                                color: '#94a3b8',
                                                                width: 30,
                                                                height: 30,
                                                                borderRadius: '8px',
                                                                '&:hover': { color: '#dc2626', bgcolor: alpha('#dc2626', 0.08) },
                                                                transition: 'all 0.15s',
                                                            }}
                                                            onClick={() => { setSelectedUser(user); setDeleteOpen(true); }}
                                                        >
                                                            <Delete sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )
                                            )}

                                            {canResetPassword && (
                                                <Tooltip title="Reset mật khẩu" arrow>
                                                    <IconButton
                                                        size="small"
                                                        className="action-btn"
                                                        disabled={isDeleted}
                                                        sx={{
                                                            color: '#94a3b8',
                                                            width: 30,
                                                            height: 30,
                                                            borderRadius: '8px',
                                                            '&:hover': {
                                                                color: '#f59e0b',
                                                                bgcolor: alpha('#f59e0b', 0.1),
                                                            },
                                                            transition: 'all 0.15s',
                                                        }}
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setResetPasswordOpen(true);
                                                        }}
                                                    >
                                                        <LockReset sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {canManagePermissions && (
                                                <Tooltip title="Phân quyền" arrow>
                                                    <IconButton
                                                        size="small"
                                                        className="action-btn"
                                                        disabled={isDeleted}
                                                        sx={{
                                                            color: '#94a3b8',
                                                            width: 30,
                                                            height: 30,
                                                            borderRadius: '8px',
                                                            '&:hover': { color: '#7c3aed', bgcolor: alpha('#7c3aed', 0.08) },
                                                            transition: 'all 0.15s',
                                                        }}
                                                        onClick={() => { setSelectedUser(user); setPermOpen(true); }}
                                                    >
                                                        <Settings sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {!users.length && !loading && (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                                        <Box
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: '16px',
                                                bgcolor: '#f1f5f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <PersonSearch sx={{ fontSize: 28, color: '#94a3b8' }} />
                                        </Box>
                                        <Typography sx={{ fontWeight: 700, color: '#64748b', fontSize: 15 }}>
                                            Không tìm thấy nhân sự nào
                                        </Typography>
                                        <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>
                                            Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ── Pagination ── */}
            <Box
                sx={{
                    bgcolor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderTop: 'none',
                    borderRadius: '0 0 20px 20px',
                    overflow: 'hidden',
                }}
            >
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={pageSize}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                    labelRowsPerPage="Số dòng:"
                    sx={{
                        '& .MuiTablePagination-toolbar': { minHeight: 48 },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            fontSize: 13,
                            color: '#64748b',
                        },
                    }}
                />
            </Box>

            {/* ── Dialogs ── */}
            <UserDetailDialog
                open={detailOpen}
                userId={selectedUser?.id ?? null}
                onClose={() => { setDetailOpen(false); setSelectedUser(null); }}
            />
            <EditUserDialog
                open={editOpen}
                userId={selectedUser?.id}
                branchOptions={branchOptions}
                onClose={() => { setEditOpen(false); setSelectedUser(null); }}
                onSuccess={refreshUsers}
            />
            <DeleteUserDialog
                open={deleteOpen}
                user={selectedUser}
                onClose={() => { setDeleteOpen(false); setSelectedUser(null); }}
                onSuccess={refreshUsers}
            />
            <RestoreUserDialog
                open={restoreOpen}
                user={selectedUser}
                onClose={() => { setRestoreOpen(false); setSelectedUser(null); }}
                onSuccess={refreshUsers}
            />
            <ResetPasswordDialog
                open={resetPasswordOpen}
                user={selectedUser}
                onClose={() => {
                    setResetPasswordOpen(false);
                    setSelectedUser(null);
                }}
            />
            <CreateUserDialog
                open={createOpen}
                branchOptions={branchOptions}
                onClose={() => setCreateOpen(false)}
                onSuccess={refreshUsers}
            />
            <ImportStaffDialog
                open={importOpen}
                onClose={() => setImportOpen(false)}
                onSuccess={refreshUsers}
            />
            <PermissionDialog
                open={permOpen}
                userId={selectedUser?.id ?? null}
                userName={selectedUser?.name ?? ''}
                onClose={() => { setPermOpen(false); setSelectedUser(null); }}
            />
        </Box>
    );
}

