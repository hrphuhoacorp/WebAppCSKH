'use client';

import { useEffect, useState, useRef } from 'react';
import * as React from 'react';
import * as signalR from '@microsoft/signalr';
import { CircularProgress, InputAdornment, LinearProgress, Stack } from '@mui/material';
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Chip,
    Collapse,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    Menu,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    alpha,
} from '@mui/material';
import {
    KeyboardArrowDown,
    KeyboardArrowUp,
    ViewColumn,
    FileUpload,
    FilterList,
    Search,
    Refresh,
    ExpandMore,
    HistoryToggleOffRounded,
    Inventory2,
} from '@mui/icons-material';
import { ordersApi } from '@/features/orders/api/orders.api';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import PageHeader from '@/components/common/PageHeader';
import { ReceiptLongRounded } from '@mui/icons-material';
import OrderDetailDialog from '@/features/orders/components/OrderDetailDialog';
import { useAuth } from '@/providers/AuthProviders';
import ImportHistoryDialog from '@/features/orders/components/ImportHistoryDialog';

const branchColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e'];

const getBranchStyle = (branchName: string) => {
    if (!branchName) return {};
    const sum = branchName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const color = branchColors[sum % branchColors.length];
    return { bgcolor: alpha(color, 0.08), color, fontWeight: 700, border: `1px solid ${alpha(color, 0.2)}`, borderRadius: '6px', fontSize: '0.72rem', height: '22px' };
};

const columns = [
    { key: 'orderCode', label: 'Mã đơn' },
    { key: 'purchaseDate', label: 'Ngày mua' },
    { key: 'customerName', label: 'Khách hàng' },
    { key: 'customerPhone', label: 'SĐT' },
    { key: 'statusName', label: 'Trạng thái' },
    { key: 'branchName', label: 'Chi nhánh' },
    { key: 'source', label: 'Nguồn' },
    { key: 'revenue', label: 'Doanh thu' },
    { key: 'shippingFee', label: 'Phí vận chuyển' },
    { key: 'taxAmount', label: 'Thuế' },
    { key: 'grossProfit', label: 'Lợi nhuận' },
] as const;

const sourceOption = [
    { id: 1, name: 'Zalo', color: '#0068FF' },
    { id: 2, name: 'Facebook', color: '#042550' },
    { id: 3, name: 'GrabMart', color: '#00B14F' },
    { id: 4, name: 'ShopeeFood', color: '#EE4D2D' },
    { id: 5, name: 'ShopeeMart', color: '#be653c' },
];

const getSourceStyle = (sourceName: string) => {
    const source = sourceOption.find((s) => s.name === sourceName);
    const color = source?.color || '#64748b';
    return { bgcolor: alpha(color, 0.08), color, fontWeight: 700, border: `1px solid ${alpha(color, 0.25)}`, borderRadius: '6px', fontSize: '0.72rem', height: '22px' };
};

const getStatusColor = (statusName: string) => {
    switch (statusName?.toLowerCase()) {
        case 'hoàn thành': return '#10b981';
        case 'đang giao dịch': return '#f59e0b';
        case 'chờ xác nhận': return '#0288d1';
        case 'đã hủy': return '#ef4444';
        case 'đang xử lý': return '#84cc16';
        default: return '#64748b';
    }
};

const getStatusStyle = (statusName: string) => {
    const color = getStatusColor(statusName);
    return { bgcolor: alpha(color, 0.08), color, fontWeight: 700, border: `1px solid ${alpha(color, 0.2)}`, borderRadius: '6px', fontSize: '0.72rem', height: '22px' };
};

const filterFieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: '#086839' } },
    '& label.Mui-focused': { color: '#086839' },
};

