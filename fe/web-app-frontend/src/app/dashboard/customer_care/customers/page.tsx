'use client';

import { useEffect, useState } from 'react';
import { usePermission } from '@/hooks/usePermission';
import * as React from 'react';
import { InputAdornment } from '@mui/material';
import {
    Box,
    Checkbox,
    Chip,
    Collapse,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Paper,
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
    alpha,
} from '@mui/material';
import {
    KeyboardArrowDown,
    KeyboardArrowUp,
    Search,
    ViewColumn,
    PersonSearch,
    CalendarToday,
    Update,
    Badge,
    ShoppingBag,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import PageHeader from '@/components/common/PageHeader';
import { PeopleAltRounded } from '@mui/icons-material';
import { customerApi } from '@/features/customer/api/customer.api';
import { LucideEdit } from 'lucide-react';
import OrderDetailDialog from '@/features/orders/components/OrderDetailDialog';
import EditCustomerDialog from '@/features/customer/components/EditCustomerDialog';

const sourceColors = [
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#f43f5e',
];

const getSourceStyle = (sourceName: string) => {
    if (!sourceName) return {};
    const charCodeSum = sourceName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color = sourceColors[charCodeSum % sourceColors.length];
    return {
        bgcolor: alpha(color, 0.08),
        color,
        fontWeight: 700,
        border: `1px solid ${alpha(color, 0.2)}`,
        borderRadius: '6px',
        fontSize: '0.72rem',
        height: '22px',
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
] as const;

// Meta info cards với màu riêng biệt để dễ phân biệt
const metaCardConfig = [
    {
        key: 'createdAt',
        label: 'Ngày Import',
        icon: CalendarToday,
        accentColor: '#3b82f6',  // xanh dương
        bgColor: '#eff6ff',
        borderColor: '#bfdbfe',
    },
    {
        key: 'updatedAt',
        label: 'Cập nhật gần nhất',
        icon: Update,
        accentColor: '#f59e0b',  // vàng cam
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
    },
    {
        key: 'createdName',
        label: 'Nhân viên tạo',
        icon: Badge,
        accentColor: '#8b5cf6',  // tím
        bgColor: '#f5f3ff',
        borderColor: '#ddd6fe',
    },
];

export default function CustomerPage() {
    const canEdit = usePermission('cskh.customer.edit');

    const [customers, setCustomers] = useState<CustomerSchema[]>([]);
    const [total, setTotal] = useState(100);
    const [openRow, setOpenRow] = useState<number | null>(null);

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(
        columns.map((c) => c.key)
    );

    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [orderDetailOpen, setOrderDetailOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<CustomerSchema | null>(null);
    const [expandedDetail, setExpandedDetail] = useState<Record<number, CustomerSchema>>({});

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

    const formatDate = (value?: string | null) => {
        if (!value) return '—';
        return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
    };

    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 500);
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

    useEffect(() => { fetchCustomers(); }, [page, pageSize, debouncedSearch]);

    const handleExpandRow = async (customerId: number) => {
        const next = openRow === customerId ? null : customerId;
        setOpenRow(next);
        if (next && !expandedDetail[next]) {
            try {
                const res = await customerApi.getCustomerById(next);
                setExpandedDetail(prev => ({ ...prev, [next]: res.content }));
            } catch { /* silently fail, preference section just won't show */ }
        }
    };

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                bgcolor: '#f0f7f3',
                backgroundImage: `radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)`,
            }}
        >
            <LoadingOverlay open={loading} text="Đang tải dữ liệu khách hàng..." />

            <PageHeader
                title="Danh Sách Khách Hàng"
                subtitle="Theo dõi, phân tích và quản lý thông tin khách hàng toàn diện"
                icon={<PeopleAltRounded />}
                gradient="linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)"
                shadowColor="rgba(3,105,161,0.28)"
                actions={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', px: 2, py: 1, boxShadow: '0 1px 6px rgba(8,104,57,0.06)' }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }} />
                        <Typography sx={{ fontWeight: 700, color: '#086839', fontSize: 14 }}>
                            {total.toLocaleString('vi-VN')} khách hàng
                        </Typography>
                    </Box>
                }
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
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                }}
            >
                <TextField
                    size="small"
                    placeholder="Tìm theo mã khách hàng, tên, số điện thoại..."
                    label="Tìm kiếm nhanh"
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
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            '&.Mui-focused fieldset': { borderColor: '#086839' },
                        },
                        '& label.Mui-focused': { color: '#086839' },
                    }}
                />

                {/* Column toggle button */}
                <Tooltip title="Tùy chỉnh cột hiển thị" arrow>
                    <IconButton
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                        sx={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            width: 40,
                            height: 40,
                            color: '#475569',
                            '&:hover': { bgcolor: '#f0fdf4', color: '#086839', borderColor: '#bbf7d0' },
                            transition: 'all 0.15s',
                        }}
                    >
                        <ViewColumn fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Paper>

            {/* ── Table ── */}
            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    borderRadius: '20px 20px 0 0',
                    border: '1px solid #e2e8f0',
                    borderBottom: 'none',
                    overflow: 'auto',
                    bgcolor: '#fff',
                    boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                    '&::-webkit-scrollbar': { width: 6, height: 6 },
                    '&::-webkit-scrollbar-track': { bgcolor: '#f8fafc' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3, '&:hover': { bgcolor: '#94a3b8' } },
                }}
            >
                <Table stickyHeader size="medium">
                    <TableHead>
                        <TableRow>
                            <TableCell
                                sx={{
                                    bgcolor: '#086839',
                                    width: 52,
                                    borderBottom: '2px solid rgba(255,255,255,0.15)',
                                }}
                            />
                            {columns.filter((c) => visibleColumns.includes(c.key)).map((column) => (
                                <TableCell
                                    key={column.key}
                                    sx={{
                                        bgcolor: '#086839',
                                        color: 'rgba(255,255,255,0.95)',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        fontSize: 11,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.6px',
                                        py: 2,
                                        borderBottom: '2px solid rgba(255,255,255,0.15)',
                                    }}
                                >
                                    {column.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {customers.map((customer, index) => (
                            <React.Fragment key={customer.id}>
                                {/* Main Row */}
                                <TableRow
                                    onClick={() => handleExpandRow(customer.id)}
                                    sx={{
                                        cursor: 'pointer',
                                        bgcolor: index % 2 === 0 ? '#fff' : '#fafcfb',
                                        '& > *': { borderBottom: '1px solid #f1f5f9 !important' },
                                        '&:hover': { bgcolor: '#f0fdf4 !important' },
                                        transition: 'background-color 0.15s',
                                    }}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()} sx={{ py: 1 }}>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleExpandRow(customer.id)}
                                            sx={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: '8px',
                                                bgcolor: openRow === customer.id ? alpha('#086839', 0.1) : 'transparent',
                                                color: openRow === customer.id ? '#086839' : '#94a3b8',
                                                '&:hover': { bgcolor: alpha('#086839', 0.08), color: '#086839' },
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {openRow === customer.id
                                                ? <KeyboardArrowUp sx={{ fontSize: 18 }} />
                                                : <KeyboardArrowDown sx={{ fontSize: 18 }} />
                                            }
                                        </IconButton>
                                    </TableCell>

                                    {visibleColumns.includes('customerCode') && (
                                        <TableCell>
                                            <Typography
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: 12,
                                                    color: '#086839',
                                                    fontFamily: 'monospace',
                                                    bgcolor: '#f0fdf4',
                                                    px: 1,
                                                    py: 0.4,
                                                    borderRadius: '6px',
                                                    display: 'inline-block',
                                                    border: '1px solid #bbf7d0',
                                                }}
                                            >
                                                {customer.customerCode}
                                            </Typography>
                                        </TableCell>
                                    )}

                                    {visibleColumns.includes('name') && (
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box
                                                    sx={{
                                                        width: 30,
                                                        height: 30,
                                                        borderRadius: '9px',
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
                                                    {customer.name?.charAt(0)}
                                                </Box>
                                                <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                                    {customer.name}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    )}

                                    {visibleColumns.includes('dayOfBirth') && (
                                        <TableCell sx={{ color: '#64748b', fontSize: 13 }}>
                                            {customer.dayOfBirth ? formatDate(customer.dayOfBirth) : '—'}
                                        </TableCell>
                                    )}

                                    {visibleColumns.includes('phone') && (
                                        <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: 13, whiteSpace: 'nowrap' }}>
                                            {customer.phone}
                                        </TableCell>
                                    )}

                                    {visibleColumns.includes('totalOrders') && (
                                        <TableCell>
                                            <Chip
                                                label={customer.totalOrders}
                                                size="small"
                                                sx={{
                                                    bgcolor: '#f0fdf4',
                                                    color: '#15803d',
                                                    fontWeight: 700,
                                                    fontSize: 12,
                                                    border: '1px solid #bbf7d0',
                                                    height: 22,
                                                    minWidth: 36,
                                                }}
                                            />
                                        </TableCell>
                                    )}

                                    {visibleColumns.includes('totalRevenue') && (
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: 13, whiteSpace: 'nowrap' }}>
                                            {formatMoney(customer.totalRevenue)}
                                        </TableCell>
                                    )}

                                    {visibleColumns.includes('lastOrderAt') && (
                                        <TableCell sx={{ color: '#64748b', fontSize: 13, whiteSpace: 'nowrap' }}>
                                            {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}
                                        </TableCell>
                                    )}
                                </TableRow>

                                {/* ── Expanded Detail Row ── */}
                                <TableRow>
                                    <TableCell
                                        sx={{
                                            py: 0,
                                            // Nền của expanded row dùng màu khác hẳn để tách biệt rõ ràng
                                            bgcolor: '#f8fafc',
                                            borderBottom: openRow === customer.id
                                                ? '2px solid #086839 !important'
                                                : '0 !important',
                                            borderLeft: openRow === customer.id ? '3px solid #086839' : 'none',
                                        }}
                                        colSpan={visibleColumns.length + 1}
                                    >
                                        <Collapse in={openRow === customer.id} timeout="auto" unmountOnExit>
                                            <Box sx={{ py: 3, px: { xs: 1, md: 3 } }}>

                                                {/* ── Section 1: Thông tin nền tảng ── */}
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                    {/* Section title - dùng màu slate thay vì xanh để không trùng với content */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Box
                                                            sx={{
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: '8px',
                                                                bgcolor: '#1e293b',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        >
                                                            <Typography sx={{ color: '#fff', fontSize: 13 }}>📋</Typography>
                                                        </Box>
                                                        <Typography sx={{
                                                            color: '#1e293b',
                                                            fontWeight: 800,
                                                            fontSize: 12,
                                                            letterSpacing: '0.6px',
                                                            textTransform: 'uppercase',
                                                        }}>
                                                            Thông tin nền tảng khách hàng
                                                        </Typography>
                                                    </Box>
                                                    {canEdit && (
                                                        <Tooltip title="Chỉnh sửa thông tin" arrow>
                                                            <IconButton
                                                                size="small"
                                                                sx={{
                                                                    color: '#fff',
                                                                    bgcolor: '#086839',
                                                                    borderRadius: '8px',
                                                                    width: 30,
                                                                    height: 30,
                                                                    '&:hover': {
                                                                        bgcolor: '#065f2e',
                                                                        transform: 'translateY(-1px)',
                                                                        boxShadow: '0 4px 12px rgba(8,104,57,0.3)',
                                                                    },
                                                                    transition: 'all 0.2s',
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingCustomer(customer);
                                                                    setEditOpen(true);
                                                                }}
                                                            >
                                                                <LucideEdit size={13} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>

                                                {/* Meta info — 3 cards màu khác nhau, dễ phân biệt */}
                                                <Box
                                                    sx={{
                                                        display: 'grid',
                                                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                                                        gap: 2,
                                                        mb: 3,
                                                    }}
                                                >
                                                    {metaCardConfig.map(({ key, label, icon: Icon, accentColor, bgColor, borderColor }) => {
                                                        let value = '—';
                                                        if (key === 'createdAt' && customer.createdAt) {
                                                            value = formatDate(customer.createdAt);
                                                        } else if (key === 'updatedAt' && customer.updatedAt) {
                                                            value = formatDate(customer.updatedAt);
                                                        } else if (key === 'createdName') {
                                                            value = customer.createdName || '—';
                                                        }

                                                        return (
                                                            <Paper
                                                                key={key}
                                                                variant="outlined"
                                                                sx={{
                                                                    p: 2,
                                                                    borderRadius: '14px',
                                                                    bgcolor: bgColor,
                                                                    borderColor,
                                                                    borderWidth: '1.5px',
                                                                    display: 'flex',
                                                                    alignItems: 'flex-start',
                                                                    gap: 1.5,
                                                                    boxShadow: `0 1px 6px ${alpha(accentColor, 0.08)}`,
                                                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                                                    '&:hover': {
                                                                        transform: 'translateY(-1px)',
                                                                        boxShadow: `0 4px 16px ${alpha(accentColor, 0.15)}`,
                                                                    },
                                                                }}
                                                            >
                                                                {/* Icon badge */}
                                                                <Box
                                                                    sx={{
                                                                        width: 36,
                                                                        height: 36,
                                                                        borderRadius: '10px',
                                                                        bgcolor: alpha(accentColor, 0.12),
                                                                        border: `1.5px solid ${alpha(accentColor, 0.25)}`,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        flexShrink: 0,
                                                                    }}
                                                                >
                                                                    <Icon sx={{ fontSize: 17, color: accentColor }} />
                                                                </Box>
                                                                <Box sx={{ minWidth: 0 }}>
                                                                    <Typography
                                                                        sx={{
                                                                            fontSize: 10,
                                                                            color: alpha(accentColor, 0.8),
                                                                            fontWeight: 700,
                                                                            textTransform: 'uppercase',
                                                                            letterSpacing: '0.5px',
                                                                            mb: 0.4,
                                                                        }}
                                                                    >
                                                                        {label}
                                                                    </Typography>
                                                                    <Typography
                                                                        sx={{
                                                                            fontSize: 14,
                                                                            fontWeight: 800,
                                                                            color: '#1e293b',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                        }}
                                                                    >
                                                                        {value}
                                                                    </Typography>
                                                                </Box>
                                                            </Paper>
                                                        );
                                                    })}
                                                </Box>

                                                {/* ── Section 2: Lịch sử giao dịch ── */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                                    <Box
                                                        sx={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: '8px',
                                                            bgcolor: '#086839',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <ShoppingBag sx={{ fontSize: 15, color: '#fff' }} />
                                                    </Box>
                                                    <Typography sx={{
                                                        color: '#1e293b',
                                                        fontWeight: 800,
                                                        fontSize: 12,
                                                        letterSpacing: '0.6px',
                                                        textTransform: 'uppercase',
                                                    }}>
                                                        Lịch sử giao dịch đơn hàng
                                                    </Typography>
                                                    {customer.orders?.length > 0 && (
                                                        <Chip
                                                            label={`${customer.orders.length} đơn`}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: '#086839',
                                                                color: '#fff',
                                                                fontWeight: 700,
                                                                fontSize: 11,
                                                                height: 20,
                                                            }}
                                                        />
                                                    )}
                                                </Box>

                                                <TableContainer
                                                    component={Paper}
                                                    elevation={0}
                                                    sx={{
                                                        borderRadius: '14px',
                                                        border: '1.5px solid #e2e8f0',
                                                        overflow: 'hidden',
                                                        maxHeight: 300,
                                                        overflowY: 'auto',
                                                        '&::-webkit-scrollbar': { width: 5 },
                                                        '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 },
                                                    }}
                                                >
                                                    <Table size="small" stickyHeader>
                                                        <TableHead>
                                                            <TableRow>
                                                                {[
                                                                    { label: 'Mã đơn hàng', align: 'left' as const },
                                                                    { label: 'Ngày mua', align: 'left' as const },
                                                                    { label: 'Nguồn mua', align: 'left' as const },
                                                                    { label: 'Doanh thu', align: 'right' as const },
                                                                    { label: 'Phí ship', align: 'right' as const },
                                                                    { label: 'Thuế', align: 'right' as const },
                                                                ].map(({ label, align }) => (
                                                                    <TableCell
                                                                        key={label}
                                                                        align={align}
                                                                        sx={{
                                                                            fontWeight: 700,
                                                                            // Header bảng con dùng màu slate đậm để phân biệt với nền xanh của expanded row
                                                                            color: '#fff',
                                                                            fontSize: 11,
                                                                            textTransform: 'uppercase',
                                                                            letterSpacing: '0.4px',
                                                                            bgcolor: '#334155',
                                                                            py: 1.5,
                                                                            borderBottom: '2px solid #1e293b',
                                                                        }}
                                                                    >
                                                                        {label}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {customer.orders?.length ? (
                                                                customer.orders.map((item, orderIdx) => (
                                                                    <TableRow
                                                                        key={item.id}
                                                                        sx={{
                                                                            // Xen kẽ màu rõ hơn trong bảng đơn hàng
                                                                            bgcolor: orderIdx % 2 === 0 ? '#fff' : '#f8fafc',
                                                                            '&:last-child td': { border: 0 },
                                                                            '&:hover': { bgcolor: '#f0fdf4' },
                                                                            transition: 'background 0.12s',
                                                                        }}
                                                                    >
                                                                        <TableCell
                                                                            sx={{
                                                                                fontWeight: 700,
                                                                                color: '#086839',
                                                                                fontSize: 13,
                                                                                cursor: 'pointer',
                                                                                '&:hover': { textDecoration: 'underline' },
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedOrderId(item.id);
                                                                                setOrderDetailOpen(true);
                                                                            }}
                                                                        >
                                                                            {item.orderCode}
                                                                        </TableCell>
                                                                        <TableCell sx={{ color: '#64748b', fontSize: 13 }}>
                                                                            {item.purchaseDate ? formatDate(item.purchaseDate) : '—'}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Chip label={item.source || '—'} size="small" sx={getSourceStyle(item.source)} />
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', fontSize: 13, whiteSpace: 'nowrap' }}>
                                                                            {formatMoney(item.revenue)}
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ color: '#64748b', fontSize: 13, whiteSpace: 'nowrap' }}>
                                                                            {formatMoney(item.shippingFee)}
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ color: '#ef4444', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                            {formatMoney(item.taxAmount)}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            ) : (
                                                                <TableRow>
                                                                    <TableCell colSpan={6} align="center" sx={{ py: 5, bgcolor: '#fff' }}>
                                                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                                                            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                <PersonSearch sx={{ fontSize: 22, color: '#94a3b8' }} />
                                                                            </Box>
                                                                            <Typography sx={{ fontWeight: 600, color: '#94a3b8', fontSize: 13 }}>
                                                                                Khách hàng chưa phát sinh giao dịch nào
                                                                            </Typography>
                                                                        </Box>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>

                                                {/* ── Section 3: Phân tích sở thích ── */}
                                                {(() => {
                                                    const detail = expandedDetail[customer.id];
                                                    if (!detail) return null;
                                                    const catMap: Record<string, number> = {};
                                                    detail.orders?.forEach(ord => {
                                                        (ord as any).items?.forEach((oi: any) => {
                                                            const cat = oi.category;
                                                            if (cat) catMap[cat] = (catMap[cat] || 0) + 1;
                                                        });
                                                    });
                                                    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
                                                    if (!sorted.length) return null;
                                                    const palette = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#f43f5e'];
                                                    return (
                                                        <Box sx={{ mt: 3 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                                                <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Typography sx={{ color: '#fff', fontSize: 13 }}>🎯</Typography>
                                                                </Box>
                                                                <Typography sx={{ color: '#1e293b', fontWeight: 800, fontSize: 12, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                                                    Phân tích sở thích & nhu cầu
                                                                </Typography>
                                                            </Box>
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                                {sorted.map(([cat, count], i) => {
                                                                    const color = palette[i % palette.length];
                                                                    return (
                                                                        <Chip
                                                                            key={cat}
                                                                            label={`${cat}  ×${count}`}
                                                                            sx={{
                                                                                bgcolor: alpha(color, 0.1),
                                                                                color,
                                                                                fontWeight: 700,
                                                                                border: `1px solid ${alpha(color, 0.25)}`,
                                                                                fontSize: 12,
                                                                                height: 26,
                                                                            }}
                                                                        />
                                                                    );
                                                                })}
                                                            </Box>
                                                        </Box>
                                                    );
                                                })()}
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))}

                        {/* Empty state */}
                        {!customers.length && !loading && (
                            <TableRow>
                                <TableCell colSpan={visibleColumns.length + 1} align="center" sx={{ py: 8 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <PersonSearch sx={{ fontSize: 28, color: '#94a3b8' }} />
                                        </Box>
                                        <Typography sx={{ fontWeight: 700, color: '#64748b', fontSize: 15 }}>
                                            Không tìm thấy khách hàng nào
                                        </Typography>
                                        <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>
                                            Thử thay đổi từ khoá tìm kiếm
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ── Pagination ── */}
            <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 20px 20px', overflow: 'hidden' }}>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={pageSize}
                    onPageChange={(_, p) => setPage(p)}
                    onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                    labelRowsPerPage="Số dòng:"
                    sx={{
                        '& .MuiTablePagination-toolbar': { minHeight: 48 },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 13, color: '#64748b' },
                    }}
                />
            </Box>

            {/* ── Column Visibility Menu ── */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                            minWidth: 200,
                        },
                    },
                }}
            >
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#086839', mb: 1 }}>
                        Hiển thị cột
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    {columns.map((column) => (
                        <MenuItem
                            key={column.key}
                            sx={{ px: 0.5, borderRadius: '8px', '&:hover': { bgcolor: '#f0fdf4' } }}
                            onClick={() => {
                                setVisibleColumns((prev) =>
                                    prev.includes(column.key) ? prev.filter((k) => k !== column.key) : [...prev, column.key]
                                );
                            }}
                        >
                            <Checkbox
                                size="small"
                                checked={visibleColumns.includes(column.key)}
                                sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#086839' }, p: 0.5 }}
                            />
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155', ml: 0.5 }}>
                                {column.label}
                            </Typography>
                        </MenuItem>
                    ))}
                </Box>
            </Menu>

            {/* ── Dialogs ── */}
            <EditCustomerDialog
                open={editOpen}
                customer={editingCustomer}
                onClose={() => { setEditOpen(false); setEditingCustomer(null); }}
                onSuccess={fetchCustomers}
            />
            <OrderDetailDialog
                open={orderDetailOpen}
                orderId={selectedOrderId}
                onClose={() => { setOrderDetailOpen(false); setSelectedOrderId(null); }}
            />
        </Box>
    );
}