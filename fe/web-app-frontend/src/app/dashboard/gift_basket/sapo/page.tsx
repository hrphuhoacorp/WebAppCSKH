'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Grid, IconButton, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import { BarChartRounded, CloudUpload, Delete, Refresh } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import toast from 'react-hot-toast';
import { giftBasketApi, SapoDashboardDTO, SapoImportDTO } from '@/features/gift-basket/api/gift-basket.api';
import PageHeader from '@/components/common/PageHeader';

const fmtVnd = (n: number) =>
    n?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) ?? '0 ₫';
const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString('vi-VN') : '—');
const fmtShort = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'tr';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
    return String(n);
};

const FILTERS = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: '7days', label: '7 ngày' },
    { key: '30days', label: '30 ngày' },
    { key: 'month', label: 'Tháng này' },
    { key: 'all', label: 'Tất cả' },
];

const KPI = [
    { key: 'totalNetRevenue', label: 'Doanh thu thuần', color: '#166534', bg: '#dcfce7', fmt: fmtVnd },
    { key: 'totalRevenue', label: 'Doanh thu', color: '#1e40af', bg: '#dbeafe', fmt: fmtVnd },
    { key: 'totalOrders', label: 'Số đơn', color: '#7c3aed', bg: '#ede9fe', fmt: (v: number) => v.toLocaleString() },
    { key: 'totalQty', label: 'SL bán', color: '#92400e', bg: '#fef3c7', fmt: (v: number) => v.toLocaleString() },
];

