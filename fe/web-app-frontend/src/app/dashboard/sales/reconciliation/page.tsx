'use client';

import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import {
    Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TablePagination, TextField, Tooltip, Typography,
} from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PageHeader from '@/components/common/PageHeader';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { usePermission } from '@/hooks/usePermission';
import { reconciliationApi, ReconciliationBreakdownItemDto, ReconciliationRunDetailDto, ReconciliationRunSummaryDto } from '@/features/reconciliation/api/reconciliation.api';
import ReconciliationGuideDialog from '@/features/reconciliation/components/ReconciliationGuideDialog';
import { errMessage } from '@/lib/errMessage';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const GREEN = '#086839';
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';
const CAT_COLORS = [GREEN, '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#10b981', '#6366f1'];

function fmtDate(s?: string | null) {
    if (!s) return '-';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
}
function fmtVnd(v: number) { return Math.round(v).toLocaleString('vi-VN') + 'đ'; }
function fmtShort(v: number) { return v >= 1_000_000_000 ? (Math.floor(v / 100_000_000) / 10).toFixed(1) + ' tỷ' : v >= 1_000_000 ? (Math.floor(v / 100_000) / 10).toFixed(1) + 'tr' : Math.round(v).toLocaleString('vi-VN') + 'đ'; }

function ChartCard({ title, subtitle, children, height = 260 }: { title: string; subtitle?: string; children: React.ReactNode; height?: number }) {
    return (
        <Paper elevation={0} sx={{ flex: 1, minWidth: 280, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>{title}</Typography>
                {subtitle && <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.2 }}>{subtitle}</Typography>}
            </Box>
            <Box sx={{ px: 1, pb: 1, minHeight: height }}>{children}</Box>
        </Paper>
    );
}

function BreakdownChart({ data, unit }: { data: ReconciliationBreakdownItemDto[]; unit: string }) {
    if (data.length === 0) return <Typography sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, py: 6 }}>Không có dữ liệu</Typography>;
    const top = data.slice(0, 8);
    const opts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600 } },
        plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '56%', borderRadiusApplication: 'end', distributed: true } },
        colors: CAT_COLORS,
        fill: { type: 'gradient', gradient: { shade: 'light', type: 'horizontal', shadeIntensity: 0.2, opacityFrom: 1, opacityTo: 0.85 } },
        dataLabels: { enabled: false },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: false } } },
        xaxis: {
            categories: top.map(x => x.name),
            labels: { formatter: (v: string) => fmtShort(Number(v)), style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '12px', colors: '#475569', fontFamily: 'inherit' }, maxWidth: 140 } },
        tooltip: {
            y: { formatter: (v: number, opt) => `${fmtVnd(v)} — ${top[opt?.dataPointIndex ?? -1]?.count ?? 0} ${unit}` },
            style: { fontFamily: 'inherit', fontSize: '12px' },
        },
    };
    return <ReactApexChart type="bar" height={Math.max(200, top.length * 42)} series={[{ name: 'Số tiền', data: top.map(x => x.amount) }]} options={opts} />;
}

