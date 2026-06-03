'use client';

import { useEffect, useState, useRef } from 'react';
import * as React from 'react';
import { InputAdornment } from '@mui/material';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Collapse,
    IconButton,
    Menu,
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
    Tooltip,
    Divider,
    alpha,
} from '@mui/material';
import {
    KeyboardArrowDown,
    KeyboardArrowUp,
    Search,
    FilterAlt,
    ExpandMore,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { customerApi } from '@/features/customer/api/customer.api';
import { LucideEdit } from 'lucide-react';
import OrderDetailDialog from '@/features/orders/components/OrderDetailDialog';
import EditCustomerDialog from '@/features/customer/components/EditCustomerDialog';

const sourceColors = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#f43f5e', // Rose
];

const getSourceStyle = (sourceName: string) => {
    if (!sourceName) return {};

    const charCodeSum = sourceName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color = sourceColors[charCodeSum % sourceColors.length];

    return {
        bgcolor: alpha(color, 0.08),
        color: color,
        fontWeight: 700,
        border: `1px solid ${alpha(color, 0.2)}`,
        borderRadius: '6px',
        fontSize: '0.75rem',
        height: '24px'
    };
};

const columns = [
    { key: 'customerCode', label: 'Mã KH' },
    { key: 'name', label: 'Tên KH' },
    { key: 'dayOfBirth', label: 'Ngày sinh' },
    { key: 'phone', label: 'SĐT' },
    { key: 'totalOrders', label: 'Tổng đơn hàng' },
    { key: 'totalRevenue', label: 'Tổng doanh thu' },
    { key: 'lastOrderAt', label: 'Lần mua gần nhất' },
    { key: 'createdBy', label: 'Tạo bởi' },
] as const;

