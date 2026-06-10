'use client';

import { useEffect, useState } from 'react';
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
} from '@mui/material';
import {
    HistoryRounded,
    CloudUploadRounded,
    SettingsBackupRestoreRounded,
    Search,
    FilterList,
    CalendarMonth
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import PageHeader from '@/components/common/PageHeader';
import { userApi } from '@/features/user/api/user.api';
import ConfirmRollbackDialog from '@/features/staff/components/ConfirmRollbackDialog';

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
};

export default function SystemHistoryPage() {
    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);

    // Dữ liệu danh sách
    const [logs, setLogs] = useState<LogRow[]>([]);
    const [imports, setImports] = useState<ImportRow[]>([]);
    const [total, setTotal] = useState(0);

    // Phân trang
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);

    // Bộ lọc chung
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [status, setStatus] = useState(''); // Chỉ dùng cho Tab Import Excel

    // States phục vụ cho Hộp thoại xác nhận rời (ConfirmRollbackDialog)
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<ImportRow | null>(null);
    const [actionType, setActionType] = useState<'rollback' | 'restore' | null>(null);

    const formatDateTime = (value?: string | null) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('vi-VN', {
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

    // Đọc dữ liệu tự động dựa trên Tab và Filters
    const loadHistoryData = async () => {
        setLoading(true);
        try {
            const params = {
                page: page + 1,
                pageSize,
                search: debouncedSearch || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
            };

            if (currentTab === 0) {
                const response = await userApi.getActivityLogs(params);
                setLogs(response.content.items);
                setTotal(response.content.totalItems);
            } else {
                const response = await userApi.getImportHistory({
                    ...params,
                    status: status || undefined
                });
                setImports(response.content.items);
                setTotal(response.content.totalItems);
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message ?? 'Không tải được dữ liệu lịch sử');
        } finally {
            setLoading(false);
        }
    };

    // Lắng nghe thay đổi bộ lọc để gọi lại API
    useEffect(() => {
        loadHistoryData();
    }, [currentTab, page, pageSize, debouncedSearch, fromDate, toDate, status]);

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
        setLoading(true);
        setConfirmOpen(false); // Đóng nhanh dialog tránh đúp lệnh bấm

        try {
            if (actionType === 'rollback') {
                await userApi.rollbackImportExcel(selectedFile.id);
                toast.success('Hoàn tác tệp Excel thành công, số liệu tài chính đã được hoàn tác', { id: toastId });
            } else {
                await userApi.restoreImportExcel(selectedFile.id);
                toast.success('Khôi phục tệp Excel thành công, đơn hàng đã hoạt động trở lại', { id: toastId });
            }
            loadHistoryData();
        } catch (error: any) {
            toast.error(error?.response?.data?.message ?? 'Thao tác tệp dữ liệu gặp lỗi', { id: toastId });
        } finally {
            setLoading(false);
            closeConfirmDialog();
        }
    };

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
            <LoadingOverlay open={loading} text="Đang xử lý dữ liệu..." />

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
                                ['Thời gian tạo', 'Mã NV', 'Họ Tên', 'Hành động', 'Bảng tác động', 'ID Bản ghi', 'Địa chỉ IP', 'Thiết bị (User Agent)'].map(label => (
                                    <TableCell key={label} sx={{ bgcolor: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.6px', py: 1.75, borderBottom: '2px solid #e2e8f0' }}>{label}</TableCell>
                                ))
                            ) : (
                                ['Thời gian nhận', 'Tên tệp dữ liệu Excel', 'Người Đăng tải', 'Thành công', 'Lỗi dòng', 'Trạng thái file', 'Thời gian Hủy', 'Người Hủy', 'Thao tác'].map(label => (
                                    <TableCell key={label} sx={{ bgcolor: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.6px', py: 1.75, borderBottom: '2px solid #e2e8f0' }}>{label}</TableCell>
                                ))
                            )}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {currentTab === 0 ? (
                            logs.map(log => (
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
                                </TableRow>
                            ))
                        ) : (
                            imports.map(file => (
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
                                        {file.status === 'Imported' ? (
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
                                        ) : (
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
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}

                        {/* Không tìm thấy dữ liệu */}
                        {((currentTab === 0 && !logs.length) || (currentTab === 1 && !imports.length)) && !loading && (
                            <TableRow>
                                <TableCell colSpan={currentTab === 0 ? 8 : 9} align="center" sx={{ py: 8 }}>
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
        </Box>
    );
}