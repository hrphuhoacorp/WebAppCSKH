'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { useQuery } from '@tanstack/react-query';
import {
    Box, Typography, Paper, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, alpha, MenuItem, TextField,
    Skeleton, Tooltip, Tabs, Tab, TablePagination,
} from '@mui/material';
import {
    TrendingUp, People, AccessTime, Repeat, Warning, Schedule,
    Inventory2, Category, BarChart as BarChartIcon, StarBorder,
    LocalFireDepartment,
} from '@mui/icons-material';
import PageHeader from '@/components/common/PageHeader';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import {
    returnRateApi, LoyalCustomerDTO, SegmentCustomerDTO,
} from '@/features/customer/api/returnRate.api';
import LoyalCustomerDetailDialog from '@/features/customer/components/LoyalCustomerDetailDialog';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const PURPLE = '#7c3aed';
const GREEN = '#086839';
const BLUE = '#0ea5e9';
const AMBER = '#f59e0b';
const RED = '#ef4444';
const PINK = '#ec4899';
const TEAL = '#10b981';
const INDIGO = '#6366f1';
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';
const MONTH_OPTIONS = [3, 6, 12, 24];
const VND = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
const MONTHS_VI = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
const CAT_COLORS = [PURPLE, GREEN, BLUE, AMBER, RED, PINK, TEAL, INDIGO];

// ── Reusable components ────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon, loading }: {
    label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode; loading?: boolean;
}) {
    return (
        <Paper elevation={0} sx={{
            p: 2.5, borderRadius: CARD_RADIUS,
            border: `1px solid ${alpha(color, 0.18)}`,
            background: `linear-gradient(135deg, #fff 60%, ${alpha(color, 0.06)} 100%)`,
            boxShadow: `0 4px 24px ${alpha(color, 0.1)}`,
            position: 'relative', overflow: 'hidden',
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 32px ${alpha(color, 0.18)}` },
        }}>
            <Box sx={{ position: 'absolute', top: -18, right: -18, width: 80, height: 80, borderRadius: '50%', bgcolor: alpha(color, 0.07) }} />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{
                    width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.65)})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 12px ${alpha(color, 0.35)}`,
                    '& svg': { fontSize: 21, color: '#fff' },
                }}>
                    {loading ? <Skeleton variant="circular" width={22} height={22} sx={{ bgcolor: 'rgba(255,255,255,0.4)' }} /> : icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 0.4 }}>{label}</Typography>
                    {loading ? <Skeleton width={80} height={32} />
                        : <Typography sx={{ fontSize: typeof value === 'string' && value.length > 10 ? 18 : 26, fontWeight: 900, color: '#1e293b', lineHeight: 1.1 }}>{value}</Typography>}
                    {loading ? <Skeleton width="80%" height={16} sx={{ mt: 0.4 }} />
                        : sub && <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: 0.5 }}>{sub}</Typography>}
                </Box>
            </Box>
        </Paper>
    );
}

function ChartCard({ title, subtitle, children, loading, height = 280, action }: {
    title: string; subtitle?: string; children: React.ReactNode; loading?: boolean; height?: number; action?: React.ReactNode;
}) {
    return (
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, pt: 2.5, pb: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{title}</Typography>
                    {subtitle && <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.3 }}>{subtitle}</Typography>}
                </Box>
                {action && <Box sx={{ flexShrink: 0, pt: 0.3 }}>{action}</Box>}
            </Box>
            <Box sx={{ px: 1, pt: 1, pb: 0.5 }}>
                {loading ? <Skeleton variant="rectangular" height={height} sx={{ borderRadius: '12px', mx: 1.5, mb: 1.5 }} /> : children}
            </Box>
        </Paper>
    );
}

// ── Segment table ──────────────────────────────────────────────────────────────

const SEGMENTS = [
    { key: 'loyal',    label: 'Thân thiết',   color: PURPLE, badge: 'Thân thiết',  badgeColor: AMBER, desc: 'Mua ≥ 2 lần, sắp xếp theo số đơn giảm dần' },
    { key: 'repeat',   label: 'Mua ≥ 2 lần',  color: GREEN,  badge: 'Mua ≥ 2 lần', badgeColor: GREEN, desc: 'Tất cả KH có ≥2 đơn hàng' },
    { key: 'active30', label: 'Hoạt động',     color: BLUE,   badge: 'Hoạt động',   badgeColor: BLUE,  desc: 'Mua hàng trong 30 ngày gần nhất' },
    { key: 'atRisk',   label: 'Nguy cơ mất',   color: RED,    badge: 'Nguy cơ mất', badgeColor: RED,   desc: '≥2 đơn, chưa mua 60–180 ngày' },
];

