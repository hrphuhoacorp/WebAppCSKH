'use client';

import { useEffect, useState, useRef } from 'react';
import * as React from 'react';
import * as signalR from '@microsoft/signalr';
import { CircularProgress, colors, InputAdornment, LinearProgress } from '@mui/material';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Collapse,
    FormControl,
    IconButton,
    InputLabel,
    Menu,
    MenuItem,
    Paper,
    Select,
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
    Autocomplete,
    Tooltip,
    Divider,
    alpha,
} from '@mui/material';
import {
    KeyboardArrowDown,
    KeyboardArrowUp,
    ViewColumn,
    FileUpload,
    FilterAlt,
    Search,
    ExpandMore,
    Refresh,
} from '@mui/icons-material';
import { ordersApi } from '@/features/orders/api/orders.api';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import OrderDetailDialog from '@/features/orders/components/OrderDetailDialog';

const branchColors = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#f43f5e', // Rose
];

const getBranchStyle = (branchName: string) => {
    if (!branchName) return {};

    const charCodeSum = branchName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color = branchColors[charCodeSum % branchColors.length];

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
    { id: 1, name: "Zalo", color: "#0068FF" },
    { id: 2, name: "Facebook", color: "#042550" },
    { id: 3, name: "GrabMart", color: "#00B14F" },
    { id: 4, name: "ShopeeFood", color: "#EE4D2D" },
    { id: 5, name: "ShopeeMart", color: "#be653c" }
];