export default function SapoDashboardPage() {
    const [dashboard, setDashboard] = useState<SapoDashboardDTO | null>(null);
    const [filterKey, setFilterKey] = useState('all');
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [reportDate, setReportDate] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadDashboard = useCallback(
        async (key = filterKey) => {
            setLoading(true);
            try {
                const res = await giftBasketApi.getSapoDashboard(key);
                if (res.content) setDashboard(res.content);
            } catch {
                toast.error('Lỗi tải dashboard');
            } finally {
                setLoading(false);
            }
        },
        [filterKey],
    );

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!reportDate) { toast.error('Nhập ngày báo cáo trước'); return; }
        setImporting(true);
        try {
            const res = await giftBasketApi.importSapo(file, reportDate);
            if (res.status === 'Success') {
                toast.success('Import thành công');
                if (res.content) setDashboard(res.content);
            } else {
                toast.error(res.message ?? 'Lỗi import');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Lỗi import');
        } finally {
            setImporting(false);
            e.target.value = '';
        }
    };

    const handleDeleteImport = async () => {
        if (!deleteTarget) return;
        try {
            await giftBasketApi.deleteSapoImport(deleteTarget);
            toast.success('Đã xóa');
            setDeleteTarget(null);
            loadDashboard();
        } catch {
            toast.error('Lỗi xóa');
        }
    };

    /* ─── chart data ─── */
    const chartDays = dashboard?.byDay ?? [];
    const chartLabels = chartDays.map((d) => {
        const parts = d.key.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.key;
    });
    const chartValues = chartDays.map((d) => d.netRevenue);
    const maxVal = Math.max(...chartValues, 1);

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                minHeight: '100vh',
                bgcolor: '#f0f7f3',
                backgroundImage: `radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)`,
            }}
        >
            <PageHeader
                icon={<BarChartRounded />}
                title="Dashboard Sapo"
                subtitle="Phân tích doanh thu giỏ quà từ dữ liệu Sapo"
                actions={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            label="Ngày báo cáo"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            placeholder="2025-01-15"
                            sx={{ width: 155 }}
                        />
                        <Button
                            variant="contained"
                            startIcon={
                                importing ? <CircularProgress size={14} color="inherit" /> : <CloudUpload />
                            }
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            sx={{ bgcolor: '#086839', '&:hover': { bgcolor: '#065f2d' } }}
                        >
                            Import Sapo
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            hidden
                            onChange={handleImport}
                        />
                        <Tooltip title="Làm mới">
                            <IconButton onClick={() => loadDashboard()} size="small">
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Box>
                }
            />

            {/* Filter pills */}
            <Paper
                elevation={0}
                sx={{
                    display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap', alignItems: 'center',
                    p: 1.5, borderRadius: '20px', border: '1px solid #e2e8f0',
                    bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                }}
            >
                {FILTERS.map((opt) => (
                    <Chip
                        key={opt.key}
                        label={opt.label}
                        clickable
                        onClick={() => { setFilterKey(opt.key); loadDashboard(opt.key); }}
                        sx={
                            filterKey === opt.key
                                ? { bgcolor: '#086839', color: '#fff', fontWeight: 700 }
                                : { bgcolor: '#f1f5f9', color: '#475569' }
                        }
                    />
                ))}
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                    <CircularProgress />
                </Box>
            ) : dashboard ? (
                <>
                    {/* KPI */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {KPI.map((k) => {
                            const val = (dashboard as any)[k.key] ?? 0;
                            return (
                                <Grid size={{ xs: 6, md: 3 }} key={k.key}>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: k.bg,
                                            borderColor: 'transparent',
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: k.color,
                                                fontWeight: 600,
                                                fontSize: 11,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                            }}
                                        >
                                            {k.label}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontWeight: 800,
                                                fontSize: { xs: 17, sm: 21 },
                                                color: k.color,
                                                mt: 0.5,
                                                lineHeight: 1.2,
                                            }}
                                        >
                                            {k.fmt(val)}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>

                    {/* ─── Biểu đồ doanh thu theo ngày ─── */}
                    {chartDays.length > 0 && (
                        <Paper variant="outlined" sx={{ borderRadius: 2, mb: 3, overflow: 'hidden' }}>
                            <Box
                                sx={{
                                    px: 2,
                                    py: 1.5,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                                    Doanh thu thuần theo ngày
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {chartDays.length} ngày
                                </Typography>
                            </Box>

                            {/* MUI X Charts BarChart */}
                            <Box sx={{ px: 1, pt: 1, pb: 0.5 }}>
                                <BarChart
                                    xAxis={[
                                        {
                                            scaleType: 'band',
                                            data: chartLabels,
                                            tickLabelStyle: { fontSize: 11 },
                                        },
                                    ]}
                                    yAxis={[
                                        {
                                            valueFormatter: (v: number) => fmtShort(v),
                                            tickLabelStyle: { fontSize: 11 },
                                        },
                                    ]}
                                    series={[
                                        {
                                            data: chartValues,
                                            label: 'DT thuần (đ)',
                                            color: '#086839',
                                            valueFormatter: (v: number | null) =>
                                                v != null ? fmtVnd(v) : '',
                                        },
                                    ]}
                                    height={260}
                                    margin={{ top: 16, right: 16, bottom: 40, left: 72 }}
                                    borderRadius={6}
                                />
                            </Box>

                            {/* Bảng chi tiết kèm bar nhỏ */}
                            <TableContainer sx={{ maxHeight: 240 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {['Ngày', 'Biểu đồ', 'DT thuần', 'SL', 'Đơn'].map((h) => (
                                                <TableCell
                                                    key={h}
                                                    sx={{
                                                        fontWeight: 700,
                                                        fontSize: 11,
                                                        bgcolor: alpha('#086839', 0.05),
                                                    }}
                                                >
                                                    {h}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {chartDays
                                            .slice()
                                            .reverse()
                                            .map((d) => {
                                                const pct = Math.max(4, Math.round((d.netRevenue / maxVal) * 100));
                                                return (
                                                    <TableRow key={d.key} hover>
                                                        <TableCell>
                                                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                                                {chartLabels[chartDays.indexOf(d)]}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ minWidth: 160 }}>
                                                            <Box
                                                                sx={{
                                                                    height: 18,
                                                                    bgcolor: alpha('#086839', 0.1),
                                                                    borderRadius: '999px',
                                                                    overflow: 'hidden',
                                                                    border: `1px solid ${alpha('#086839', 0.15)}`,
                                                                }}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        height: '100%',
                                                                        width: `${pct}%`,
                                                                        background:
                                                                            'linear-gradient(90deg,#065f2d,#61b32b)',
                                                                        borderRadius: '999px',
                                                                    }}
                                                                />
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontWeight: 700, color: 'success.dark' }}
                                                            >
                                                                {fmtVnd(d.netRevenue)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">{d.qty}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">{d.orders}</Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}

                    {/* ─── Theo mã + Chi nhánh ─── */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, lg: 7 }}>
                            <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                                <Box
                                    sx={{
                                        px: 2,
                                        py: 1.5,
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                                        Top mã giỏ bán chạy
                                    </Typography>
                                </Box>

                                {/* Mini bar chart for codes */}
                                {dashboard.byCode.length > 0 && (
                                    <Box sx={{ px: 1, pt: 1 }}>
                                        <BarChart
                                            xAxis={[
                                                {
                                                    scaleType: 'band',
                                                    data: dashboard.byCode.slice(0, 10).map((b) => b.key),
                                                    tickLabelStyle: { fontSize: 10 },
                                                },
                                            ]}
                                            yAxis={[
                                                {
                                                    valueFormatter: (v: number) => fmtShort(v),
                                                    tickLabelStyle: { fontSize: 10 },
                                                },
                                            ]}
                                            series={[
                                                {
                                                    data: dashboard.byCode.slice(0, 10).map((b) => b.netRevenue),
                                                    color: '#1e40af',
                                                    valueFormatter: (v: number | null) =>
                                                        v != null ? fmtVnd(v) : '',
                                                },
                                            ]}
                                            height={180}
                                            margin={{ top: 8, right: 12, bottom: 36, left: 64 }}
                                            borderRadius={4}
                                        />
                                    </Box>
                                )}

                                <TableContainer sx={{ maxHeight: 280 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                {['#', 'Mã / Tên', 'DT thuần', 'Đơn', 'SL'].map((h) => (
                                                    <TableCell
                                                        key={h}
                                                        sx={{
                                                            fontWeight: 700,
                                                            fontSize: 11,
                                                            bgcolor: alpha('#086839', 0.05),
                                                        }}
                                                    >
                                                        {h}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {dashboard.byCode.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                        Chưa có dữ liệu
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                dashboard.byCode.map((b, i) => (
                                                    <TableRow key={b.key} hover>
                                                        <TableCell sx={{ color: 'text.disabled', fontSize: 11 }}>
                                                            {i + 1}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                {b.key}
                                                            </Typography>
                                                            {b.label !== b.key && (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                    noWrap
                                                                    sx={{ display: 'block', maxWidth: 200 }}
                                                                >
                                                                    {b.label}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontWeight: 600, color: 'success.dark' }}
                                                            >
                                                                {fmtVnd(b.netRevenue)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2">{b.orders}</Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2">{b.qty}</Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, lg: 5 }}>
                            {/* Chi nhánh */}
                            <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Theo chi nhánh</Typography>
                                </Box>
                                {dashboard.byBranch.length > 0 && (
                                    <Box sx={{ px: 1, pt: 1 }}>
                                        <BarChart
                                            xAxis={[
                                                {
                                                    scaleType: 'band',
                                                    data: dashboard.byBranch.map((b) => b.label),
                                                    tickLabelStyle: { fontSize: 10 },
                                                },
                                            ]}
                                            yAxis={[
                                                {
                                                    valueFormatter: (v: number) => fmtShort(v),
                                                    tickLabelStyle: { fontSize: 10 },
                                                },
                                            ]}
                                            series={[
                                                {
                                                    data: dashboard.byBranch.map((b) => b.netRevenue),
                                                    color: '#7c3aed',
                                                    valueFormatter: (v: number | null) =>
                                                        v != null ? fmtVnd(v) : '',
                                                },
                                            ]}
                                            height={160}
                                            margin={{ top: 8, right: 12, bottom: 36, left: 64 }}
                                            borderRadius={4}
                                        />
                                    </Box>
                                )}
                                <TableContainer>
                                    <Table size="small">
                                        <TableBody>
                                            {dashboard.byBranch.map((b) => (
                                                <TableRow key={b.key} hover>
                                                    <TableCell>
                                                        <Typography variant="body2">{b.label}</Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ fontWeight: 600, color: 'success.dark' }}
                                                        >
                                                            {fmtVnd(b.netRevenue)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="caption" color="text.secondary">
                                                            {b.orders} đơn
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* ─── Lịch sử import ─── */}
                    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                                Lịch sử import ({dashboard.recentImports.length})
                            </Typography>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: alpha('#086839', 0.04) }}>
                                        {['Batch ID', 'Ngày BC', 'Dòng', 'DT thuần', 'Đơn', 'SL', 'Thời gian', ''].map(
                                            (h) => (
                                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>
                                                    {h}
                                                </TableCell>
                                            ),
                                        )}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {dashboard.recentImports.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={8}
                                                align="center"
                                                sx={{ py: 4, color: 'text.secondary' }}
                                            >
                                                Chưa có lịch sử import
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        dashboard.recentImports.map((imp: SapoImportDTO) => (
                                            <TableRow key={imp.id} hover>
                                                <TableCell>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ fontFamily: 'monospace', color: '#3b82f6' }}
                                                    >
                                                        {imp.importBatchId}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{imp.reportDate}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={imp.rowCount} size="small" sx={{ fontSize: 11 }} />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 600, color: 'success.dark' }}
                                                    >
                                                        {fmtVnd(imp.netRevenue)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{imp.orders}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{imp.qty}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {fmtDate(imp.uploadedAt)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Xóa lô này">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setDeleteTarget(imp.importBatchId)}
                                                            sx={{
                                                                color: '#d1d5db',
                                                                '&:hover': { color: '#ef4444' },
                                                            }}
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            ) : null}

            {/* Delete confirm */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Xóa lô import?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Tất cả dữ liệu thuộc batch <code>{deleteTarget}</code> sẽ bị xóa.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteTarget(null)} color="inherit">
                        Hủy
                    </Button>
                    <Button variant="contained" color="error" onClick={handleDeleteImport}>
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