function TrendChart({ data }: { data: ReconciliationRunSummaryDto[] }) {
    const opts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: data.length > 8 ? '70%' : '45%', borderRadiusApplication: 'end' } },
        colors: ['#dc2626', '#0369a1', '#b45309'],
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.8 } },
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: {
            categories: data.map(x => `${x.periodMonth}/${x.periodYear}`),
            labels: { style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { formatter: (v: number) => fmtShort(v), style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } } },
        legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px', fontFamily: 'inherit' },
        tooltip: { y: { formatter: (v: number) => fmtVnd(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };
    return (
        <ReactApexChart type="bar" height={260} options={opts} series={[
            { name: 'Dòng dư', data: data.map(x => x.totalExcessAmount) },
            { name: 'Lệch giá trị', data: data.map(x => x.totalMismatchAmount) },
            { name: 'Dòng thiếu', data: data.map(x => x.totalMissingAmount) },
        ]} />
    );
}

const MATCH_TYPE_MAP: Record<string, { label: string; bg: string; color: string }> = {
    duplicate: { label: 'Trùng', bg: '#fee2e2', color: '#dc2626' },
    not_in_source: { label: 'Không khớp nguồn', bg: '#fef3c7', color: '#b45309' },
    value_mismatch: { label: 'Lệch giá trị', bg: '#e0f2fe', color: '#0369a1' },
    possible_date_typo: { label: 'Nghi sai ngày', bg: '#f3e8ff', color: '#7c3aed' },
    possible_sku_typo: { label: 'Nghi sai SKU', bg: '#f3e8ff', color: '#7c3aed' },
};

export default function ReconciliationPage() {
    const canRun = usePermission('reconciliation.run');
    const canDelete = usePermission('reconciliation.delete');
    const qc = useQueryClient();

    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [file, setFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [running, setRunning] = useState(false);

    const [detail, setDetail] = useState<ReconciliationRunDetailDto | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);

    const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];
    const [excessPage, setExcessPage] = useState(0);
    const [excessRowsPerPage, setExcessRowsPerPage] = useState(100);
    const [mismatchPage, setMismatchPage] = useState(0);
    const [mismatchRowsPerPage, setMismatchRowsPerPage] = useState(100);
    const [missingPage, setMissingPage] = useState(0);
    const [missingRowsPerPage, setMissingRowsPerPage] = useState(100);

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

    const { data: runs, isLoading: runsLoading } = useQuery({
        queryKey: ['reconciliation-runs'],
        queryFn: () => reconciliationApi.getRuns(),
    });

    const { data: trend, isLoading: trendLoading } = useQuery({
        queryKey: ['reconciliation-trend'],
        queryFn: () => reconciliationApi.getTrend(),
    });

    async function openDetail(runId: number) {
        setDetailLoading(true);
        setSelectedIds(new Set());
        setExcessPage(0);
        setMismatchPage(0);
        setMissingPage(0);
        try {
            const d = await reconciliationApi.getRunDetail(runId);
            setDetail(d);
        } catch (err) {
            toast.error(errMessage(err, 'Không tải được chi tiết lần rà soát'));
        } finally {
            setDetailLoading(false);
        }
    }

    async function handleRun() {
        if (!file) { toast.error('Chọn file Excel trước khi chạy rà soát'); return; }
        setRunning(true);
        try {
            const result = await reconciliationApi.run(month, year, file);
            toast.success(`Đã rà soát xong — ${result.totalExcessRows} dòng dư, ${result.totalMissingRows} dòng thiếu`);
            setFile(null);
            if (fileRef.current) fileRef.current.value = '';
            qc.invalidateQueries({ queryKey: ['reconciliation-runs'] });
            qc.invalidateQueries({ queryKey: ['reconciliation-trend'] });
            await openDetail(result.id);
        } catch (err) {
            toast.error(errMessage(err, 'Rà soát thất bại'));
        } finally {
            setRunning(false);
        }
    }

    const NON_DELETABLE_TYPES = ['value_mismatch', 'possible_date_typo', 'possible_sku_typo'];
    const activeExcessRows = (detail?.excessRows ?? []).filter(r => !r.isDeleted && !NON_DELETABLE_TYPES.includes(r.matchType));
    const mismatchRows = (detail?.excessRows ?? []).filter(r => r.matchType === 'value_mismatch');
    const typoSuspectRows = (detail?.excessRows ?? []).filter(r => r.matchType === 'possible_date_typo' || r.matchType === 'possible_sku_typo');

    function toggleSelect(id: number) {
        setSelectedIds(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
    }
    function toggleSelectAll() {
        setSelectedIds(prev => prev.size === activeExcessRows.length ? new Set() : new Set(activeExcessRows.map(r => r.id)));
    }
    const selectedAmount = activeExcessRows.filter(r => selectedIds.has(r.id)).reduce((sum, r) => sum + r.revenue, 0);

    async function handleConfirmDelete() {
        if (!detail || selectedIds.size === 0) return;
        setDeleting(true);
        try {
            const result = await reconciliationApi.confirmDelete(detail.run.id, Array.from(selectedIds));
            toast.success(`Đã xóa ${result.deletedCount} dòng, hoàn ${fmtVnd(result.totalAmountReversed)} doanh thu`);
            setConfirmOpen(false);
            setSelectedIds(new Set());
            qc.invalidateQueries({ queryKey: ['reconciliation-runs'] });
            await openDetail(detail.run.id);
        } catch (err) {
            toast.error(errMessage(err, 'Xóa dòng lệch thất bại'));
        } finally {
            setDeleting(false);
        }
    }

    return (
        <Box sx={{
            p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#f0f7f3',
            backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)',
        }}>
            <LoadingOverlay open={running || deleting} text={running ? 'Đang rà soát dữ liệu...' : 'Đang xóa dòng lệch...'} fullScreen />

            <PageHeader
                title="Rà Soát Số Liệu Đơn Hàng"
                subtitle="Đối chiếu dữ liệu hệ thống với file Sapo gốc theo từng tháng, phát hiện dòng lệch/trùng"
                icon={<FactCheckRoundedIcon />}
                actions={
                    <Button variant="outlined" startIcon={<HelpOutlineRoundedIcon sx={{ fontSize: 18 }} />} onClick={() => setGuideOpen(true)}
                        sx={{ borderColor: '#475569', color: '#475569', borderWidth: '1.5px', fontWeight: 700, borderRadius: '12px', px: 2.5, textTransform: 'none', '&:hover': { borderWidth: '1.5px', borderColor: '#1e293b', bgcolor: '#f1f5f9' } }}>
                        Hướng dẫn sử dụng
                    </Button>
                }
            />

            <ReconciliationGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />

            {!trendLoading && trend && trend.length > 0 && (
                <ChartCard title="Xu hướng lệch qua các tháng" subtitle="Lần chạy mới nhất của mỗi tháng — đang tăng hay giảm" height={280}>
                    <TrendChart data={trend} />
                </ChartCard>
            )}
            <Box sx={{ mb: trendLoading || !trend || trend.length === 0 ? 0 : 2 }} />

            {canRun && (
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569', mb: 1.5 }}>Chạy rà soát tháng mới</Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TextField select size="small" label="Tháng" value={month} onChange={e => setMonth(+e.target.value)} sx={{ minWidth: 120 }}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <MenuItem key={m} value={m}>Tháng {m}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" label="Năm" value={year} onChange={e => setYear(+e.target.value)} sx={{ minWidth: 100 }}>
                            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </TextField>
                        <input ref={fileRef} type="file" hidden accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                        <Button variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => fileRef.current?.click()}
                            sx={{ textTransform: 'none', borderRadius: '12px', borderColor: BORDER, color: '#475569', fontWeight: 700 }}>
                            {file ? file.name : 'Chọn file Excel gốc từ Sapo'}
                        </Button>
                        <Button variant="contained" disabled={!file || running} onClick={handleRun}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px', bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' } }}>
                            {running ? 'Đang chạy...' : 'Chạy rà soát'}
                        </Button>
                    </Box>
                </Paper>
            )}

            <Paper elevation={0} sx={{ p: 2.5, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <HistoryRoundedIcon sx={{ color: GREEN, fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Lịch sử các lần rà soát</Typography>
                </Box>
                <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {['Kỳ', 'File nguồn', 'Người chạy', 'Thời gian', 'Dòng dư', 'Dòng thiếu', ''].map(h => (
                                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {runsLoading ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                            ) : !runs || runs.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94a3b8' }}>Chưa có lần rà soát nào</TableCell></TableRow>
                            ) : runs.map(r => (
                                <TableRow key={r.id} hover sx={{ cursor: 'pointer', bgcolor: detail?.run.id === r.id ? '#f0fdf4' : undefined }} onClick={() => openDetail(r.id)}>
                                    <TableCell sx={{ fontWeight: 700 }}>{r.periodMonth}/{r.periodYear}</TableCell>
                                    <TableCell sx={{ color: '#64748b', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sourceFileName}</TableCell>
                                    <TableCell sx={{ color: '#64748b' }}>{r.runByName || `#${r.runBy}`}</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(r.runAt)}</TableCell>
                                    <TableCell align="center">
                                        <Chip label={r.totalExcessRows} size="small" sx={{ bgcolor: r.totalExcessRows > 0 ? '#fee2e2' : '#f1f5f9', color: r.totalExcessRows > 0 ? '#dc2626' : '#94a3b8', fontWeight: 700 }} />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip label={r.totalMissingRows} size="small" sx={{ bgcolor: r.totalMissingRows > 0 ? '#fef3c7' : '#f1f5f9', color: r.totalMissingRows > 0 ? '#b45309' : '#94a3b8', fontWeight: 700 }} />
                                    </TableCell>
                                    <TableCell>
                                        <Button size="small" onClick={(e) => { e.stopPropagation(); openDetail(r.id); }} sx={{ textTransform: 'none', color: GREEN, fontWeight: 700 }}>Xem</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {detailLoading ? (
                <Paper elevation={0} sx={{ p: 4, borderRadius: CARD_RADIUS, textAlign: 'center', color: '#94a3b8' }}>Đang tải chi tiết...</Paper>
            ) : detail && (
                <>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                        {[
                            { label: 'Dòng dư', value: detail.run.totalExcessRows, sub: fmtVnd(detail.run.totalExcessAmount), color: '#dc2626', bg: '#fef2f2' },
                            { label: 'Dòng thiếu', value: detail.run.totalMissingRows, sub: fmtVnd(detail.run.totalMissingAmount), color: '#b45309', bg: '#fffbeb' },
                            { label: 'Dòng lệch giá trị', value: detail.run.totalMismatchRows, sub: fmtVnd(detail.run.totalMismatchAmount), color: '#0369a1', bg: '#f0f9ff' },
                        ].map(s => (
                            <Paper key={s.label} elevation={0} sx={{ flex: 1, minWidth: 200, p: 2, borderRadius: '16px', border: `1px solid ${BORDER}`, bgcolor: s.bg }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase' }}>{s.label}</Typography>
                                <Typography sx={{ fontSize: 24, fontWeight: 900, color: '#1e293b', mt: 0.5 }}>{s.value}</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.sub}</Typography>
                            </Paper>
                        ))}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                        <ChartCard title="Dư/lệch theo chi nhánh" subtitle="Top 8 chi nhánh có số tiền dư/lệch cao nhất">
                            <BreakdownChart data={detail.byBranch} unit="dòng" />
                        </ChartCard>
                        <ChartCard title="Dư/lệch theo nguồn đơn" subtitle="Top 8 nguồn đơn có số tiền dư/lệch cao nhất">
                            <BreakdownChart data={detail.bySource} unit="dòng" />
                        </ChartCard>
                        <ChartCard title="Dư/lệch theo người nhập" subtitle="Top 8 người nhập có số tiền dư/lệch cao nhất">
                            <BreakdownChart data={detail.byImporter} unit="dòng" />
                        </ChartCard>
                    </Box>

                    <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Dòng dư — có trong hệ thống, không có trong file gốc ({activeExcessRows.length})</Typography>
                            {canDelete && selectedIds.size > 0 && (
                                <Button size="small" variant="contained" color="error" startIcon={<DeleteOutlineRoundedIcon />}
                                    onClick={() => setConfirmOpen(true)}
                                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
                                    Xóa {selectedIds.size} dòng đã chọn ({fmtVnd(selectedAmount)})
                                </Button>
                            )}
                        </Box>
                        <TableContainer sx={{ maxHeight: 480 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        {canDelete && (
                                            <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc' }}>
                                                <Checkbox size="small" indeterminate={selectedIds.size > 0 && selectedIds.size < activeExcessRows.length}
                                                    checked={activeExcessRows.length > 0 && selectedIds.size === activeExcessRows.length}
                                                    onChange={toggleSelectAll} />
                                            </TableCell>
                                        )}
                                        {['Mã đơn', 'Ngày', 'SKU', 'Dịch vụ', 'SL', 'Doanh thu lệch', 'Loại lệch', 'Nội dung lệch', 'Chi nhánh', 'Người nhập'].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {activeExcessRows.length === 0 ? (
                                        <TableRow><TableCell colSpan={canDelete ? 11 : 10} align="center" sx={{ py: 4, color: '#94a3b8' }}>Không có dòng dư</TableCell></TableRow>
                                    ) : activeExcessRows.slice(excessPage * excessRowsPerPage, (excessPage + 1) * excessRowsPerPage).map(r => {
                                        const mt = MATCH_TYPE_MAP[r.matchType] ?? { label: r.matchType, bg: '#f1f5f9', color: '#475569' };
                                        return (
                                            <TableRow key={r.id} hover selected={selectedIds.has(r.id)}>
                                                {canDelete && (
                                                    <TableCell padding="checkbox">
                                                        <Checkbox size="small" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} />
                                                    </TableCell>
                                                )}
                                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.orderCode}</TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(r.purchaseDate)}</TableCell>
                                                <TableCell>{r.sku || '-'}</TableCell>
                                                <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.serviceName || '-'}</TableCell>
                                                <TableCell align="right">{r.quantity}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: '#dc2626' }}>{fmtVnd(r.revenue)}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                                        <Chip label={mt.label} size="small" sx={{ bgcolor: mt.bg, color: mt.color, fontWeight: 700, fontSize: 10, borderRadius: '6px' }} />
                                                        {r.wasEverRestored && (
                                                            <Tooltip title="Batch import này từng bị Rollback rồi Khôi phục lại — dấu hiệu nghi vấn trùng dữ liệu" arrow>
                                                                <Chip label="⚠ Từng Restore" size="small" sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 700, fontSize: 10, borderRadius: '6px' }} />
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: 12, color: '#64748b', maxWidth: 320 }}>{r.note || '-'}</TableCell>
                                                <TableCell sx={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{r.branchName || '-'}</TableCell>
                                                <TableCell sx={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{r.importedByName || '-'}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {activeExcessRows.length > 0 && (
                            <TablePagination
                                component="div"
                                count={activeExcessRows.length}
                                page={excessPage}
                                onPageChange={(_, p) => setExcessPage(p)}
                                rowsPerPage={excessRowsPerPage}
                                onRowsPerPageChange={e => { setExcessRowsPerPage(+e.target.value); setExcessPage(0); }}
                                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                                labelRowsPerPage="Hiển thị:"
                                sx={{ borderTop: `1px solid ${BORDER}` }}
                            />
                        )}
                    </Paper>

                    <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                        <Box sx={{ p: 2 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Dòng lệch giá trị — đơn có thật, số liệu app khác file gốc ({mismatchRows.length})</Typography>
                            <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.3 }}>Không thể xóa các dòng này — đơn hàng vẫn có thật, cần đối chiếu và sửa số liệu thủ công nếu cần.</Typography>
                        </Box>
                        <TableContainer sx={{ maxHeight: 420 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        {['Mã đơn', 'Ngày', 'SKU', 'Dịch vụ', 'SL (app)', 'SL (file)', 'Doanh thu (app)', 'Doanh thu (file)', 'Lệch'].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {mismatchRows.length === 0 ? (
                                        <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: '#94a3b8' }}>Không có dòng lệch giá trị</TableCell></TableRow>
                                    ) : mismatchRows.slice(mismatchPage * mismatchRowsPerPage, (mismatchPage + 1) * mismatchRowsPerPage).map(r => {
                                        const delta = r.revenue - (r.sourceRevenue ?? 0);
                                        const qtyDiff = r.quantity !== r.sourceQuantity;
                                        return (
                                            <TableRow key={r.id} hover>
                                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.orderCode}</TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(r.purchaseDate)}</TableCell>
                                                <TableCell>{r.sku || '-'}</TableCell>
                                                <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.serviceName || '-'}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: qtyDiff ? 700 : 400, color: qtyDiff ? '#0369a1' : undefined }}>{r.quantity}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: qtyDiff ? 700 : 400, color: qtyDiff ? '#0369a1' : undefined }}>{r.sourceQuantity ?? '-'}</TableCell>
                                                <TableCell align="right">{fmtVnd(r.revenue)}</TableCell>
                                                <TableCell align="right">{r.sourceRevenue != null ? fmtVnd(r.sourceRevenue) : '-'}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: delta > 0 ? '#dc2626' : delta < 0 ? '#0369a1' : '#94a3b8' }}>
                                                    {delta > 0 ? '+' : ''}{fmtVnd(delta)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {mismatchRows.length > 0 && (
                            <TablePagination
                                component="div"
                                count={mismatchRows.length}
                                page={mismatchPage}
                                onPageChange={(_, p) => setMismatchPage(p)}
                                rowsPerPage={mismatchRowsPerPage}
                                onRowsPerPageChange={e => { setMismatchRowsPerPage(+e.target.value); setMismatchPage(0); }}
                                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                                labelRowsPerPage="Hiển thị:"
                                sx={{ borderTop: `1px solid ${BORDER}` }}
                            />
                        )}
                    </Paper>

                    <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                        <Box sx={{ p: 2 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Nghi ngờ lỗi nhập liệu — gợi ý sai ngày/SKU ({typoSuspectRows.length})</Typography>
                            <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.3 }}>Chỉ là gợi ý dựa trên suy đoán (ngày lệch ≤3 ngày, SKU gõ nhầm 1-2 ký tự) — cần xác minh thủ công trước khi sửa. Không thể xóa các dòng này.</Typography>
                        </Box>
                        <TableContainer sx={{ maxHeight: 420 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        {['Mã đơn', 'Ngày', 'SKU', 'Dịch vụ', 'SL', 'Doanh thu', 'Loại nghi vấn', 'Ghi chú'].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {typoSuspectRows.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8' }}>Không phát hiện nghi vấn nào</TableCell></TableRow>
                                    ) : typoSuspectRows.map(r => {
                                        const mt = MATCH_TYPE_MAP[r.matchType] ?? { label: r.matchType, bg: '#f1f5f9', color: '#475569' };
                                        return (
                                            <TableRow key={r.id} hover>
                                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.orderCode}</TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(r.purchaseDate)}</TableCell>
                                                <TableCell>{r.sku || '-'}</TableCell>
                                                <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.serviceName || '-'}</TableCell>
                                                <TableCell align="right">{r.quantity}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtVnd(r.revenue)}</TableCell>
                                                <TableCell>
                                                    <Chip label={mt.label} size="small" sx={{ bgcolor: mt.bg, color: mt.color, fontWeight: 700, fontSize: 10, borderRadius: '6px' }} />
                                                </TableCell>
                                                <TableCell sx={{ fontSize: 12, color: '#64748b', maxWidth: 320 }}>{r.note || '-'}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                        <Box sx={{ p: 2 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Dòng thiếu — có trong file gốc, chưa có trong hệ thống ({detail.missingRows.length})</Typography>
                        </Box>
                        <TableContainer sx={{ maxHeight: 380 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        {['Mã đơn', 'Ngày', 'SKU', 'Dịch vụ', 'SL', 'Doanh thu', 'Chi nhánh', 'Nguồn', 'Ghi chú'].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detail.missingRows.length === 0 ? (
                                        <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: '#94a3b8' }}>Không có dòng thiếu</TableCell></TableRow>
                                    ) : detail.missingRows.slice(missingPage * missingRowsPerPage, (missingPage + 1) * missingRowsPerPage).map(r => (
                                        <TableRow key={r.id} hover>
                                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.orderCode}</TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(r.purchaseDate)}</TableCell>
                                            <TableCell>{r.sku || '-'}</TableCell>
                                            <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.serviceName || '-'}</TableCell>
                                            <TableCell align="right">{r.quantity}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#b45309' }}>{fmtVnd(r.revenue)}</TableCell>
                                            <TableCell sx={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{r.branchName || '-'}</TableCell>
                                            <TableCell sx={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{r.source || '-'}</TableCell>
                                            <TableCell sx={{ fontSize: 12, color: '#7c3aed', maxWidth: 280 }}>{r.note || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {detail.missingRows.length > 0 && (
                            <TablePagination
                                component="div"
                                count={detail.missingRows.length}
                                page={missingPage}
                                onPageChange={(_, p) => setMissingPage(p)}
                                rowsPerPage={missingRowsPerPage}
                                onRowsPerPageChange={e => { setMissingRowsPerPage(+e.target.value); setMissingPage(0); }}
                                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                                labelRowsPerPage="Hiển thị:"
                                sx={{ borderTop: `1px solid ${BORDER}` }}
                            />
                        )}
                    </Paper>
                </>
            )}

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, p: 1 } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Xác nhận xóa dòng lệch</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 14, color: '#475569' }}>
                        Bạn sắp xóa <b>{selectedIds.size}</b> dòng lệch, tổng doanh thu sẽ giảm <b>{fmtVnd(selectedAmount)}</b>.
                        Thao tác này sẽ xóa dòng dữ liệu chi tiết và trừ đúng doanh thu của đơn hàng liên quan — không thể hoàn tác.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setConfirmOpen(false)} sx={{ textTransform: 'none', borderRadius: '12px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" color="error" onClick={handleConfirmDelete} disabled={deleting}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}>
                        {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