export default function CustomerPage() {
    const [customers, setCustomers] = useState<CustomerSchema[]>([]);
    const [total, setTotal] = useState(100);
    const [openRow, setOpenRow] = useState<number | null>(null);
    const [filterOpen, setFilterOpen] = useState(false);

    // Filters state
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(
        columns.filter(c => c.key !== 'createdBy').map((c) => c.key)
    );

    const formatMoney = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    const formatDate = (value: string) =>
        new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(new Date(value));

    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [orderDetailOpen, setOrderDetailOpen] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<CustomerSchema | null>(null);

    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(0);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await customerApi.getCustomers({
                page: page + 1,
                pageSize,
                search: debouncedSearch || undefined,
            });
            setTotal(response.content.totalItems);
            setCustomers(response.content.items);
        } catch (error: any) {
            toast.error(error?.response?.data?.Message || 'Không thể tải danh sách khách hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [page, pageSize, debouncedSearch]);

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                bgcolor: '#f8fafc', // Đồng bộ màu nền dịu mắt nâng tone khối trắng
            }}
        >
            <LoadingOverlay open={loading} text="Đang tải dữ liệu khách hàng..." />

            {/* Header Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#086839', letterSpacing: '-0.75px', mb: 0.5 }}>
                    Danh Sách Khách Hàng
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                    Theo dõi, phân tích và quản lý thông tin khách hàng toàn diện
                </Typography>
            </Box>

            {/* Filter Section */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    mb: 3,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    bgcolor: 'white'
                }}
            >
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                    <TextField
                        size="small"
                        placeholder="Tìm theo mã khách hàng, tên, số điện thoại..."
                        label="Tìm kiếm nhanh khách hàng"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                </Box>
            </Paper>

            {/* Table Section */}
            <TableContainer
                component={Paper}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    border: '1px solid #e2e8f0',
                    overflow: 'auto',
                    bgcolor: 'white',
                    '&::-webkit-scrollbar': { width: 6, height: 6 },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: alpha('#086839', 0.15),
                        borderRadius: 10,
                    },
                    '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
                }}
            >
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ bgcolor: '#086839', color: 'white', width: 60 }} />
                            {columns.filter(c => visibleColumns.includes(c.key)).map((column) => (
                                <TableCell
                                    key={column.key}
                                    sx={{
                                        bgcolor: '#086839',
                                        color: 'white',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        letterSpacing: '0.5px',
                                        py: 2
                                    }}
                                >
                                    {column.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {customers.map((customer) => (
                            <React.Fragment key={customer.id}>
                                <TableRow
                                    hover
                                    sx={{
                                        '& > *': { borderBottom: '1px solid #f1f5f9 !important' },
                                        cursor: 'pointer',
                                        transition: '0.2s',
                                        '&:hover': { bgcolor: '#f8fafc !important' }
                                    }}
                                    onClick={() => setOpenRow(openRow === customer.id ? null : customer.id)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <IconButton size="small" onClick={() => setOpenRow(openRow === customer.id ? null : customer.id)}>
                                            {openRow === customer.id ? <KeyboardArrowUp color="primary" /> : <KeyboardArrowDown />}
                                        </IconButton>
                                    </TableCell>
                                    {visibleColumns.includes('customerCode') && (
                                        <TableCell sx={{ fontWeight: 700, color: '#086839', letterSpacing: '0.2px' }}>
                                            {customer.customerCode}
                                        </TableCell>
                                    )}
                                    {visibleColumns.includes('name') && <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{customer.name}</TableCell>}
                                    {visibleColumns.includes('dayOfBirth') && <TableCell sx={{ color: '#475569' }}>{customer.dayOfBirth ? formatDate(customer.dayOfBirth) : "—"}</TableCell>}
                                    {visibleColumns.includes('phone') && <TableCell sx={{ fontWeight: 600, color: '#334155' }}>{customer.phone}</TableCell>}
                                    {visibleColumns.includes('totalOrders') && (
                                        <TableCell sx={{ fontWeight: 700, color: '#475569', pl: 4 }}>
                                            {customer.totalOrders}
                                        </TableCell>
                                    )}
                                    {visibleColumns.includes('totalRevenue') && (
                                        <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                                            {formatMoney(customer.totalRevenue)}
                                        </TableCell>
                                    )}
                                    {visibleColumns.includes('lastOrderAt') && (
                                        <TableCell sx={{ color: '#475569', fontWeight: 500 }}>
                                            {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}
                                        </TableCell>
                                    )}
                                </TableRow>

                                {/* Row Detail Collapse */}
                                <TableRow>
                                    <TableCell sx={{ py: 0, px: { xs: 2, md: 4 }, bgcolor: '#f8fafc' }} colSpan={visibleColumns.length + 1}>
                                        <Collapse in={openRow === customer.id} timeout="auto" unmountOnExit>
                                            <Box sx={{ py: 3 }}>

                                                {/* Section: Customer Base Information */}
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ color: '#086839', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.8rem', letterSpacing: '0.5px' }}>
                                                        <Box sx={{ width: 4, height: 16, bgcolor: '#086839', borderRadius: 1 }} />
                                                        THÔNG TIN NỀN TẢNG KHÁCH HÀNG
                                                    </Typography>
                                                    <Tooltip title="Chỉnh sửa thông tin">
                                                        <IconButton
                                                            size="small"
                                                            sx={{
                                                                color: '#086839',
                                                                bgcolor: 'white',
                                                                border: '1px solid',
                                                                borderColor: '#e2e8f0',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                                                '&:hover': {
                                                                    bgcolor: alpha('#086839', 0.06),
                                                                    borderColor: alpha('#086839', 0.3),
                                                                    transform: 'translateY(-1px)',
                                                                },
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingCustomer(customer);
                                                                setEditOpen(true);
                                                            }}
                                                        >
                                                            <LucideEdit size={14} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>

                                                <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', bgcolor: 'white', mb: 3, borderColor: '#e2e8f0' }}>
                                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
                                                        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                                                            Ngày Import:{' '}
                                                            <Box component="span" sx={{ fontWeight: 700, color: '#1e293b', ml: 0.5 }}>
                                                                {customer.createdAt ? formatDate(customer.createdAt) : '—'}
                                                            </Box>
                                                        </Typography>

                                                        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                                                            Cập nhật gần nhất:{' '}
                                                            <Box component="span" sx={{ fontWeight: 700, color: '#1e293b', ml: 0.5 }}>
                                                                {customer.updatedAt
                                                                    ? formatDate(new Date(new Date(customer.updatedAt).getTime() + 7 * 60 * 60 * 1000).toISOString())
                                                                    : '—'}
                                                            </Box>
                                                        </Typography>

                                                        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                                                            Nhân viên tạo:{' '}
                                                            <Box component="span" sx={{ fontWeight: 700, color: '#086839', ml: 0.5 }}>
                                                                {customer.createdName || '—'}
                                                            </Box>
                                                        </Typography>
                                                    </Box>
                                                </Paper>

                                                {/* Section: Order History */}
                                                <Typography variant="subtitle2" sx={{ mb: 2, color: '#086839', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.8rem', letterSpacing: '0.5px' }}>
                                                    <Box sx={{ width: 4, height: 16, bgcolor: '#086839', borderRadius: 1 }} />
                                                    LỊCH SỬ GIAO DỊCH ĐƠN HÀNG
                                                </Typography>

                                                <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none', overflow: 'hidden' }}>
                                                    <Table size="small">
                                                        <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                                            <TableRow>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155', py: 1.5 }}>Mã đơn hàng</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Ngày mua</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Nguồn mua</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155' }} align="right">Doanh thu</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155' }} align="right">Phí ship</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155' }} align="right">Thuế</TableCell>
                                                            </TableRow>
                                                        </TableHead>

                                                        <TableBody sx={{ bgcolor: 'white' }}>
                                                            {customer.orders?.length ? (
                                                                customer.orders.map((item) => (
                                                                    <TableRow key={item.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                                                        <TableCell
                                                                            sx={{
                                                                                fontWeight: 700,
                                                                                color: '#086839',
                                                                                '&:hover': {
                                                                                    color: '#1b8f57',
                                                                                    textDecoration: 'underline',
                                                                                    cursor: 'pointer',
                                                                                },
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedOrderId(item.id);
                                                                                setOrderDetailOpen(true);
                                                                            }}
                                                                        >
                                                                            {item.orderCode}
                                                                        </TableCell>
                                                                        <TableCell sx={{ color: '#475569', fontWeight: 500 }}>
                                                                            {item.purchaseDate ? formatDate(item.purchaseDate) : '—'}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Chip
                                                                                label={item.source || '—'}
                                                                                size="small"
                                                                                sx={getSourceStyle(item.source)}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                                                            {formatMoney(item.revenue)}
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ color: '#64748b' }}>
                                                                            {formatMoney(item.shippingFee)}
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ color: '#ef4444' }}>
                                                                            {formatMoney(item.taxAmount)}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            ) : (
                                                                <TableRow>
                                                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#64748b', fontWeight: 500, fontStyle: 'italic' }}>
                                                                        Khách hàng này hiện chưa phát sinh giao dịch nào
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination Section */}
            <TablePagination
                component="div"
                count={total}
                page={page}
                rowsPerPage={pageSize}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setPage(0);
                }}
                labelRowsPerPage="Dòng trên trang"
                sx={{ borderTop: '1px solid #e2e8f0', bgcolor: 'white', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}
            />

            {/* Column Visibility Menu */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Hiển thị cột</Typography>
                    <Divider sx={{ mb: 1 }} />
                    {columns.map((column) => (
                        <MenuItem key={column.key} sx={{ p: 0 }}>
                            <Checkbox
                                size="small"
                                checked={visibleColumns.includes(column.key)}
                                onChange={() => {
                                    setVisibleColumns(prev =>
                                        prev.includes(column.key) ? prev.filter(k => k !== column.key) : [...prev, column.key]
                                    );
                                }}
                            />
                            <Typography variant="body2">{column.label}</Typography>
                        </MenuItem>
                    ))}
                </Box>
            </Menu>

            {/* Dialog Component Triggers */}
            <EditCustomerDialog
                open={editOpen}
                customer={editingCustomer}
                onClose={() => {
                    setEditOpen(false);
                    setEditingCustomer(null);
                }}
                onSuccess={fetchCustomers}
            />

            <OrderDetailDialog
                open={orderDetailOpen}
                orderId={selectedOrderId}
                onClose={() => {
                    setOrderDetailOpen(false);
                    setSelectedOrderId(null);
                }}
            />
        </Box>
    );
}