const getSourceStyle = (sourceName: string) => {
    const source = sourceOption.find(s => s.name === sourceName);
    const color = source?.color || '#64748b';
    return {
        bgcolor: alpha(color, 0.08),
        color: color,
        fontWeight: 700,
        border: `1px solid ${alpha(color, 0.25)}`,
        borderRadius: '6px',
        fontSize: '0.75rem',
    };
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]); // Đổi tạm thành any[] nếu thiếu file schema gốc của bạn
    const [total, setTotal] = useState(100);
    const [openRow, setOpenRow] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [statusOptions, setStatusOptions] = useState<{ id: number; name: string; color: string }[]>([]);
    const [branchOptions, setBranchOptions] = useState<{ id: number; name: string }[]>([]);

    // Filters state
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

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(
        columns.filter(c => c.key !== 'grossProfit').map((c) => c.key)
    );

    const formatMoney = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    const formatDate = (value: string) =>
        new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(new Date(value));

    const [importing, setImporting] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [orderDetailOpen, setOrderDetailOpen] = useState(false);
    const [progress, setProgress] = useState({
        current: 0,
        total: 0,
    });

    const getStatusColor = (statusName: string) => {
        switch (statusName?.toLowerCase()) {
            case 'hoàn thành': return '#10b981'; // Emerald sáng sủa hơn
            case 'đang giao dịch': return '#f59e0b'; // Amber sáng
            case 'chờ xác nhận': return '#0288d1';
            case 'đã hủy': return '#ef4444'; // Red hiện đại
            case 'đang xử lý': return '#84cc16';
            default: return '#64748b';
        }
    };

    // realtime
    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(
                `${process.env.NEXT_PUBLIC_DOTNET_API_ORIGIN}/hubs/import`,
                {
                    withCredentials: true,
                }
            )
            .withAutomaticReconnect()
            .build();

        connection.on('ImportProgress', (data) => {
            console.log('ImportProgress:', data);

            setProgress({
                current: data.current,
                total: data.total,
            });
        });

        connection
            .start()
            .catch((error) => {
                console.error('SignalR connection error:', error);
            });

        return () => {
            connection.stop();
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(0);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await ordersApi.getOrders({
                page: page + 1,
                pageSize,
                search: debouncedSearch || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                statusId: status?.id || undefined,
                branchId: branch?.id || undefined,
                source: source?.name || undefined,
                sortBy: sortBy,
                sortDir: sortDir,
            });

            setTotal(response.content.totalItems);
            setOrders(response.content.items);
        } catch (error: any) {
            toast.error(error?.response?.data?.Message || 'Không thể tải danh sách đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [
        page,
        pageSize,
        debouncedSearch,
        fromDate,
        toDate,
        status,
        branch,
        sortBy,
        source,
        sortDir,
    ]);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await ordersApi.getStatuses();
                setStatusOptions(response.content);
            } catch (error: any) {
                toast.error(error?.response?.data?.Message);
            }
        }
        const fetchBranch = async () => {
            try {
                const response = await ordersApi.getBranches();
                setBranchOptions(response.content);
            } catch (error: any) {
                toast.error(error?.response?.data?.Message);
            }
        }
        fetchStatus();
        fetchBranch();
    }, []);

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setProgress({
                current: 0,
                total: 0,
            });
            setImporting(true);
            const response = await ordersApi.importExcel(file);

            toast.custom((t) => (
                <div
                    className={`${t.visible ? 'animate-enter' : 'animate-leave'}`}
                    style={{
                        maxWidth: '350px',
                        width: '100%',
                        background: '#fff',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        borderRadius: '12px',
                        display: 'flex',
                        pointerEvents: 'auto',
                        borderLeft: '5px solid #10b981',
                        padding: '16px',
                        gap: '12px'
                    }}
                >
                    <div style={{
                        background: '#ecfdf5',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16.6667 5L7.50004 14.1667L3.33337 10" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#111827', marginBottom: '4px' }}>
                            Import Excel thành công
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                            <div>
                                Thành công: <b style={{ color: '#059669' }}>{response.content.successfulImports}</b>
                            </div>
                            <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '12px' }}>
                                Tổng dòng: <b style={{ color: '#111827' }}>{response.content.totalRows}</b>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => toast.dismiss(t.id)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', alignSelf: 'start', color: '#9ca3af' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            ), { duration: 4000 });

            await fetchOrders();

        } catch (error: any) {
            toast.error(
                error?.response?.data?.errorMessages?.join(', ') ??
                error?.response?.data?.message ??
                'Có lỗi xảy ra'
            );
        } finally {
            setImporting(false);
            if (e.target) {
                e.target.value = '';
            }
        }
    };

    const getStatusStyle = (statusName: string) => {
        const color = getStatusColor(statusName);
        return {
            bgcolor: alpha(color, 0.08),
            color: color,
            fontWeight: 700,
            border: `1px solid ${alpha(color, 0.2)}`,
            borderRadius: '6px',
            fontSize: '0.75rem',
        };
    };

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                bgcolor: '#f8fafc', // Tạo độ tương phản tốt với các card trắng
            }}
        >
            <LoadingOverlay open={loading} text="Đang tải đơn hàng..." />

            {/* Header Section */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 2,
                    mb: 4,
                }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#086839', letterSpacing: '-0.75px', mb: 0.5 }}>
                        Danh Sách Đơn Hàng
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                        Theo dõi, quản lý doanh thu và trạng thái đơn hàng thời gian thực
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <input type="file" hidden ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" />
                    <Button
                        variant="outlined"
                        startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <FileUpload />}
                        disabled={importing}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                            borderColor: '#086839',
                            color: '#086839',
                            borderWidth: '1.5px',
                            fontWeight: 700,
                            borderRadius: '10px',
                            px: 2.5,
                            '&:hover': {
                                borderWidth: '1.5px',
                                borderColor: '#064e2b',
                                bgcolor: alpha('#086839', 0.06),
                            },
                        }}
                    >
                        {importing ? 'Đang xử lý...' : 'Nhập Excel'}
                    {importing && progress.total > 0 && (
                        <Box sx={{ minWidth: 220 }}>
                            <LinearProgress
                                variant="determinate"
                                value={(progress.current / progress.total) * 100}
                                sx={{
                                    height: 8,
                                    borderRadius: 99,
                                    bgcolor: '#e2e8f0',
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: '#086839',
                                    },
                                }}
                            />

                            <Typography sx={{ fontSize: 12, mt: 0.5, color: '#64748b' }}>
                                Đã import {progress.current} / {progress.total} dòng
                            </Typography>
                        </Box>
                    )}
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Refresh />}
                        sx={{
                            bgcolor: '#086839',
                            color: 'white',
                            fontWeight: 700,
                            borderRadius: '10px',
                            px: 2.5,
                            boxShadow: '0 4px 12px rgba(8, 104, 57, 0.2)',
                            '&:hover': {
                                bgcolor: '#064e2b',
                                boxShadow: '0 6px 16px rgba(8, 104, 57, 0.3)',
                            },
                        }}
                        onClick={() => {
                            setSearch('');
                            setFromDate('');
                            setToDate('');
                            setStatus(null);
                            setBranch(null);
                            setSource(null);
                            setSortBy('purchaseDate');
                            setSortDir('desc');
                            setPage(0);
                            setPageSize(25);
                            setFilterOpen(false);
                        }}
                    >
                        Xóa lọc
                    </Button>
                </Stack>
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
                <Box
                    onClick={() => setFilterOpen(!filterOpen)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ p: 1, bgcolor: alpha('#086839', 0.08), borderRadius: '8px', display: 'flex' }}>
                            <FilterAlt sx={{ color: '#086839', fontSize: 20 }} />
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            Bộ lọc tìm kiếm
                        </Typography>
                    </Box>

                    <IconButton size="small" sx={{ color: '#086839', bgcolor: alpha('#086839', 0.04) }}>
                        <ExpandMore
                            sx={{
                                transition: '0.2s',
                                transform: filterOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                        />
                    </IconButton>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr 1.2fr' }, gap: 2, mt: 2.5 }}>
                    <TextField
                        size="small"
                        placeholder="Mã đơn, tên, SĐT..."
                        label="Tìm kiếm nhanh"
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

                    <Autocomplete
                        size="small"
                        options={statusOptions}
                        getOptionLabel={(option) => option.name}
                        value={status}
                        onChange={(_, newValue) => setStatus(newValue)}
                        renderOption={(props, option) => {
                            const { key, ...otherProps } = props;
                            const color = getStatusColor(option.name);
                            return (
                                <li key={key} {...otherProps} style={{ padding: '6px 16px' }}>
                                    <Chip
                                        label={option.name}
                                        size="small"
                                        sx={getStatusStyle(option.name)}
                                    />
                                </li>
                            );
                        }}
                        renderInput={(params) => <TextField {...params} label="Trạng thái" />}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />

                    <Autocomplete
                        size="small"
                        options={branchOptions}
                        getOptionLabel={(option) => option.name}
                        value={branch}
                        onChange={(_, newValue) => setBranch(newValue)}
                        renderOption={(props, option) => (
                            <li {...props} style={{ padding: '6px 16px' }}>
                                <Chip
                                    label={option.name}
                                    size="small"
                                    sx={getBranchStyle(option.name)}
                                />
                            </li>
                        )}
                        renderInput={(params) => <TextField {...params} label="Chi nhánh" />}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />

                    <Autocomplete
                        size="small"
                        options={sourceOption}
                        getOptionLabel={(option) => option.name}
                        value={source}
                        onChange={(_, newValue) => setSource(newValue)}
                        renderOption={(props, option) => (
                            <li {...props}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: option.color }} />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.name}</Typography>
                                </Box>
                            </li>
                        )}
                        renderInput={(params) => <TextField {...params} label="Nguồn" />}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />

                    <Stack direction="row" spacing={1}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Từ ngày"
                            slotProps={{ inputLabel: { shrink: true } }}
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Đến ngày"
                            slotProps={{ inputLabel: { shrink: true } }}
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                    </Stack>
                </Box>

                <Collapse in={filterOpen} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 1 }}>
                        <Divider sx={{ my: 2, borderStyle: 'dashed', borderColor: '#e2e8f0' }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Stack direction="row" spacing={1.5}>
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <InputLabel>Sắp xếp theo</InputLabel>
                                    <Select value={sortBy} label="Sắp xếp theo" onChange={(e) => setSortBy(e.target.value)} sx={{ borderRadius: '10px' }}>
                                        <MenuItem value="purchaseDate">Ngày mua</MenuItem>
                                        <MenuItem value="revenue">Doanh thu</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>Thứ tự</InputLabel>
                                    <Select value={sortDir} label="Thứ tự" onChange={(e) => setSortDir(e.target.value as any)} sx={{ borderRadius: '10px' }}>
                                        <MenuItem value="desc">Giảm dần</MenuItem>
                                        <MenuItem value="asc">Tăng dần</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>

                            <Button
                                variant="text"
                                startIcon={<ViewColumn />}
                                onClick={(e) => setAnchorEl(e.currentTarget)}
                                sx={{ color: '#086839', fontWeight: 700, borderRadius: '8px' }}
                            >
                                Tùy chỉnh cột
                            </Button>
                        </Box>
                    </Box>
                </Collapse>
            </Paper>

            {/* Table Section */}
            <TableContainer
                component={Paper}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    border: '1px solid #e2e8f0',
                    overflow: 'auto',
                    bgcolor: 'white',
                    '&::-webkit-scrollbar': { width: 6, height: 6 },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: alpha('#086839', 0.2),
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
                        {orders.map((order) => (
                            <React.Fragment key={order.id}>
                                <TableRow
                                    hover
                                    sx={{
                                        '& > *': { borderBottom: '1px solid #f1f5f9 !important' },
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                        '&:hover': { bgcolor: '#f8fafc !important' }
                                    }}
                                    onClick={() => setOpenRow(openRow === order.id ? null : order.id)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <IconButton size="small" onClick={() => setOpenRow(openRow === order.id ? null : order.id)}>
                                            {openRow === order.id ? <KeyboardArrowUp color="primary" /> : <KeyboardArrowDown />}
                                        </IconButton>
                                    </TableCell>
                                    {visibleColumns.includes('orderCode') && (
                                        <TableCell
                                            sx={{
                                                fontWeight: 700,
                                                color: '#086839',
                                                '&:hover': {
                                                    color: '#1b8f57',
                                                    textDecoration: 'underline',
                                                },
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedOrderId(order.id);
                                                setOrderDetailOpen(true);
                                            }}
                                        >
                                            {order.orderCode}
                                        </TableCell>
                                    )}
                                    {visibleColumns.includes('purchaseDate') && <TableCell sx={{ color: '#475569', fontWeight: 500 }}>{formatDate(order.purchaseDate)}</TableCell>}
                                    {visibleColumns.includes('customerName') && <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{order.customerName}</TableCell>}
                                    {visibleColumns.includes('customerPhone') && <TableCell sx={{ color: '#475569' }}>{order.customerPhone}</TableCell>}
                                    {visibleColumns.includes('statusName') && (
                                        <TableCell>
                                            <Chip label={order.statusName} size="small" sx={getStatusStyle(order.statusName)} />
                                        </TableCell>
                                    )}
                                    {visibleColumns.includes('branchName') && (
                                        <TableCell>
                                            <Chip label={order.branchName} size="small" sx={getBranchStyle(order.branchName)} />
                                        </TableCell>
                                    )}
                                    {visibleColumns.includes('source') && (
                                        <TableCell>
                                            <Chip label={order.source} size="small" sx={getSourceStyle(order.source)} />
                                        </TableCell>
                                    )}
                                    {visibleColumns.includes('revenue') && <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>{formatMoney(order.revenue)}</TableCell>}
                                    {visibleColumns.includes('shippingFee') && <TableCell sx={{ color: '#64748b', fontWeight: 500 }}>{formatMoney(order.shippingFee)}</TableCell>}
                                    {visibleColumns.includes('taxAmount') && <TableCell sx={{ color: '#ef4444', fontWeight: 500 }}>{formatMoney(order.taxAmount)}</TableCell>}
                                    {visibleColumns.includes('grossProfit') && <TableCell sx={{ color: '#10b981', fontWeight: 700 }}>{formatMoney(order.grossProfit)}</TableCell>}
                                </TableRow>

                                {/* Row Detail Collapse */}
                                <TableRow>
                                    <TableCell sx={{ py: 0, px: 4, bgcolor: '#f8fafc' }} colSpan={visibleColumns.length + 1}>
                                        <Collapse in={openRow === order.id} timeout="auto" unmountOnExit>
                                            <Box sx={{ py: 2.5 }}>
                                                <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#086839', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.8rem', letterSpacing: '0.5px' }}>
                                                    <Box sx={{ width: 4, height: 16, bgcolor: '#086839', borderRadius: 1 }} />
                                                    CHI TIẾT SẢN PHẨM & DỊCH VỤ
                                                </Typography>
                                                <TableContainer component={Paper} sx={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: 'none', overflow: 'hidden' }}>
                                                    <Table size="small">
                                                        <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                                            <TableRow>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Sản phẩm</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>SKU</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Phân loại</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155' }} >Đơn giá</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Số lượng</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155' }} >ĐVT</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Dịch vụ đi kèm</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody sx={{ bgcolor: 'white' }}>
                                                            {order.items?.map((item: any) => (
                                                                <TableRow key={item.id} sx={{ '&:last-child td': { border: 0 } }}>
                                                                    <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{item.productName}</TableCell>
                                                                    <TableCell><code style={{ color: '#ef4444', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600 }}>{item.sku}</code></TableCell>
                                                                    <TableCell sx={{ color: '#475569' }}>{item.category}</TableCell>
                                                                    <TableCell sx={{ fontWeight: 600 }}>{formatMoney(item.unitPrice)}</TableCell>
                                                                    <TableCell sx={{ color: '#475569' }}>{item.quantity}</TableCell>
                                                                    <TableCell sx={{ color: '#475569' }}>{item.unit}</TableCell>
                                                                    <TableCell sx={{ color: '#086839', fontWeight: 500 }}>{item.serviceName || '—'}</TableCell>
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
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
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
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                slotProps={{ paper: { sx: { borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', p: 1 } } }}
            >
                <Box sx={{ px: 1, py: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>Hiển thị cột</Typography>
                    <Divider sx={{ mb: 1 }} />
                    {columns.map((column) => (
                        <MenuItem
                            key={column.key}
                            sx={{ p: 0, borderRadius: '6px', mb: 0.5 }}
                            onClick={() => {
                                setVisibleColumns(prev =>
                                    prev.includes(column.key) ? prev.filter(k => k !== column.key) : [...prev, column.key]
                                );
                            }}
                        >
                            <Checkbox
                                size="small"
                                checked={visibleColumns.includes(column.key)}
                                sx={{ color: '#086839', '&.Mui-checked': { color: '#086839' } }}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => {
                                    setVisibleColumns(prev =>
                                        prev.includes(column.key) ? prev.filter(k => k !== column.key) : [...prev, column.key]
                                    );
                                }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155', pr: 2 }}>{column.label}</Typography>
                        </MenuItem>
                    ))}
                </Box>
            </Menu>

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