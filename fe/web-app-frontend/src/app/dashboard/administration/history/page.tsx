'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Paper,
    Tab,
    Tabs,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Chip,
    TablePagination,
    Button,
    alpha,
    TextField,
    InputAdornment,
    MenuItem,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    IconButton,
} from '@mui/material';
import {
    HistoryRounded,
    CloudUploadRounded,
    SettingsBackupRestoreRounded,
    Search,
    FilterList,
    CalendarMonth,
    InfoOutlined,
    Close,
    FileDownloadRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import PageHeader from '@/components/common/PageHeader';
import { userApi } from '@/features/user/api/user.api';
import ConfirmRollbackDialog from '@/features/staff/components/ConfirmRollbackDialog';
import { usePermission } from '@/hooks/usePermission';

type LogRow = {
    id: number;
    userId: number;
    staffCode: string;
    name: string;
    action: string;
    tableName: string;
    recordId: number | null;
    oldData: string | null;
    newData: string | null;
    ipAddress: string;
    userAgent: string;
    createdAt: string;
};

type ImportRow = {
    id: number;
    fileName: string;
    importBy: string;
    status: 'Imported' | 'Rollbacked';
    successCount: number;
    errorCount: number;
    importDate: string;
    rollbackAt: string | null;
    rollbackBy: string | null;
    fileUrl?: string | null;
};

export default function SystemHistoryPage() {
    const [currentTab, setCurrentTab] = useState(0);

    // Phân trang
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);

    // Bộ lọc chung
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [status, setStatus] = useState(''); // Chỉ dùng cho Tab Import Excel

    // States phục vụ xem chi tiết thao tác
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLog, setDetailLog] = useState<LogRow | null>(null);

    // States phục vụ cho Hộp thoại xác nhận rời (ConfirmRollbackDialog)
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<ImportRow | null>(null);
    const [actionType, setActionType] = useState<'rollback' | 'restore' | null>(null);

    const formatDateTime = (value?: string | null) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(new Date(value));
    };

    // Cơ chế Debounce ô tìm kiếm 500ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(0); // Reset về trang 1 khi gõ tìm kiếm
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const queryClient = useQueryClient();

    const { data: historyData, isFetching: loading } = useQuery({
        queryKey: ['history', currentTab, page, pageSize, debouncedSearch, fromDate, toDate, status],
        queryFn: async () => {
            try {
                if (currentTab === 0) {
                    const r = await userApi.getActivityLogs({
                        page: page + 1,
                        pageSize,
                        search: debouncedSearch || undefined,
                        fromDate: fromDate || undefined,
                        toDate: toDate || undefined,
                    });
                    return { logs: r.content.items, imports: [], total: r.content.totalItems };
                } else {
                    const r = await userApi.getImportHistory({
                        page: page + 1,
                        pageSize,
                        search: debouncedSearch || undefined,
                        fromDate: fromDate || undefined,
                        toDate: toDate || undefined,
                        status: status || undefined,
                    });
                    return { logs: [], imports: r.content.items, total: r.content.totalItems };
                }
            } catch (error: any) {
                toast.error(error?.response?.data?.Message ?? 'Không tải được lịch sử');
                return { logs: [], imports: [], total: 0 };
            }
        },
        placeholderData: (prev) => prev,
    });
    const logs = historyData?.logs ?? [];
    const imports = historyData?.imports ?? [];
    const total = historyData?.total ?? 0;
    const refreshHistory = () => queryClient.invalidateQueries({ queryKey: ['history'] });

    // Reset bộ lọc và phân trang khi đổi Tab qua lại
    const handleTabChange = (_: any, newValue: number) => {
        setCurrentTab(newValue);
        setPage(0);
        setSearch('');
        setDebouncedSearch('');
        setFromDate('');
        setToDate('');
        setStatus('');
    };

    // Xử lý đóng mở nhanh Dialog xác nhận
    const openConfirmDialog = (file: ImportRow, type: 'rollback' | 'restore') => {
        setSelectedFile(file);
        setActionType(type);
        setConfirmOpen(true);
    };

    const closeConfirmDialog = () => {
        setConfirmOpen(false);
        setSelectedFile(null);
        setActionType(null);
    };

    // Luồng thực thi chính thức từ nút Chạy của Dialog xác nhận đưa ra
    const handleConfirmAction = async () => {
        if (!selectedFile || !actionType) return;

        const toastId = toast.loading(actionType === 'rollback' ? 'Đang hoàn tác tệp Excel...' : 'Đang khôi phục tệp Excel...');
        setConfirmOpen(false); // Đóng nhanh dialog tránh đúp lệnh bấm

        try {
            if (actionType === 'rollback') {
                await userApi.rollbackImportExcel(selectedFile.id);
                toast.success('Hoàn tác tệp Excel thành công, số liệu tài chính đã được hoàn tác', { id: toastId });
            } else {
                await userApi.restoreImportExcel(selectedFile.id);
                toast.success('Khôi phục tệp Excel thành công, đơn hàng đã hoạt động trở lại', { id: toastId });
            }
            refreshHistory();
        } catch (error: any) {
            toast.error(error?.response?.data?.Message ?? 'Thao tác tệp dữ liệu gặp lỗi', { id: toastId });
        } finally {
            closeConfirmDialog();
        }
    };

    const canRollback = usePermission('cskh.order.rollback');
    const canRestore = usePermission('cskh.order.restore');
    const canDownload = usePermission('staff.import_history.download');

    const hasActiveFilter = !!debouncedSearch || !!fromDate || !!toDate || !!status;

    const handleClearFilters = () => {
        setSearch('');
        setDebouncedSearch('');
        setFromDate('');
        setToDate('');
        setStatus('');
        setPage(0);
        toast.success('Đã xóa bộ lọc dữ liệu');
    };

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
            <LoadingOverlay open={loading} text="Đang xử lý dữ liệu..." fullScreen />

            <PageHeader
                title="Nhật Ký & Lịch Sử Hệ Thống"
                subtitle="Tra cứu vết hoạt động của nhân viên và quản lý trạng thái hoàn tác tệp Excel"
                icon={<HistoryRounded />}
                gradient="linear-gradient(135deg, #b45309 0%, #f59e0b 100%)"
                shadowColor="rgba(180,83,9,0.28)"
            />

            {/* ── Tabs Chuyển Bảng ── */}
            <Tabs
                value={currentTab}
                onChange={handleTabChange}
                sx={{
                    mb: 2,
                    '& .MuiTabs-indicator': { bgcolor: '#086839', height: 3 },
                    '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: 14, color: '#64748b', '&.Mui-selected': { color: '#086839' } }
                }}
            >
                <Tab icon={<HistoryRounded fontSize="small" />} iconPosition="start" label="Nhật ký thao tác (Audit Logs)" />
                <Tab icon={<CloudUploadRounded fontSize="small" />} iconPosition="start" label="Lịch sử Import Excel" />
            </Tabs>

            {/* ── Filter Bar Nâng Cấp ── */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', mb: 2.5, border: '1px solid #e2e8f0', bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FilterList sx={{ color: '#086839', fontSize: 18 }} />
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Bộ lọc tìm kiếm</Typography>
                        {hasActiveFilter && <Chip label="Đang kích hoạt lọc" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, height: 20, border: '1px solid #bbf7d0' }} />}
                    </Box>

                    {/* Nút Xóa bộ lọc tự động căn chỉnh */}
                    {hasActiveFilter && (
                        <Button
                            size="small"
                            onClick={handleClearFilters}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                color: '#dc2626',
                                fontSize: 13,
                                borderRadius: '8px',
                                '&:hover': { bgcolor: alpha('#dc2626', 0.08) }
                            }}
                        >
                            🔄 Xóa bộ lọc
                        </Button>
                    )}
                </Box>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            md: currentTab === 0 ? '2fr 1fr 1fr' : '2fr 1fr 1fr 1fr'
                        },
                        gap: 2,
                        alignItems: 'center'
                    }}
                >
                    <TextField
                        size="small"
                        label={currentTab === 0 ? "Tìm theo Tên, Email, Mã NV..." : "Tìm theo tên tệp Excel hoặc người tải lên..."}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8', fontSize: 20 }} /></InputAdornment> } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: '#086839' } }, '& label.Mui-focused': { color: '#086839' } }}
                    />

                    <TextField
                        type="date"
                        size="small"
                        label="Từ ngày"
                        value={fromDate}
                        onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: '#086839' } }, '& label.Mui-focused': { color: '#086839' } }}
                    />

                    <TextField
                        type="date"
                        size="small"
                        label="Đến ngày"
                        value={toDate}
                        onChange={(e) => { setToDate(e.target.value); setPage(0); }}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: '#086839' } }, '& label.Mui-focused': { color: '#086839' } }}
                    />

                    {/* Chỉ hiển thị bộ lọc trạng thái khi ở Tab Lịch sử Excel */}
                    {currentTab === 1 && (
                        <TextField
                            select
                            size="small"
                            label="Trạng thái file"
                            value={status}
                            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: '#086839' } }, '& label.Mui-focused': { color: '#086839' } }}
                        >
                            <MenuItem value="">Tất cả trạng thái</MenuItem>
                            <MenuItem value="Imported">Đã Nhập (Hoạt động)</MenuItem>
                            <MenuItem value="Rollbacked">Đã Hoàn Tác (Bị hủy)</MenuItem>
                        </TextField>
                    )}
                </Box>
            </Paper>

            {/* ── Table Dữ Liệu Đầy Đủ Cột ── */}
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
                    '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3, '&:hover': { bgcolor: '#94a3b8' } },
                }}
            >
                <Table stickyHeader size="medium">
                    <TableHead>
                        <TableRow>
                            {currentTab === 0 ? (
                                ['Thời gian tạo', 'Mã NV', 'Họ Tên', 'Hành động', 'Bảng tác động', 'ID Bản ghi', 'Địa chỉ IP', 'Thiết bị (User Agent)', 'Chi tiết'].map(label => (
                                    <TableCell key={label} sx={{ bgcolor: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.6px', py: 1.75, borderBottom: '2px solid #e2e8f0' }}>{label}</TableCell>
                                ))
                            ) : (
                                ['Thời gian nhận', 'Tên tệp dữ liệu Excel', 'Người Đăng tải', 'Thành công', 'Lỗi dòng', 'Trạng thái file', 'Thời gian Hủy', 'Người Hủy', 'Tệp gốc', 'Thao tác'].map(label => (
                                    <TableCell key={label} sx={{ bgcolor: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.6px', py: 1.75, borderBottom: '2px solid #e2e8f0' }}>{label}</TableCell>
                                ))
                            )}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {currentTab === 0 ? (
                            logs.map((log: any) => (
                                <TableRow key={log.id} sx={{ '&:hover': { bgcolor: '#f0fdf4 !important' }, transition: 'background-color 0.15s' }}>
                                    <TableCell sx={{ fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#086839', bgcolor: '#f1f5f9', px: 1, py: 0.4, borderRadius: '6px', display: 'inline-block' }}>
                                            {log.staffCode}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#1e293b', fontSize: 13, whiteSpace: 'nowrap' }}>{log.name}</TableCell>
                                    <TableCell>
                                        <Chip label={log.action} size="small" sx={{ bgcolor: alpha('#086839', 0.08), color: '#086839', fontWeight: 700, fontSize: 11, borderRadius: '6px' }} />
                                    </TableCell>
                                    <TableCell sx={{ color: '#475569', fontSize: 13, fontFamily: 'monospace' }}>{log.tableName}</TableCell>
                                    <TableCell sx={{ color: '#64748b', fontSize: 13, fontWeight: 700 }}>{log.recordId ?? '-'}</TableCell>
                                    <TableCell sx={{ color: '#475569', fontSize: 13, fontFamily: 'monospace' }}>{log.ipAddress}</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', fontSize: 12, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <Tooltip title={log.userAgent} placement="top" arrow>
                                            <span>{log.userAgent}</span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<InfoOutlined />}
                                            onClick={() => { setDetailLog(log); setDetailOpen(true); }}
                                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', borderColor: '#086839', color: '#086839', '&:hover': { bgcolor: alpha('#086839', 0.06) } }}
                                        >
                                            Xem thao tác
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            imports.map((file: any) => (
                                <TableRow key={file.id} sx={{ '&:hover': { bgcolor: '#f0fdf4 !important' }, transition: 'background-color 0.15s' }}>
                                    <TableCell sx={{ fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>{formatDateTime(file.importDate)}</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: 13, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.fileName}</TableCell>
                                    <TableCell sx={{ fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>{file.importBy}</TableCell>
                                    <TableCell sx={{ color: '#16a34a', fontWeight: 800, fontSize: 14 }}>+{file.successCount.toLocaleString('vi-VN')}</TableCell>
                                    <TableCell sx={{ color: '#dc2626', fontWeight: 800, fontSize: 14 }}>{file.errorCount.toLocaleString('vi-VN')}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={file.status === 'Imported' ? 'Đã Nhập' : 'Đã Hoàn Tác'}
                                            size="small"
                                            sx={file.status === 'Imported'
                                                ? { bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, borderRadius: '6px' }
                                                : { bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, borderRadius: '6px' }
                                            }
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatDateTime(file.rollbackAt)}</TableCell>
                                    <TableCell sx={{ fontSize: 13, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{file.rollbackBy || '-'}</TableCell>
                                    <TableCell>
                                        {file.fileUrl && canDownload ? (
                                            <Tooltip title="Tải xuống file Excel gốc" arrow>
                                                <Button
                                                    component="a"
                                                    href={file.fileUrl}
                                                    download
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<FileDownloadRounded />}
                                                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', borderColor: '#0ea5e9', color: '#0ea5e9', '&:hover': { bgcolor: '#f0f9ff', borderColor: '#0284c7' } }}
                                                >
                                                    Tải xuống
                                                </Button>
                                            </Tooltip>
                                        ) : (
                                            <Typography sx={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }}>Không có</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {file.status === 'Imported' ? (
                                            canRollback && (
                                                <Button
                                                    variant="outlined"
                                                    color="warning"
                                                    size="small"
                                                    startIcon={<SettingsBackupRestoreRounded />}
                                                    onClick={() => openConfirmDialog(file, 'rollback')}
                                                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}
                                                >
                                                    Rollback
                                                </Button>
                                            )
                                        ) : (
                                            canRestore && (
                                                <Button
                                                    variant="outlined"
                                                    color="success"
                                                    size="small"
                                                    startIcon={<CloudUploadRounded />}
                                                    onClick={() => openConfirmDialog(file, 'restore')}
                                                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}
                                                >
                                                    Khôi phục file
                                                </Button>
                                            )
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}

                        {/* Không tìm thấy dữ liệu */}
                        {((currentTab === 0 && !logs.length) || (currentTab === 1 && !imports.length)) && !loading && (
                            <TableRow>
                                <TableCell colSpan={currentTab === 0 ? 9 : 10} align="center" sx={{ py: 8 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CalendarMonth sx={{ fontSize: 28, color: '#94a3b8' }} />
                                        </Box>
                                        <Typography sx={{ fontWeight: 700, color: '#64748b', fontSize: 15 }}>Không tìm thấy dữ liệu nhật ký hệ thống</Typography>
                                        <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Hãy thử thay đổi mốc thời gian hoặc từ khóa tìm kiếm</Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ── Table Pagination Phân Trang Tổng ── */}
            <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 20px 20px', overflow: 'hidden' }}>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={pageSize}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                    labelRowsPerPage="Số dòng hiển thị:"
                    sx={{
                        '& .MuiTablePagination-toolbar': { minHeight: 48 },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 13, color: '#64748b' }
                    }}
                />
            </Box>

            {/* ── Component Dialog Xác nhận Tách rời ── */}
            <ConfirmRollbackDialog
                open={confirmOpen}
                file={selectedFile}
                actionType={actionType}
                loading={loading}
                onClose={closeConfirmDialog}
                onConfirm={handleConfirmAction}
            />

            {/* ── Dialog Xem Chi Tiết Thao Tác ── */}
            <Dialog
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                maxWidth="md"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '20px', overflow: 'hidden' } } }}
            >
                <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 2, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <InfoOutlined sx={{ color: '#086839', fontSize: 22 }} />
                        <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Chi tiết thao tác</Typography>
                        {detailLog && (
                            <Chip label={detailLog.action} size="small" sx={{ bgcolor: alpha('#086839', 0.1), color: '#086839', fontWeight: 700, fontSize: 11, borderRadius: '6px' }} />
                        )}
                    </Box>
                    <IconButton size="small" onClick={() => setDetailOpen(false)} sx={{ color: '#94a3b8', '&:hover': { color: '#475569' } }}>
                        <Close fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3 }}>
                    {detailLog && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            {/* Thông tin cơ bản */}
                            <Box>
                                <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thông tin chung</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                                    {[
                                        { label: 'Thời gian', value: formatDateTime(detailLog.createdAt) },
                                        { label: 'Mã nhân viên', value: detailLog.staffCode || '-', mono: true },
                                        { label: 'Họ tên', value: detailLog.name || '-' },
                                        { label: 'Hành động', value: detailLog.action, chip: true },
                                        { label: 'Bảng tác động', value: detailLog.tableName || '-', mono: true },
                                        { label: 'ID bản ghi', value: detailLog.recordId?.toString() ?? '-', mono: true },
                                        { label: 'Địa chỉ IP', value: detailLog.ipAddress || '-', mono: true },
                                    ].map(({ label, value, mono, chip }) => (
                                        <Box key={label} sx={{ bgcolor: '#f8fafc', borderRadius: '10px', p: 1.5, border: '1px solid #f1f5f9' }}>
                                            <Typography sx={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.5 }}>{label}</Typography>
                                            {chip ? (
                                                <Chip label={value} size="small" sx={{ bgcolor: alpha('#086839', 0.1), color: '#086839', fontWeight: 700, fontSize: 12, borderRadius: '6px' }} />
                                            ) : (
                                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</Typography>
                                            )}
                                        </Box>
                                    ))}
                                    <Box sx={{ bgcolor: '#f8fafc', borderRadius: '10px', p: 1.5, border: '1px solid #f1f5f9', gridColumn: '1 / -1' }}>
                                        <Typography sx={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.5 }}>Thiết bị (User Agent)</Typography>
                                        <Typography sx={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-all' }}>{detailLog.userAgent || '-'}</Typography>
                                    </Box>
                                </Box>
                            </Box>

                            {/* Old Data */}
                            {detailLog.oldData && (
                                <>
                                    <Divider />
                                    <Box>
                                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#b45309', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dữ liệu cũ (Old Data)</Typography>
                                        <Box sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', p: 2, maxHeight: 280, overflow: 'auto' }}>
                                            <pre style={{ margin: 0, fontSize: 12, color: '#92400e', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                {(() => { try { return JSON.stringify(JSON.parse(detailLog.oldData!), null, 2); } catch { return detailLog.oldData; } })()}
                                            </pre>
                                        </Box>
                                    </Box>
                                </>
                            )}

                            {/* New Data */}
                            {detailLog.newData && (
                                <>
                                    <Divider />
                                    <Box>
                                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#15803d', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dữ liệu mới (New Data)</Typography>
                                        <Box sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', p: 2, maxHeight: 280, overflow: 'auto' }}>
                                            <pre style={{ margin: 0, fontSize: 12, color: '#14532d', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                {(() => { try { return JSON.stringify(JSON.parse(detailLog.newData!), null, 2); } catch { return detailLog.newData; } })()}
                                            </pre>
                                        </Box>
                                    </Box>
                                </>
                            )}

                            {!detailLog.oldData && !detailLog.newData && (
                                <Box sx={{ textAlign: 'center', py: 3, color: '#94a3b8' }}>
                                    <Typography sx={{ fontSize: 13 }}>Không có dữ liệu old/new được ghi lại cho thao tác này.</Typography>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                    <Button onClick={() => setDetailOpen(false)} variant="contained" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, bgcolor: '#086839', '&:hover': { bgcolor: '#065a30' } }}>
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}