'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { CircularProgress, InputAdornment, LinearProgress, Stack } from '@mui/material';
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Chip,
    Collapse,
    Dialog,
    DialogContent,
    DialogTitle,
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
    CheckCircleRounded,
    ErrorRounded,
    Close,
    WarningAmberRounded,
    InfoOutlined,
    TableChartRounded,
} from '@mui/icons-material';
import { ordersApi } from '@/features/orders/api/orders.api';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import PageHeader from '@/components/common/PageHeader';
import { ReceiptLongRounded } from '@mui/icons-material';
import OrderDetailDialog from '@/features/orders/components/OrderDetailDialog';
import { useAuth } from '@/providers/AuthProviders';
import ImportHistoryDialog from '@/features/orders/components/ImportHistoryDialog';
import { usePermission } from '@/hooks/usePermission';

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
    { id: 5, name: 'ShopeeMart', color: '#ff0000' },
    { id: 6, name: 'Livestream', color: '#6d02d1' },
    { id: 7, name: 'Pos', color: '#bcd102' },
    { id: 8, name: 'Khách đặt tại quầy', color: '#f97316' },
    { id: 9, name: 'Khác', color: '#464545' },
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
        case 'hoàn trả': return '#ef4444';
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

export default function OrdersStaffPage() {
    const canImport = usePermission('cskh.order.import');

    const [openRow, setOpenRow] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [filterOpen, setFilterOpen] = useState(false);
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

    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [orderDetailOpen, setOrderDetailOpen] = useState(false);

    const [historyModalOpen, setHistoryModalOpen] = useState(false);

    const [importResult, setImportResult] = useState<{ totalRows: number; successfulImports: number; skippedImports: number; failedImports: number; errorMessages: string[]; skippedMessages: string[] } | null>(null);
    const [importGuideOpen, setImportGuideOpen] = useState(false);

    const [importing, setImporting] = useState(false);
    // ── Auth ──
    const { profile, loadProfile } = useAuth();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(
        columns.filter((c) => c.key !== 'grossProfit').map((c) => c.key)
    );

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    const formatDate = (value: string) =>
        new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));

    const hasFilter = search || fromDate || toDate || status || branch || source;


    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 500);
        return () => clearTimeout(t);
    }, [search]);

    const queryClient = useQueryClient();

    const { data: ordersData, isFetching: loading } = useQuery({
        queryKey: ['orders-sales', page, pageSize, debouncedSearch, fromDate, toDate, status?.id, branch?.id, source?.name, sortBy, sortDir],
        queryFn: async () => {
            try {
                const response = await ordersApi.getOrdersSale({
                    page: page + 1,
                    pageSize,
                    search: debouncedSearch || undefined,
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                    statusId: status?.id || undefined,
                    branchId: branch?.id || undefined,
                    source: source?.name || undefined,
                    sortBy,
                    sortDir,
                });
                return response.content;
            } catch (error: any) {
                toast.error(error?.response?.data?.Message ?? 'Không tải được danh sách đơn hàng');
                return { items: [], totalItems: 0 };
            }
        },
        placeholderData: (prev) => prev,
    });
    const orders = ordersData?.items ?? [];
    const total = ordersData?.totalItems ?? 0;

    const { data: statusOptions = [] } = useQuery({
        queryKey: ['order-statuses'],
        queryFn: async () => {
            const r = await ordersApi.getStatuses();
            return r.content as { id: number; name: string; color: string }[];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: branchOptions = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const r = await ordersApi.getBranches();
            return r.content as { id: number; name: string }[];
        },
        staleTime: 5 * 60 * 1000,
    });

    const refreshOrders = () => queryClient.invalidateQueries({ queryKey: ['orders-sales'] });

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setProgress({ current: 0, total: 0 });
            setImporting(true);
            const response = await ordersApi.importExcel(file);
            setImportResult({
                totalRows: response.content.totalRows,
                successfulImports: response.content.successfulImports,
                skippedImports: response.content.skippedImports ?? 0,
                failedImports: response.content.failedImports,
                errorMessages: response.content.errorMessages ?? [],
                skippedMessages: response.content.skippedMessages ?? [],
            });
            // Refresh ngầm sau khi import
            refreshOrders();
            loadProfile(true);
        } catch (error: any) {
            toast.error(error?.response?.data?.Message ?? 'Có lỗi xảy ra khi import');
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
            <LoadingOverlay open={loading} text="Đang tải đơn hàng..." fullScreen />

            {/* Dialog hướng dẫn cột Excel */}
            <Dialog
                open={importGuideOpen}
                onClose={() => setImportGuideOpen(false)}
                maxWidth="md"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha('#086839', 0.1), color: '#086839', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TableChartRounded sx={{ fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Cấu trúc file Excel nhập đơn hàng</Typography>
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>Đảm bảo file của bạn có đúng thứ tự cột bên dưới</Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={() => setImportGuideOpen(false)} sx={{ color: '#94a3b8', '&:hover': { color: '#475569', bgcolor: '#f1f5f9' } }}>
                        <Close sx={{ fontSize: 18 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 0 }}>
                    <Box sx={{ bgcolor: alpha('#f59e0b', 0.08), border: `1px solid ${alpha('#f59e0b', 0.3)}`, borderRadius: '10px', p: 1.5, mb: 2, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <InfoOutlined sx={{ color: '#f59e0b', fontSize: 18, mt: 0.1, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 12.5, color: '#92400e' }}>
                            Các cột đánh dấu <b style={{ color: '#dc2626' }}>(*)</b> là bắt buộc. Dòng đầu tiên trong file sẽ được bỏ qua (tiêu đề).
                            Hệ thống sẽ bỏ qua các dòng trùng hoàn toàn (mã đơn + ngày + doanh thu + số lượng).
                        </Typography>
                    </Box>
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', maxHeight: 360, overflow: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 2 } }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    {['Cột', 'Tên cột', 'Bắt buộc', 'Ghi chú'].map(h => (
                                        <TableCell key={h} sx={{ bgcolor: '#f8fafc', fontWeight: 700, fontSize: 12, color: '#475569', py: 1.2 }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {[
                                    { col: 'A (1)', name: 'Ngày mua', required: false, note: 'Định dạng dd/MM/yyyy' },
                                    { col: 'B (2)', name: 'Tên khách hàng', required: false, note: '' },
                                    { col: 'C (3)', name: 'Số điện thoại', required: false, note: '' },
                                    { col: 'D (4)', name: 'Mã khách hàng', required: false, note: '' },
                                    { col: 'E (5)', name: 'Phân loại sản phẩm', required: false, note: '' },
                                    { col: 'F (6)', name: 'Tên sản phẩm', required: false, note: '' },
                                    { col: 'G (7)', name: 'SKU', required: false, note: '' },
                                    { col: 'H (8)', name: 'Đơn giá', required: false, note: 'Số thực' },
                                    { col: 'I (9)', name: 'Dịch vụ đi kèm', required: false, note: '' },
                                    { col: 'J (10)', name: 'Đơn vị tính', required: false, note: '' },
                                    { col: 'K (11)', name: 'Mã đơn hàng', required: true, note: 'Dùng để nhận diện đơn hàng' },
                                    { col: 'L (12)', name: 'Trạng thái', required: true, note: 'Phải trùng tên trạng thái trong hệ thống' },
                                    { col: 'M (13)', name: 'Chi nhánh', required: true, note: 'Phải trùng tên chi nhánh trong hệ thống' },
                                    { col: 'N (14)', name: 'Nguồn', required: false, note: '' },
                                    { col: 'O (15)', name: 'Số lượng', required: false, note: 'Có thể âm (hoàn trả)' },
                                    { col: 'U (21)', name: 'Thuế', required: false, note: 'Số thực' },
                                    { col: 'V (22)', name: 'Phí vận chuyển', required: false, note: 'Số thực' },
                                    { col: 'W (23)', name: 'Doanh thu', required: false, note: 'Số thực, có thể âm' },
                                    { col: 'X (24)', name: 'Lợi nhuận gộp', required: false, note: 'Số thực' },
                                ].map(({ col, name, required, note }) => (
                                    <TableRow key={col} sx={{ '&:nth-of-type(odd)': { bgcolor: '#fafafa' }, '&:hover': { bgcolor: '#f0fdf4' } }}>
                                        <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#086839', whiteSpace: 'nowrap' }}>{col}</TableCell>
                                        <TableCell sx={{ fontWeight: required ? 700 : 400, fontSize: 13, color: '#1e293b' }}>
                                            {name}{required && <Box component="span" sx={{ color: '#dc2626', ml: 0.5 }}>*</Box>}
                                        </TableCell>
                                        <TableCell>
                                            {required
                                                ? <Chip label="Bắt buộc" size="small" sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: 11, borderRadius: '6px' }} />
                                                : <Chip label="Tùy chọn" size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 600, fontSize: 11, borderRadius: '6px' }} />}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 12, color: '#64748b', fontStyle: note ? 'normal' : 'italic' }}>{note || '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2.5 }}>
                        <Button onClick={() => setImportGuideOpen(false)} variant="outlined" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, borderColor: '#cbd5e1', color: '#64748b', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' } }}>
                            Đóng
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<FileUpload />}
                            onClick={() => { setImportGuideOpen(false); fileInputRef.current?.click(); }}
                            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, bgcolor: '#086839', '&:hover': { bgcolor: '#064e2b' } }}
                        >
                            Chọn file Excel
                        </Button>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Dialog kết quả import */}
            <Dialog
                open={!!importResult}
                onClose={() => setImportResult(null)}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {importResult && importResult.successfulImports === 0 ? (
                            <ErrorRounded sx={{ color: '#ef4444', fontSize: 28 }} />
                        ) : importResult && importResult.failedImports > 0 ? (
                            <WarningAmberRounded sx={{ color: '#f59e0b', fontSize: 28 }} />
                        ) : (
                            <CheckCircleRounded sx={{ color: '#10b981', fontSize: 28 }} />
                        )}
                        <Typography sx={{ fontWeight: 800, fontSize: 17, color: '#1e293b' }}>
                            Kết quả Import Excel
                        </Typography>
                    </Box>
                    <IconButton onClick={() => setImportResult(null)} size="small" sx={{ color: '#94a3b8' }}>
                        <Close fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 0 }}>
                    {importResult && (
                        <>
                            {/* Thống kê */}
                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                <Box sx={{ flex: 1, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: '12px', p: 1.5, border: '1px solid #e2e8f0' }}>
                                    <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng dòng</Typography>
                                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{importResult.totalRows}</Typography>
                                </Box>
                                <Box sx={{ flex: 1, textAlign: 'center', bgcolor: '#f0fdf4', borderRadius: '12px', p: 1.5, border: '1px solid #bbf7d0' }}>
                                    <Typography sx={{ fontSize: 11, color: '#16a34a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thành công</Typography>
                                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>{importResult.successfulImports}</Typography>
                                </Box>
                                <Box sx={{ flex: 1, textAlign: 'center', bgcolor: importResult.skippedImports > 0 ? '#fffbeb' : '#f8fafc', borderRadius: '12px', p: 1.5, border: `1px solid ${importResult.skippedImports > 0 ? '#fde68a' : '#e2e8f0'}` }}>
                                    <Typography sx={{ fontSize: 11, color: importResult.skippedImports > 0 ? '#d97706' : '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trùng/Bỏ qua</Typography>
                                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: importResult.skippedImports > 0 ? '#d97706' : '#94a3b8' }}>{importResult.skippedImports}</Typography>
                                </Box>
                                <Box sx={{ flex: 1, textAlign: 'center', bgcolor: importResult.failedImports > 0 ? '#fef2f2' : '#f8fafc', borderRadius: '12px', p: 1.5, border: `1px solid ${importResult.failedImports > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                                    <Typography sx={{ fontSize: 11, color: importResult.failedImports > 0 ? '#dc2626' : '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lỗi</Typography>
                                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: importResult.failedImports > 0 ? '#dc2626' : '#94a3b8' }}>{importResult.failedImports}</Typography>
                                </Box>
                            </Box>

                            {/* Danh sách lỗi */}
                            {importResult.errorMessages.length > 0 && (
                                <Box>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#475569', mb: 1 }}>
                                        Chi tiết lỗi ({importResult.errorMessages.length} dòng):
                                    </Typography>
                                    <Box sx={{
                                        maxHeight: 280,
                                        overflowY: 'auto',
                                        borderRadius: '10px',
                                        border: '1px solid #fecaca',
                                        bgcolor: '#fff',
                                        '&::-webkit-scrollbar': { width: 4 },
                                        '&::-webkit-scrollbar-thumb': { bgcolor: '#fca5a5', borderRadius: 2 },
                                    }}>
                                        {importResult.errorMessages.map((msg, i) => (
                                            <Box key={i} sx={{
                                                display: 'flex', alignItems: 'flex-start', gap: 1.5, px: 2, py: 1,
                                                borderBottom: i < importResult.errorMessages.length - 1 ? '1px solid #fff1f2' : 'none',
                                                '&:hover': { bgcolor: '#fff5f5' },
                                            }}>
                                                <ErrorRounded sx={{ fontSize: 14, color: '#f87171', mt: '2px', flexShrink: 0 }} />
                                                <Typography sx={{ fontSize: 12.5, color: '#7f1d1d' }}>{msg}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {/* Danh sách dòng bỏ qua */}
                            {importResult.skippedMessages.length > 0 && (
                                <Box sx={{ mt: importResult.errorMessages.length > 0 ? 2 : 0 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#92400e', mb: 1 }}>
                                        Dòng bị bỏ qua ({importResult.skippedMessages.length} dòng trùng):
                                    </Typography>
                                    <Box sx={{
                                        maxHeight: 200,
                                        overflowY: 'auto',
                                        borderRadius: '10px',
                                        border: '1px solid #fde68a',
                                        bgcolor: '#fff',
                                        '&::-webkit-scrollbar': { width: 4 },
                                        '&::-webkit-scrollbar-thumb': { bgcolor: '#fcd34d', borderRadius: 2 },
                                    }}>
                                        {importResult.skippedMessages.map((msg, i) => (
                                            <Box key={i} sx={{
                                                display: 'flex', alignItems: 'flex-start', gap: 1.5, px: 2, py: 0.8,
                                                borderBottom: i < importResult.skippedMessages.length - 1 ? '1px solid #fef3c7' : 'none',
                                                '&:hover': { bgcolor: '#fffbeb' },
                                            }}>
                                                <WarningAmberRounded sx={{ fontSize: 14, color: '#f59e0b', mt: '2px', flexShrink: 0 }} />
                                                <Typography sx={{ fontSize: 12, color: '#78350f' }}>{msg}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {importResult.failedImports === 0 && importResult.skippedImports === 0 && (
                                <Typography sx={{ fontSize: 13, color: '#16a34a', fontWeight: 600, textAlign: 'center', mt: 1 }}>
                                    Tất cả dòng đã được import thành công!
                                </Typography>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>


            <PageHeader
                title="Danh Sách Đơn Hàng"
                subtitle="Theo dõi, quản lý doanh thu và trạng thái đơn hàng thời gian thực"
                icon={<ReceiptLongRounded />}
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

                    {canImport && (
                        <>
                            <input type="file" hidden ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" />
                            <Button
                                variant="outlined"
                                startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <FileUpload sx={{ fontSize: 18 }} />}
                                disabled={importing}
                                onClick={() => !importing && setImportGuideOpen(true)}
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
                        </>
                    )}
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
                        {orders.map((order: any, index: number) => (
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
                historyData={profile?.importHistories ?? []}
                onRefresh={loadProfile}
            />
        </Box>
    );
}