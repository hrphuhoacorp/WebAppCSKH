'use client';

import { useEffect, useState } from 'react';
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
    TablePagination,
    TableRow,
    TextField,
    Typography,
    alpha,
} from '@mui/material';
import { Search, Edit, Delete, Visibility } from '@mui/icons-material';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { userApi } from '@/features/user/api/user.api';
import { ordersApi } from '@/features/orders/api/orders.api';
import UserDetailDialog from '@/features/user/components/UserDetailDialog';
import EditUserDialog from '@/features/user/components/EditUserDialog';
import DeleteUserDialog from '@/features/user/components/DeleteUserDialog';

type UserRow = {
    id: number;
    name: string;
    email: string;
    phone: string;
    branchesName: string;
    branchesId: number;
    roles: string[];
    roleIds: number[];
    createdAt: string;
    updatedAt: string;
};

const roleOptions = ['Admin', 'Manager', 'Staff'];

export default function UsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [role, setRole] = useState('');
    const [branchId, setBranchId] = useState<number | ''>('');
    const [branchOptions, setBranchOptions] = useState<{ id: number; name: string }[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

    const [detailOpen, setDetailOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const formatDate = (value?: string | null) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(new Date(value));
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(0);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await userApi.getUsers({
                page: page + 1,
                pageSize,
                search: debouncedSearch || undefined,
                role: role || undefined,
                branchId: branchId || undefined,
            });
            setUsers(response.content.items);
            setTotal(response.content.totalItems);
        } catch (error: any) {
            toast.error(error?.response?.data?.message ?? 'Không tải được danh sách nhân sự');
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const response = await ordersApi.getBranches();
            setBranchOptions(response.content);
        } catch {
            toast.error('Không tải được danh sách chi nhánh');
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [page, pageSize, debouncedSearch, role, branchId]);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc', overflow: 'hidden' }}>
            <LoadingOverlay open={loading} text="Đang tải danh sách nhân sự..." />

            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#086839', letterSpacing: '-0.75px' }}>
                    Danh Sách Nhân Sự
                </Typography>
                <Typography sx={{ color: '#64748b', fontWeight: 500, fontSize: '0.95rem', mt: 0.5 }}>
                    Theo dõi thông tin nhân sự, phân quyền và chi nhánh làm việc trong hệ thống
                </Typography>
            </Box>

            {/* Thanh Bộ Lọc */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '14px', mb: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 2 }}>
                    <TextField
                        size="small"
                        label="Tìm kiếm nhân sự"
                        placeholder="Nhập tên, email, số điện thoại..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search sx={{ color: '#94a3b8', fontSize: 20 }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />

                    <TextField
                        select
                        size="small"
                        label="Vai trò"
                        value={role}
                        onChange={(e) => { setRole(e.target.value); setPage(0); }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    >
                        <MenuItem value="">Tất cả vai trò</MenuItem>
                        {roleOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                    </TextField>

                    <TextField
                        select
                        size="small"
                        label="Chi nhánh"
                        value={branchId}
                        onChange={(e) => { setBranchId(e.target.value ? Number(e.target.value) : ''); setPage(0); }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    >
                        <MenuItem value="">Tất cả chi nhánh</MenuItem>
                        {branchOptions.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                    </TextField>
                </Box>
            </Paper>

            {/* Bảng dữ liệu */}
            <TableContainer component={Paper} elevation={0} sx={{ flex: 1, minHeight: 0, borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'auto', bgcolor: 'white' }}>
                <Table stickyHeader size="medium">
                    <TableHead>
                        <TableRow>
                            {['Tên nhân sự', 'Email', 'Số điện thoại', 'Vai trò', 'Chi nhánh', 'Ngày tạo', 'Thao tác'].map((label) => (
                                <TableCell key={label} sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2 }}>
                                    {label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc !important' } }}>
                                <TableCell sx={{ fontWeight: 700, color: '#086839' }}>{user.name}</TableCell>
                                <TableCell sx={{ color: '#334155' }}>{user.email || '-'}</TableCell>
                                <TableCell sx={{ color: '#334155' }}>{user.phone || '-'}</TableCell>
                                <TableCell>
                                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                        {user.roles?.length ? user.roles.map((item) => (
                                            <Chip key={item} label={item} size="small" sx={{ bgcolor: alpha('#086839', 0.06), color: '#086839', fontWeight: 600, border: `1px solid ${alpha('#086839', 0.15)}`, borderRadius: '6px' }} />
                                        )) : '-'}
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Chip label={user.branchesName || '-'} size="small" sx={{ bgcolor: alpha('#2563eb', 0.06), color: '#2563eb', fontWeight: 600, border: `1px solid ${alpha('#2563eb', 0.15)}`, borderRadius: '6px' }} />
                                </TableCell>
                                <TableCell sx={{ color: '#64748b' }}>{formatDate(user.createdAt)}</TableCell>
                                <TableCell>
                                    <Stack direction="row" spacing={1}>
                                        <IconButton size="small" title="Xem chi tiết" sx={{ color: '#64748b', '&:hover': { color: '#086839', bgcolor: alpha('#086839', 0.08) } }} onClick={() => { setSelectedUser(user); setDetailOpen(true); }}>
                                            <Visibility fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" title="Sửa" sx={{ color: '#64748b', '&:hover': { color: '#2563eb', bgcolor: alpha('#2563eb', 0.08) } }} onClick={() => { setSelectedUser(user); setEditOpen(true); }}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" title="Xóa" sx={{ color: '#64748b', '&:hover': { color: '#dc2626', bgcolor: alpha('#dc2626', 0.08) } }} onClick={() => { setSelectedUser(user); setDeleteOpen(true); }}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}

                        {!users.length && !loading && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 8, color: '#64748b' }}>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>Không tìm thấy nhân sự nào tương thích</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={total}
                page={page}
                rowsPerPage={pageSize}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                labelRowsPerPage="Số dòng hiển thị:"
                sx={{ bgcolor: 'white', borderTop: '1px solid #e2e8f0' }}
            />

            {/* Các Dialog được gọi điều hướng */}
            <UserDetailDialog open={detailOpen} userId={selectedUser?.id ?? null} onClose={() => { setDetailOpen(false); setSelectedUser(null); }} />
            <EditUserDialog open={editOpen} user={selectedUser} branchOptions={branchOptions} onClose={() => { setEditOpen(false); setSelectedUser(null); }} onSuccess={fetchUsers} />
            <DeleteUserDialog open={deleteOpen} user={selectedUser} onClose={() => { setDeleteOpen(false); setSelectedUser(null); }} onSuccess={fetchUsers} />
        </Box>
    );
}