function SegmentTable({ segment, color, onViewCustomer }: {
    segment: string; color: string; onViewCustomer: (c: SegmentCustomerDTO) => void;
}) {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    useEffect(() => { setPage(0); }, [segment]);

    const { data: segData, isFetching: loading } = useQuery({
        queryKey: ['segment-customers', segment, page, pageSize],
        queryFn: () => returnRateApi.getCustomersBySegment(segment, page + 1, pageSize),
        placeholderData: (prev) => prev,
    });
    const rows = segData?.items ?? [];
    const total = segData?.totalItems ?? 0;

    const dormColor = (d: number) => d <= 30 ? GREEN : d <= 90 ? '#b45309' : '#dc2626';
    const dormBg = (d: number) => d <= 30 ? alpha(GREEN, 0.1) : d <= 90 ? alpha(AMBER, 0.1) : alpha(RED, 0.1);

    return (
        <Box>
            <TableContainer sx={{ borderRadius: '14px', border: `1px solid ${BORDER}`, maxHeight: 520 }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow sx={{ '& th': { bgcolor: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', py: 2, borderColor: BORDER } }}>
                            <TableCell width={40}>#</TableCell>
                            <TableCell>Khách hàng</TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>SĐT</TableCell>
                            <TableCell align="center">Số đơn</TableCell>
                            <TableCell align="right">Tổng doanh thu</TableCell>
                            <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>TB/đơn</TableCell>
                            <TableCell align="center">Lần cuối mua</TableCell>
                            <TableCell align="center">Chưa mua</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? Array.from({ length: 8 }).map((_, i) => (
                            <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton height={22} /></TableCell>)}</TableRow>
                        )) : rows.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><Typography sx={{ fontSize: 15, fontWeight: 600, color: '#94a3b8' }}>Không có dữ liệu</Typography></TableCell></TableRow>
                        ) : rows.map((c, i) => (
                            <Tooltip key={c.id} title="Nhấn để xem chi tiết" placement="left" arrow>
                                <TableRow onClick={() => onViewCustomer(c as SegmentCustomerDTO)} sx={{ cursor: 'pointer', bgcolor: i % 2 === 0 ? '#fff' : '#fafcfb', '&:hover': { bgcolor: alpha(color, 0.06) }, '& td': { borderColor: '#f1f5f9', py: 1.5 }, transition: 'background 0.12s' }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#94a3b8', fontSize: 13 }}>{page * pageSize + i + 1}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{ width: 34, height: 34, borderRadius: '10px', flexShrink: 0, bgcolor: alpha(color, 0.14), color, fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {c.name.charAt(0).toUpperCase()}
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#1e293b', lineHeight: 1.2 }}>{c.name}</Typography>
                                                <Typography sx={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{c.customerCode}</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 14, color: '#64748b', display: { xs: 'none', sm: 'table-cell' } }}>{c.phone || '—'}</TableCell>
                                    <TableCell align="center">
                                        <Chip label={c.totalOrders} size="small" sx={{ bgcolor: alpha(color, 0.1), color, fontWeight: 800, fontSize: 12, height: 24, border: `1px solid ${alpha(color, 0.2)}` }} />
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', fontSize: 14, whiteSpace: 'nowrap' }}>{VND(c.totalRevenue)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 13, color: '#475569', whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>{VND(c.avgOrderValue)}</TableCell>
                                    <TableCell align="center" sx={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                                        {c.lastOrderAt ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(c.lastOrderAt)) : '—'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip label={c.daysSinceLastOrder >= 0 ? `${c.daysSinceLastOrder} ngày` : '—'} size="small"
                                            sx={{ bgcolor: dormBg(c.daysSinceLastOrder), color: dormColor(c.daysSinceLastOrder), fontWeight: 700, fontSize: 12, height: 24, border: `1px solid ${alpha(dormColor(c.daysSinceLastOrder), 0.25)}` }} />
                                    </TableCell>
                                </TableRow>
                            </Tooltip>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div" count={total} page={page} rowsPerPage={pageSize}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 20, 50]} labelRowsPerPage="Số dòng:"
                sx={{ '& .MuiTablePagination-toolbar': { minHeight: 48 }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 13, color: '#64748b' } }}
            />
        </Box>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ReturnRatePage() {
    const [months, setMonths] = useState(12);
    const [selectedCustomer, setSelectedCustomer] = useState<LoyalCustomerDTO | null>(null);
    const [selectedSegmentIdx, setSelectedSegmentIdx] = useState(0);
    const [activeTab, setActiveTab] = useState(0);

    const { data, isFetching: loading } = useQuery({
        queryKey: ['return-rate', months],
        queryFn: () => returnRateApi.getStats(months),
        placeholderData: (prev) => prev,
    });

    const freq = data?.frequencyDistribution;
    const dorm = data?.dormancySegments;
    const monthly = data?.monthlyReturnRate ?? [];
    const revenue = data?.monthlyRevenueBreakdown ?? [];
    const prod = data?.productStats;

    const totalCustomers = freq ? freq.once + freq.twoToThree + freq.fourToTen + freq.moreThanTen : 0;
    const repeatCustomers = freq ? freq.twoToThree + freq.fourToTen + freq.moreThanTen : 0;
    const repeatRate = totalCustomers > 0 ? Math.round(repeatCustomers / totalCustomers * 100) : 0;
    const avgReturnRate = monthly.length > 0
        ? Math.round(monthly.reduce((s, m) => s + m.returnRate, 0) / monthly.length * 10) / 10 : 0;
    const dormTotal = dorm
        ? dorm.active30 + dorm.dormant30To60 + dorm.dormant60To90 + dorm.dormant90Plus + dorm.neverBought : 0;
    const totalCatItems = prod?.categoryBreakdown.reduce((s, c) => s + c.itemCount, 0) ?? 0;
    const chartLabels = monthly.map(m => `${MONTHS_VI[m.month - 1]}/${String(m.year).slice(2)}`);

    const freqData = freq ? [
        { label: 'Mua 1 lần', value: freq.once, color: RED },
        { label: 'Mua 2–3 lần', value: freq.twoToThree, color: AMBER },
        { label: 'Mua 4–10 lần', value: freq.fourToTen, color: BLUE },
        { label: 'VIP >10 lần', value: freq.moreThanTen, color: GREEN },
    ] : [];
    const freqPcts = freqData.map(f => totalCustomers > 0 ? Math.round(f.value / totalCustomers * 100) : 0);

    const dormData = dorm ? [
        { label: '≤30 ngày', value: dorm.active30, color: GREEN },
        { label: '30–60 ngày', value: dorm.dormant30To60, color: BLUE },
        { label: '60–90 ngày', value: dorm.dormant60To90, color: AMBER },
        { label: '>90 ngày', value: dorm.dormant90Plus, color: RED },
        { label: 'Chưa có đơn', value: dorm.neverBought, color: '#94a3b8' },
    ] : [];

    // ── ApexCharts options ─────────────────────────────────────────────────────

    const returnBarOpts: ApexOptions = {
        chart: { type: 'bar', stacked: true, toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 800 } },
        plotOptions: { bar: { borderRadius: 5, columnWidth: '56%', borderRadiusApplication: 'end', borderRadiusWhenStacked: 'last' } },
        colors: [PURPLE, BLUE],
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.8 } },
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: { categories: chartLabels, labels: { style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } } },
        legend: { position: 'top', horizontalAlign: 'right', fontFamily: 'inherit', fontSize: '12px', markers: { size: 7 } },
        tooltip: { y: { formatter: (v: number) => `${v.toLocaleString('vi-VN')} KH` }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const revenueAreaOpts: ApexOptions = {
        chart: { type: 'area', stacked: true, toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 800 } },
        stroke: { curve: 'smooth', width: 2 },
        colors: [PURPLE, BLUE],
        fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.2, opacityFrom: 0.65, opacityTo: 0.1 } },
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: {
            categories: revenue.map(r => `${MONTHS_VI[r.month - 1]}/${String(r.year).slice(2)}`),
            labels: { style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { formatter: (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(0) + 'tr' : v.toLocaleString('vi-VN'), style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } } },
        legend: { position: 'top', horizontalAlign: 'right', fontFamily: 'inherit', fontSize: '12px', markers: { size: 7 } },
        tooltip: { y: { formatter: (v: number) => VND(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const freqRadialOpts: ApexOptions = {
        chart: { type: 'radialBar', fontFamily: 'inherit', animations: { enabled: true, speed: 900, animateGradually: { enabled: true, delay: 150 } } },
        colors: freqData.map(f => f.color),
        plotOptions: {
            radialBar: {
                startAngle: -90, endAngle: 270,
                hollow: { size: '35%', background: 'transparent' },
                track: { background: '#f1f5f9', strokeWidth: '85%', margin: 5 },
                dataLabels: { show: false },
            },
        },
        labels: freqData.map(f => f.label),
        legend: { show: false },
        tooltip: { enabled: true, y: { formatter: (v: number) => `${v}%` }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const dormBarOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 7, horizontal: true, barHeight: '52%', borderRadiusApplication: 'end', distributed: true } },
        colors: dormData.map(d => d.color),
        fill: { type: 'gradient', gradient: { shade: 'light', type: 'horizontal', shadeIntensity: 0.2, opacityFrom: 1, opacityTo: 0.8 } },
        dataLabels: {
            enabled: true,
            formatter: (v: number) => v > 0 ? v.toLocaleString('vi-VN') + ' KH' : '',
            style: { fontSize: '11px', fontFamily: 'inherit', colors: ['#fff'] },
        },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: false } } },
        xaxis: {
            categories: dormData.map(d => d.label),
            labels: { formatter: (v: string) => Number(v).toLocaleString('vi-VN'), style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '12px', colors: '#475569', fontFamily: 'inherit' } } },
        tooltip: { y: { formatter: (v: number) => `${v.toLocaleString('vi-VN')} KH`, title: { formatter: () => '' } }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const catBarOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 7, horizontal: true, barHeight: '58%', borderRadiusApplication: 'end', distributed: true } },
        colors: CAT_COLORS,
        fill: { type: 'gradient', gradient: { shade: 'light', type: 'horizontal', shadeIntensity: 0.2, opacityFrom: 1, opacityTo: 0.75 } },
        dataLabels: { enabled: false },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: false } } },
        xaxis: {
            categories: prod?.categoryBreakdown.map(c => c.category) ?? [],
            labels: { style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '12px', colors: '#475569', fontFamily: 'inherit' }, maxWidth: 140 } },
        tooltip: { y: { formatter: (v: number) => `${v.toLocaleString('vi-VN')} sản phẩm` }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    // ── Revenue chip ───────────────────────────────────────────────────────────
    const revChip = (() => {
        if (loading || revenue.length === 0) return null;
        const totalRev = revenue.reduce((s, r) => s + r.newRevenue + r.returningRevenue, 0);
        const retRev = revenue.reduce((s, r) => s + r.returningRevenue, 0);
        const pct = totalRev > 0 ? Math.round(retRev / totalRev * 100) : 0;
        return (
            <Box sx={{ display: 'flex', gap: 0.75 }}>
                <Chip size="small" label={`Quay lại: ${pct}%`} sx={{ bgcolor: alpha(PURPLE, 0.1), color: PURPLE, fontWeight: 700, fontSize: 11, height: 22 }} />
                <Chip size="small" label={`Mới: ${100 - pct}%`} sx={{ bgcolor: alpha(BLUE, 0.1), color: '#0369a1', fontWeight: 700, fontSize: 11, height: 22 }} />
            </Box>
        );
    })();

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#f8fafc', position: 'relative' }}>
            <LoadingOverlay open={loading} fullScreen />
            <PageHeader
                title="Tỉ Lệ Quay Lại"
                subtitle="Phân tích tần suất mua hàng, sản phẩm và phân khúc khách hàng"
                icon={<TrendingUp />}
                gradient="linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
                shadowColor="rgba(124,58,237,0.28)"
                actions={
                    <TextField select size="small" value={months} onChange={e => setMonths(Number(e.target.value))} label="Khoảng thời gian"
                        sx={{ minWidth: 170, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#fff', '&.Mui-focused fieldset': { borderColor: PURPLE } }, '& label.Mui-focused': { color: PURPLE } }}
                    >
                        {MONTH_OPTIONS.map(m => <MenuItem key={m} value={m}>{m} tháng gần nhất</MenuItem>)}
                    </TextField>
                }
            />

            {/* ── Hero card ─────────────────────────────────────────────────── */}
            <Paper elevation={0} sx={{
                p: { xs: 2.5, md: 3.5 }, mb: 3, borderRadius: '28px', overflow: 'hidden', position: 'relative',
                background: 'linear-gradient(135deg, #3b0764 0%, #6d28d9 45%, #a855f7 100%)',
            }}>
                <Box sx={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
                <Box sx={{ position: 'absolute', bottom: -80, left: 60, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
                <Box sx={{ position: 'absolute', top: 30, right: 180, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />

                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 3 }}>
                    <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '1.2px', mb: 1 }}>
                            Trung bình {months} tháng gần nhất
                        </Typography>
                        {loading
                            ? <Skeleton width={180} height={88} sx={{ bgcolor: 'rgba(255,255,255,0.12)', borderRadius: '12px' }} />
                            : (
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                    <Typography sx={{ fontSize: { xs: 72, md: 96 }, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-4px' }}>
                                        {avgReturnRate}
                                    </Typography>
                                    <Typography sx={{ fontSize: { xs: 32, md: 40 }, fontWeight: 700, color: 'rgba(255,255,255,0.75)', lineHeight: 1 }}>%</Typography>
                                </Box>
                            )
                        }
                        <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>khách hàng quay lại mua hàng</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: { xs: 3, md: 5 }, flexWrap: 'wrap' }}>
                        {[
                            { label: 'KH quay lại', value: loading ? '—' : repeatCustomers.toLocaleString('vi-VN'), highlight: false },
                            { label: 'Tỉ lệ', value: loading ? '—' : `${repeatRate}%`, highlight: false },
                            { label: 'Chu kỳ mua', value: loading ? '—' : `${data?.avgDaysBetweenOrders ?? 0} ngày`, highlight: false },
                            { label: 'Nguy cơ mất', value: loading ? '—' : (data?.atRiskCustomers ?? 0).toLocaleString('vi-VN'), highlight: true },
                        ].map(item => (
                            <Box key={item.label} sx={{ textAlign: 'center' }}>
                                <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 900, color: item.highlight ? '#fde68a' : '#fff', lineHeight: 1 }}>
                                    {item.value}
                                </Typography>
                                <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', mt: 0.5 }}>{item.label}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {!loading && data && data.avgTimeToSecondPurchase > 0 && (
                    <Box sx={{ position: 'relative', mt: 2.5, pt: 2.5, borderTop: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Schedule sx={{ color: '#fde68a', fontSize: 18, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                            Trung bình{' '}
                            <Box component="span" sx={{ fontSize: 20, fontWeight: 900, color: '#fde68a' }}>{data.avgTimeToSecondPurchase}</Box>
                            {' '}ngày để khách quay lại mua lần thứ 2
                            <Box component="span" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 400, fontSize: 13 }}> — tập trung remarketing trong khung này</Box>
                        </Typography>
                    </Box>
                )}
            </Paper>

            {/* ── Customer KPIs ─────────────────────────────────────────────── */}
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.7px', mb: 1.5 }}>Khách hàng</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3,1fr)', lg: 'repeat(6,1fr)' }, gap: 1.5, mb: 3 }}>
                {[
                    { label: 'Tỉ lệ quay lại TB', color: PURPLE, icon: <Repeat />, value: `${avgReturnRate}%`, sub: `${months} tháng` },
                    { label: 'KH mua ≥ 2 lần', color: GREEN, icon: <People />, value: repeatCustomers.toLocaleString('vi-VN'), sub: `${repeatRate}% tổng KH` },
                    { label: 'Hoạt động (30 ngày)', color: BLUE, icon: <TrendingUp />, value: (dorm?.active30 ?? 0).toLocaleString('vi-VN'), sub: dormTotal > 0 ? `${Math.round((dorm!.active30 / dormTotal) * 100)}% tổng KH` : '' },
                    { label: 'Ngủ đông (>90 ngày)', color: RED, icon: <AccessTime />, value: (dorm?.dormant90Plus ?? 0).toLocaleString('vi-VN'), sub: dormTotal > 0 ? `${Math.round((dorm!.dormant90Plus / dormTotal) * 100)}% tổng KH` : '' },
                    { label: 'Chu kỳ mua TB', color: AMBER, icon: <Schedule />, value: data ? `${data.avgDaysBetweenOrders} ngày` : '—', sub: 'Giữa 2 đơn liên tiếp' },
                    { label: 'KH nguy cơ mất', color: '#dc2626', icon: <Warning />, value: (data?.atRiskCustomers ?? 0).toLocaleString('vi-VN'), sub: '≥2 đơn, chưa mua 60-180 ngày' },
                ].map(c => <StatCard key={c.label} {...c} loading={loading} />)}
            </Box>

            {/* ── Product KPIs ──────────────────────────────────────────────── */}
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.7px', mb: 1.5, mt: 1 }}>Sản phẩm ({months} tháng)</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3,1fr)', lg: 'repeat(6,1fr)' }, gap: 1.5, mb: 3 }}>
                {[
                    { label: 'Tổng SP bán ra', color: PURPLE, icon: <Inventory2 />, value: (prod?.totalItemsSold ?? 0).toLocaleString('vi-VN'), sub: `${months} tháng gần nhất` },
                    { label: 'Doanh thu từ SP', color: GREEN, icon: <TrendingUp />, value: prod ? VND(prod.totalProductRevenue) : '—', sub: 'Tổng giá trị order items' },
                    { label: 'TB sản phẩm/đơn', color: BLUE, icon: <BarChartIcon />, value: prod ? `${prod.avgItemsPerOrder}` : '—', sub: 'Số SP trung bình mỗi đơn' },
                    { label: 'Số danh mục', color: AMBER, icon: <Category />, value: (prod?.uniqueCategories ?? 0).toLocaleString('vi-VN'), sub: 'Danh mục sản phẩm' },
                    { label: 'Danh mục hot nhất', color: PINK, icon: <StarBorder />, value: prod?.topCategory ?? '—', sub: prod ? `${prod.topCategoryCount.toLocaleString('vi-VN')} SP` : '' },
                    { label: 'Tỉ lệ DM hot', color: TEAL, icon: <LocalFireDepartment />, value: prod && totalCatItems > 0 ? `${Math.round(prod.topCategoryCount / totalCatItems * 100)}%` : '—', sub: `${prod?.topCategory ?? ''} / tổng SP` },
                ].map(c => <StatCard key={c.label} {...c} loading={loading} />)}
            </Box>

            {/* ── Charts row 1: stacked bar + area ─────────────────────────── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <ChartCard title="KH mới vs KH quay lại theo tháng" subtitle="Phân loại khách mua hàng từng tháng" loading={loading} height={300}
                    action={
                        <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 200 }}>
                            {monthly.slice(-4).map(m => (
                                <Chip key={`${m.year}-${m.month}`}
                                    label={`${MONTHS_VI[m.month - 1]}/${String(m.year).slice(2)}: ${m.returnRate}%`} size="small"
                                    sx={{ bgcolor: m.returnRate >= 50 ? alpha(GREEN, 0.1) : m.returnRate >= 30 ? alpha(AMBER, 0.1) : alpha(RED, 0.1), color: m.returnRate >= 50 ? GREEN : m.returnRate >= 30 ? '#b45309' : '#dc2626', fontWeight: 700, fontSize: 10, height: 20 }} />
                            ))}
                        </Box>
                    }
                >
                    {monthly.length > 0
                        ? <ReactApexChart type="bar" height={300}
                            series={[
                                { name: 'Quay lại', data: monthly.map(m => m.returningCustomers) },
                                { name: 'KH mới', data: monthly.map(m => m.newCustomers) },
                            ]}
                            options={returnBarOpts} />
                        : <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</Typography></Box>
                    }
                </ChartCard>

                <ChartCard title="Doanh thu KH mới vs KH quay lại" subtitle="Tỉ trọng đóng góp doanh thu theo tháng" loading={loading} height={300} action={revChip ?? undefined}>
                    {revenue.length > 0
                        ? <ReactApexChart type="area" height={300}
                            series={[
                                { name: 'KH quay lại', data: revenue.map(r => Math.round(r.returningRevenue)) },
                                { name: 'KH mới', data: revenue.map(r => Math.round(r.newRevenue)) },
                            ]}
                            options={revenueAreaOpts} />
                        : <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</Typography></Box>
                    }
                </ChartCard>
            </Box>

            {/* ── Charts row 2: radial freq + dormancy bar ─────────────────── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <ChartCard title="Phân bố tần suất mua hàng" subtitle="% KH theo số lần đặt hàng" loading={loading} height={280}>
                    {freq && totalCustomers > 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                            <Box sx={{ flexShrink: 0, width: 200 }}>
                                <ReactApexChart type="radialBar" height={280} series={freqPcts} options={freqRadialOpts} />
                            </Box>
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.8, pr: 1.5 }}>
                                {freqData.map((f, i) => (
                                    <Box key={f.label}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: f.color, flexShrink: 0 }} />
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{f.label}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>{f.value.toLocaleString('vi-VN')}</Typography>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: f.color, minWidth: 34, textAlign: 'right' }}>{freqPcts[i]}%</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 6, borderRadius: '3px', bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                                            <Box sx={{ height: '100%', width: `${freqPcts[i]}%`, bgcolor: f.color, borderRadius: '3px', transition: 'width 0.7s ease' }} />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    ) : <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</Typography></Box>}
                </ChartCard>

                <ChartCard title="Phân khúc theo thời gian chưa quay lại" subtitle="Mức độ hoạt động của tổng khách hàng" loading={loading} height={280}>
                    {dorm && dormTotal > 0
                        ? <ReactApexChart type="bar" height={280}
                            series={[{ name: 'Khách hàng', data: dormData.map(d => d.value) }]}
                            options={dormBarOpts} />
                        : <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</Typography></Box>
                    }
                </ChartCard>
            </Box>

            {/* ── Category chart ────────────────────────────────────────────── */}
            {prod && prod.categoryBreakdown.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <ChartCard title="Phân bổ danh mục sản phẩm" subtitle={`Sản phẩm bán chạy theo danh mục trong ${months} tháng`} loading={loading} height={Math.max(220, prod.categoryBreakdown.length * 48)}>
                        <ReactApexChart type="bar" height={Math.max(220, prod.categoryBreakdown.length * 48)}
                            series={[{ name: 'Sản phẩm', data: prod.categoryBreakdown.map(c => c.itemCount) }]}
                            options={catBarOpts} />
                    </ChartCard>
                </Box>
            )}

            {/* ── Segment tables ────────────────────────────────────────────── */}
            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                <Box sx={{ borderBottom: `1px solid ${BORDER}`, px: 3, bgcolor: '#fff' }}>
                    <Box sx={{ pt: 2.5, pb: 0 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Danh sách khách hàng theo phân khúc</Typography>
                        <Typography sx={{ fontSize: 13, color: '#94a3b8', mt: 0.4 }}>Nhấn vào hàng để xem chi tiết khách hàng</Typography>
                    </Box>
                    <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
                        sx={{
                            mt: 1.5,
                            '& .MuiTab-root': { fontSize: 13, fontWeight: 700, textTransform: 'none', minWidth: 'auto', px: 2.5, py: 1.5 },
                            '& .Mui-selected': { color: `${SEGMENTS[activeTab].color} !important` },
                            '& .MuiTabs-indicator': { bgcolor: SEGMENTS[activeTab].color, height: 3, borderRadius: '2px 2px 0 0' },
                        }}
                    >
                        {SEGMENTS.map((seg, i) => (
                            <Tab key={seg.key}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: i === activeTab ? seg.color : '#cbd5e1', transition: 'all 0.2s' }} />
                                        {seg.label}
                                    </Box>
                                }
                            />
                        ))}
                    </Tabs>
                </Box>
                <Box sx={{ px: 3, py: 1.5, bgcolor: alpha(SEGMENTS[activeTab].color, 0.04), borderBottom: `2px solid ${alpha(SEGMENTS[activeTab].color, 0.15)}` }}>
                    <Typography sx={{ fontSize: 13, color: SEGMENTS[activeTab].color, fontWeight: 600 }}>{SEGMENTS[activeTab].desc}</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                    {SEGMENTS.map((seg, i) => (
                        <Box key={seg.key} sx={{ display: activeTab === i ? 'block' : 'none' }}>
                            <SegmentTable segment={seg.key} color={seg.color}
                                onViewCustomer={c => {
                                    setSelectedSegmentIdx(i);
                                    setSelectedCustomer({ ...c, orderCount: c.totalOrders, avgDaysBetweenOrders: 0 });
                                }} />
                        </Box>
                    ))}
                </Box>
            </Paper>

            <LoyalCustomerDetailDialog
                customer={selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
                badge={SEGMENTS[selectedSegmentIdx].badge}
                badgeColor={SEGMENTS[selectedSegmentIdx].badgeColor}
            />
        </Box>
    );
}