// Cấu hình màu cho từng cột trong bảng order items
const itemColumnConfig = [
    { label: 'Sản phẩm', align: 'left' as const, color: '#fff' },
    { label: 'SKU', align: 'left' as const, color: '#fff' },
    { label: 'Phân loại', align: 'left' as const, color: '#fff' },
    { label: 'Đơn giá', align: 'right' as const, color: '#fff' },
    { label: 'Số lượng', align: 'center' as const, color: '#fff' },
    { label: 'ĐVT', align: 'left' as const, color: '#fff' },
    { label: 'Dịch vụ đi kèm', align: 'left' as const, color: '#fff' },
];

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [openRow, setOpenRow] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [statusOptions, setStatusOptions] = useState<{ id: number; name: string; color: string }[]>([]);
    const [branchOptions, setBranchOptions] = useState<{ id: number; name: string }[]>([]);

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [status, setStatus] = useState<any>(null);
    const [branch, setBranch] = useState<any>(null);
    const [source, setSource] = useState<any>(null);
    const [sortBy, setSortBy] = useState('purchaseDate');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [orderDetailOpen, setOrderDetailOpen] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const { profile, loadProfile } = useAuth();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(
        columns.filter((c) => c.key !== 'grossProfit').map((c) => c.key)
    );

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    const formatDate = (value: string) =>
        new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));

    const hasFilter = search || fromDate || toDate || status || branch || source;

    // ── SignalR ──
    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${process.env.NEXT_PUBLIC_DOTNET_API_ORIGIN}/hubs/import`, { withCredentials: true })
            .withAutomaticReconnect()
            .configureLogging({
                log(level: signalR.LogLevel, msg: string) {
                    if (msg.includes('stopped during negotiation')) return;
                    if (level >= signalR.LogLevel.Error) console.error('[SignalR]', msg);
                    else if (level >= signalR.LogLevel.Warning) console.warn('[SignalR]', msg);
                },
            })
            .build();
        connection.on('ImportProgress', (data) => setProgress({ current: data.current, total: data.total }));
        connection.start().catch((e) => {
            if (e?.message?.includes('stopped during negotiation')) return;
            console.error('SignalR error:', e);
        });
        return () => { connection.stop().catch(() => {}); };
    }, []);

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 500);
        return () => clearTimeout(t);
    }, [search]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await ordersApi.getOrders({
                page: page + 1, pageSize,
                search: debouncedSearch || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                statusId: status?.id || undefined,
                branchId: branch?.id || undefined,
                source: source?.name || undefined,
                sortBy, sortDir,
            });
            setTotal(response.content.totalItems);
            setOrders(response.content.items);
        } catch (error: any) {
            toast.error(error?.response?.data?.Message || 'Không thể tải danh sách đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, [page, pageSize, debouncedSearch, fromDate, toDate, status, branch, source, sortBy, sortDir]);

    useEffect(() => {
        const fetchStatus = async () => {
            try { const r = await ordersApi.getStatuses(); setStatusOptions(r.content); } catch { }
        };
        const fetchBranch = async () => {
            try { const r = await ordersApi.getBranches(); setBranchOptions(r.content); } catch { }
        };
        fetchStatus(); fetchBranch();
    }, []);

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setProgress({ current: 0, total: 0 });
            setImporting(true);
            const response = await ordersApi.importExcel(file);
            toast.custom((t) => (
                <div style={{ maxWidth: 350, width: '100%', background: '#fff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', borderRadius: 12, display: 'flex', pointerEvents: 'auto', borderLeft: '5px solid #10b981', padding: 16, gap: 12 }}>
                    <div style={{ background: '#ecfdf5', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.6667 5L7.50004 14.1667L3.33337 10" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 4 }}>Import Excel thành công</div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6b7280' }}>
                            <div>Thành công: <b style={{ color: '#059669' }}>{response.content.successfulImports}</b></div>
                            <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 12 }}>Tổng dòng: <b style={{ color: '#111827' }}>{response.content.totalRows}</b></div>
                        </div>
                    </div>
                    <button onClick={() => toast.dismiss(t.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', alignSelf: 'start', color: '#9ca3af' }}>✕</button>
                </div>
            ), { duration: 4000 });
            await fetchOrders();
            await loadProfile();
        } catch (error: any) {
            toast.error(error?.response?.data?.errorMessages?.join(', ') ?? error?.response?.data?.message ?? 'Có lỗi xảy ra');
        } finally {
            setImporting(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleResetFilter = () => {
        setSearch(''); setFromDate(''); setToDate('');
        setStatus(null); setBranch(null); setSource(null);
        setSortBy('purchaseDate'); setSortDir('desc');
        setPage(0); setPageSize(25); setFilterOpen(false);
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
            <LoadingOverlay open={loading} text="Đang tải đơn hàng..." />

            <PageHeader
                title="Danh Sách Đơn Hàng"
                subtitle="Theo dõi, quản lý doanh thu và trạng thái đơn hàng thời gian thực"
                icon={<ReceiptLongRounded />}
                gradient="linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
                shadowColor="rgba(124,58,237,0.28)"
                actions={<Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    {importing && progress.total > 0 && (
                        <Box sx={{ minWidth: 200, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', p: 1.5 }}>
                            <Typography sx={{ fontSize: 12, color: '#64748b', mb: 0.5 }}>
                                Đã import {progress.current} / {progress.total} dòng
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={(progress.current / progress.total) * 100}
                                sx={{ height: 6, borderRadius: 99, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#086839', borderRadius: 99 } }}
                            />
                        </Box>
                    )}

                    <input type="file" hidden ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" />
                    <Button
                        variant="outlined"
                        startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <FileUpload sx={{ fontSize: 18 }} />}
                        disabled={importing}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                            borderColor: '#086839', color: '#086839', borderWidth: '1.5px',
                            fontWeight: 700, borderRadius: '12px', px: 2.5, textTransform: 'none',
                            '&:hover': { borderWidth: '1.5px', borderColor: '#064e2b', bgcolor: alpha('#086839', 0.06) },
                        }}
                    >
                        {importing ? 'Đang xử lý...' : 'Nhập Excel'}
                    </Button>
                    <Tooltip title="Xem lịch sử các file Excel đã tải lên của bản thân" arrow>
                        <Button
                            variant="outlined"
                            startIcon={<HistoryToggleOffRounded sx={{ fontSize: 18 }} />}
                            onClick={() => setHistoryModalOpen(true)}
                            sx={{
                                borderColor: '#475569', color: '#475569', borderWidth: '1.5px',
                                fontWeight: 700, borderRadius: '12px', px: 2.5, textTransform: 'none',
                                '&:hover': { borderWidth: '1.5px', borderColor: '#1e293b', bgcolor: '#f1f5f9' },
                            }}
                        >
                            Lịch sử nhập File
                        </Button>
                    </Tooltip>
                    <Tooltip title="Xóa tất cả bộ lọc" arrow>
                        <Button
                            variant="contained"
                            startIcon={<Refresh sx={{ fontSize: 18 }} />}
                            onClick={handleResetFilter}
                            sx={{
                                bgcolor: '#086839', color: '#fff', fontWeight: 700,
                                borderRadius: '12px', px: 2.5, textTransform: 'none',
                                boxShadow: '0 4px 12px rgba(8,104,57,0.2)',
                                '&:hover': { bgcolor: '#064e2b', boxShadow: '0 6px 16px rgba(8,104,57,0.3)' },
                            }}
                        >
                            Xóa lọc
                        </Button>
                    </Tooltip>
                </Box>}
            />

            {/* ── Filter Bar ── */}
            <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: '20px', mb: 2.5, border: '1px solid #e2e8f0', bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}
            >
                <Box
                    onClick={() => setFilterOpen(!filterOpen)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <FilterList sx={{ color: '#086839', fontSize: 18 }} />
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Bộ lọc tìm kiếm</Typography>
                        {hasFilter && (
                            <Chip label="Đang lọc" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, height: 20, border: '1px solid #bbf7d0' }} />
                        )}
                    </Box>
                    <IconButton size="small" sx={{ color: '#086839', pointerEvents: 'none' }}>
                        <ExpandMore sx={{ transition: '0.2s', transform: filterOpen ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: 20 }} />
                    </IconButton>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr' }, gap: 2, mt: 2 }}>
                    <TextField
                        size="small"
                        placeholder="Mã đơn, tên khách hàng, SĐT..."
                        label="Tìm kiếm nhanh"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8', fontSize: 20 }} /></InputAdornment> } }}
                        sx={filterFieldSx}
                    />
                    <TextField size="small" type="date" label="Từ ngày" value={fromDate} onChange={(e) => setFromDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth sx={filterFieldSx} />
                    <TextField size="small" type="date" label="Đến ngày" value={toDate} onChange={(e) => setToDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth sx={filterFieldSx} />
                </Box>

                <Collapse in={filterOpen} timeout="auto" unmountOnExit>
                    <Divider sx={{ my: 2, borderStyle: 'dashed', borderColor: '#f1f5f9' }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3,1fr)' }, gap: 2, mb: 2 }}>
                        <Autocomplete
                            size="small" options={statusOptions} getOptionLabel={(o) => o.name} value={status}
                            onChange={(_, v) => setStatus(v)}
                            renderOption={(props, option) => {
                                const { key, ...rest } = props;
                                return <li key={key} {...rest} style={{ padding: '6px 16px' }}><Chip label={option.name} size="small" sx={getStatusStyle(option.name)} /></li>;
                            }}
                            renderInput={(params) => <TextField {...params} label="Trạng thái" />}
                            sx={filterFieldSx}
                        />
                        <Autocomplete
                            size="small" options={branchOptions} getOptionLabel={(o) => o.name} value={branch}
                            onChange={(_, v) => setBranch(v)}
                            renderOption={(props, option) => (
                                <li {...props} style={{ padding: '6px 16px' }}><Chip label={option.name} size="small" sx={getBranchStyle(option.name)} /></li>
                            )}
                            renderInput={(params) => <TextField {...params} label="Chi nhánh" />}
                            sx={filterFieldSx}
                        />
                        <Autocomplete
                            size="small" options={sourceOption} getOptionLabel={(o) => o.name} value={source}
                            onChange={(_, v) => setSource(v)}
                            renderOption={(props, option) => (
                                <li {...props}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5, px: 1 }}>
                                        <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: option.color, flexShrink: 0 }} />
                                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{option.name}</Typography>
                                    </Box>
                                </li>
                            )}
                            renderInput={(params) => <TextField {...params} label="Nguồn" />}
                            sx={filterFieldSx}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Stack direction="row" spacing={1.5}>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Sắp xếp theo</InputLabel>
                                <Select value={sortBy} label="Sắp xếp theo" onChange={(e) => setSortBy(e.target.value)} sx={{ borderRadius: '12px' }}>
                                    <MenuItem value="purchaseDate">Ngày mua</MenuItem>
                                    <MenuItem value="revenue">Doanh thu</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Thứ tự</InputLabel>
                                <Select value={sortDir} label="Thứ tự" onChange={(e) => setSortDir(e.target.value as any)} sx={{ borderRadius: '12px' }}>
                                    <MenuItem value="desc">Giảm dần</MenuItem>
                                    <MenuItem value="asc">Tăng dần</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>

                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ViewColumn fontSize="small" />}
                            onClick={(e) => setAnchorEl(e.currentTarget)}
                            sx={{ borderColor: '#e2e8f0', color: '#475569', borderRadius: '10px', fontWeight: 600, textTransform: 'none', '&:hover': { borderColor: '#086839', color: '#086839', bgcolor: '#f0fdf4' } }}
                        >
                            Tùy chỉnh cột
                        </Button>
                    </Box>
                </Collapse>
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
                            <TableCell sx={{ bgcolor: '#086839', width: 52, borderBottom: '2px solid rgba(255,255,255,0.15)' }} />
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
                        {orders.map((order, index) => (
                            <React.Fragment key={order.id}>
                                {/* Main row */}
                                <TableRow
                                    onClick={() => setOpenRow(openRow === order.id ? null : order.id)}
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
                                            onClick={() => setOpenRow(openRow === order.id ? null : order.id)}
                                            sx={{
                                                width: 28, height: 28, borderRadius: '8px',
                                                bgcolor: openRow === order.id ? alpha('#086839', 0.1) : 'transparent',
                                                color: openRow === order.id ? '#086839' : '#94a3b8',
                                                '&:hover': { bgcolor: alpha('#086839', 0.08), color: '#086839' },
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {openRow === order.id
                                                ? <KeyboardArrowUp sx={{ fontSize: 18 }} />
                                                : <KeyboardArrowDown sx={{ fontSize: 18 }} />}
                                        </IconButton>
                                    </TableCell>

                                    {visibleColumns.includes('orderCode') && (
                                        <TableCell
                                            onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order.id); setOrderDetailOpen(true); }}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#086839', fontFamily: 'monospace', bgcolor: '#f0fdf4', px: 1, py: 0.4, borderRadius: '6px', display: 'inline-block', border: '1px solid #bbf7d0', '&:hover': { textDecoration: 'underline' } }}>
                                                {order.orderCode}
                                            </Typography>
                                        </TableCell>
                                    )}
                                    {visibleColumns.includes('purchaseDate') && <TableCell sx={{ color: '#64748b', fontSize: 13, whiteSpace: 'nowrap' }}>{formatDate(order.purchaseDate)}</TableCell>}
                                    {visibleColumns.includes('customerName') && (
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: alpha('#086839', 0.1), color: '#086839', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                                                    {order.customerName?.charAt(0)}
                                                </Box>
                                                <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap' }}>{order.customerName}</Typography>
                                            </Box>
                                        </TableCell>
                                    )}
                                    {visibleColumns.includes('customerPhone') && <TableCell sx={{ color: '#475569', fontSize: 13, whiteSpace: 'nowrap' }}>{order.customerPhone}</TableCell>}
                                    {visibleColumns.includes('statusName') && <TableCell><Chip label={order.statusName} size="small" sx={getStatusStyle(order.statusName)} /></TableCell>}
                                    {visibleColumns.includes('branchName') && <TableCell><Chip label={order.branchName} size="small" sx={getBranchStyle(order.branchName)} /></TableCell>}
                                    {visibleColumns.includes('source') && <TableCell><Chip label={order.source} size="small" sx={getSourceStyle(order.source)} /></TableCell>}
                                    {visibleColumns.includes('revenue') && <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: 13, whiteSpace: 'nowrap' }}>{formatMoney(order.revenue)}</TableCell>}
                                    {visibleColumns.includes('shippingFee') && <TableCell sx={{ color: '#64748b', fontSize: 13, whiteSpace: 'nowrap' }}>{formatMoney(order.shippingFee)}</TableCell>}
                                    {visibleColumns.includes('taxAmount') && <TableCell sx={{ color: '#ef4444', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{formatMoney(order.taxAmount)}</TableCell>}
                                    {visibleColumns.includes('grossProfit') && <TableCell sx={{ color: '#10b981', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{formatMoney(order.grossProfit)}</TableCell>}
                                </TableRow>

                                {/* ── Expanded detail row ── */}
                                <TableRow>
                                    <TableCell
                                        sx={{
                                            py: 0,
                                            // Nền khác biệt hẳn với row thường để phân vùng rõ ràng
                                            bgcolor: '#f8fafc',
                                            borderBottom: openRow === order.id
                                                ? '2px solid #334155 !important'
                                                : '0 !important',
                                            // Đường kẻ trái màu slate để phân biệt với xanh lá của nội dung
                                            borderLeft: openRow === order.id ? '3px solid #475569' : 'none',
                                        }}
                                        colSpan={visibleColumns.length + 1}
                                    >
                                        <Collapse in={openRow === order.id} timeout="auto" unmountOnExit>
                                            <Box sx={{ py: 3, px: { xs: 1, md: 3 } }}>

                                                {/* Section title — dùng slate đậm, KHÔNG dùng xanh lá */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                                                    <Box
                                                        sx={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: '8px',
                                                            bgcolor: '#334155',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <Inventory2 sx={{ fontSize: 15, color: '#fff' }} />
                                                    </Box>
                                                    <Typography sx={{
                                                        color: '#1e293b',
                                                        fontWeight: 800,
                                                        fontSize: 12,
                                                        letterSpacing: '0.6px',
                                                        textTransform: 'uppercase',
                                                    }}>
                                                        Chi tiết sản phẩm & dịch vụ
                                                    </Typography>
                                                    {order.items?.length > 0 && (
                                                        // Chip dùng màu slate thay vì xanh lá để không trùng với chip ở các cột
                                                        <Chip
                                                            label={`${order.items.length} sản phẩm`}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: '#334155',
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
                                                        '&::-webkit-scrollbar': { height: 5 },
                                                        '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 },
                                                    }}
                                                >
                                                    <Table size="small" stickyHeader>
                                                        <TableHead>
                                                            <TableRow>
                                                                {itemColumnConfig.map(({ label, align }) => (
                                                                    <TableCell
                                                                        key={label}
                                                                        align={align}
                                                                        sx={{
                                                                            fontWeight: 700,
                                                                            // Header tối màu slate để tương phản rõ với nền #f8fafc của expanded row
                                                                            color: '#fff',
                                                                            fontSize: 11,
                                                                            textTransform: 'uppercase',
                                                                            letterSpacing: '0.4px',
                                                                            bgcolor: '#334155',
                                                                            py: 1.5,
                                                                            borderBottom: '2px solid #1e293b',
                                                                            whiteSpace: 'nowrap',
                                                                        }}
                                                                    >
                                                                        {label}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {order.items?.map((item: any, itemIdx: number) => (
                                                                <TableRow
                                                                    key={item.id}
                                                                    sx={{
                                                                        // Xen kẽ trắng / xám nhạt trong bảng con
                                                                        bgcolor: itemIdx % 2 === 0 ? '#fff' : '#f8fafc',
                                                                        '&:last-child td': { border: 0 },
                                                                        '&:hover': { bgcolor: '#f0fdf4' },
                                                                        transition: 'background 0.12s',
                                                                    }}
                                                                >
                                                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{item.productName}</TableCell>
                                                                    <TableCell>
                                                                        <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#ef4444', bgcolor: '#fef2f2', px: 1, py: 0.3, borderRadius: '5px', display: 'inline-block', border: '1px solid #fecaca' }}>
                                                                            {item.sku}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell sx={{ color: '#64748b', fontSize: 13 }}>{item.category}</TableCell>
                                                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap' }}>{formatMoney(item.unitPrice)}</TableCell>
                                                                    <TableCell align="center">
                                                                        <Chip label={item.quantity} size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 12, height: 22, border: '1px solid #e2e8f0' }} />
                                                                    </TableCell>
                                                                    <TableCell sx={{ color: '#64748b', fontSize: 13 }}>{item.unit}</TableCell>
                                                                    <TableCell sx={{ color: '#086839', fontWeight: 600, fontSize: 13 }}>{item.serviceName || '—'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))}

                        {/* Empty state */}
                        {!orders.length && !loading && (
                            <TableRow>
                                <TableCell colSpan={visibleColumns.length + 1} align="center" sx={{ py: 8 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                                            🧾
                                        </Box>
                                        <Typography sx={{ fontWeight: 700, color: '#64748b', fontSize: 15 }}>Không tìm thấy đơn hàng nào</Typography>
                                        <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm</Typography>
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
                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#086839', mb: 1 }}>Hiển thị cột</Typography>
                    <Divider sx={{ mb: 1 }} />
                    {columns.map((column) => (
                        <MenuItem
                            key={column.key}
                            sx={{ px: 0.5, borderRadius: '8px', '&:hover': { bgcolor: '#f0fdf4' } }}
                            onClick={() => setVisibleColumns((prev) => prev.includes(column.key) ? prev.filter((k) => k !== column.key) : [...prev, column.key])}
                        >
                            <Checkbox size="small" checked={visibleColumns.includes(column.key)} sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#086839' }, p: 0.5 }} />
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155', ml: 0.5 }}>{column.label}</Typography>
                        </MenuItem>
                    ))}
                </Box>
            </Menu>

            {/* ── Dialogs ── */}
            <OrderDetailDialog
                open={orderDetailOpen}
                orderId={selectedOrderId}
                onClose={() => { setOrderDetailOpen(false); setSelectedOrderId(null); }}
            />
            <ImportHistoryDialog
                open={historyModalOpen}
                onClose={() => setHistoryModalOpen(false)}
                historyData={(profile?.importHistories || []).map(item => ({
                    id: item.id,
                    fileName: item.fileName,
                    importBy: item.importBy ?? null,
                    status: item.status ?? null,
                    successCount: item.successCount,
                    errorCount: item.errorCount,
                    importDate: item.importDate,
                    rollbackAt: item.rollbackAt ?? null,
                    rollbackBy: item.rollbackBy ?? null,
                }))}
            />
        </Box>
    );
}