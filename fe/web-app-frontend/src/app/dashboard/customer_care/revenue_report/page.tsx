'use client';

import { useState } from 'react';
import React from 'react';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { useQuery } from '@tanstack/react-query';
import {
    Box, Paper, TextField, Typography, MenuItem,
    Table, TableBody, TableCell, TableHead, TableRow,
    Chip, Avatar, Divider, Skeleton, alpha,
} from '@mui/material';
import { InsightsRounded } from '@mui/icons-material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CakeIcon from '@mui/icons-material/Cake';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FilterListIcon from '@mui/icons-material/FilterList';
import MessageSharpIcon from '@mui/icons-material/MessageSharp';
import PageHeader from '@/components/common/PageHeader';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';
import { ordersApi } from '@/features/orders/api/orders.api';
import { messageReportApi } from '@/features/orders/api/messageReport.api';
import LoyalCustomerDetailDialog from '@/features/customer/components/LoyalCustomerDetailDialog';
import { LoyalCustomerDTO } from '@/features/customer/api/returnRate.api';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const GREEN = '#086839';
const BLUE = '#0ea5e9';
const PURPLE = '#8b5cf6';
const RED = '#ef4444';
const PINK = '#ec4899';
const AMBER = '#f59e0b';
const TEAL = '#10b981';
const INDIGO = '#6366f1';
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';
const CAT_COLORS = [GREEN, BLUE, PURPLE, AMBER, RED, PINK, TEAL, INDIGO];

const fmt = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v ?? 0);
const fmtShort = (v: number) => v >= 1_000_000_000 ? (Math.floor(v / 100_000_000) / 10).toFixed(1) + 'tỷ' : v >= 1_000_000 ? (Math.floor(v / 100_000) / 10).toFixed(1) + 'tr' : Math.round(v).toLocaleString('vi-VN') + 'đ';
const fmtD = (d: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' }).format(new Date(d));

// ── Sub-components ─────────────────────────────────────────────────────────────

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
                    {loading ? <Skeleton width="75%" height={16} sx={{ mt: 0.4 }} />
                        : sub && <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: 0.5 }}>{sub}</Typography>}
                </Box>
            </Box>
        </Paper>
    );
}

function ChartCard({ title, subtitle, children, loading, height = 300, action }: {
    title: string; subtitle?: string; children: React.ReactNode; loading?: boolean; height?: number; action?: React.ReactNode;
}) {
    return (
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2.5, pt: 2.5, pb: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexShrink: 0 }}>
                <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{title}</Typography>
                    {subtitle && <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.3 }}>{subtitle}</Typography>}
                </Box>
                {action && <Box sx={{ flexShrink: 0, pt: 0.3 }}>{action}</Box>}
            </Box>
            <Box sx={{ px: 1, pt: 0.5, pb: 0.5, flex: 1, minHeight: 0 }}>
                {loading ? <Skeleton variant="rectangular" height={height} sx={{ borderRadius: '12px', mx: 1.5, mb: 1.5, mt: 1 }} /> : children}
            </Box>
        </Paper>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [month, setMonth] = useState<number | ''>(new Date().getMonth() + 1);
    const [year, setYear] = useState('');
    const [source, setSource] = useState('');
    const [branchId, setBranchId] = useState('');
    const [revenueGroupBy, setRevenueGroupBy] = useState<'day' | 'week' | 'month'>('day');
    const [msgType, setMsgType] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<LoyalCustomerDTO | null>(null);

    const { data: branches = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => { const r = await ordersApi.getBranches(); return r.content ?? r ?? []; },
        staleTime: 5 * 60 * 1000,
    });

    const { data: dashboard, isFetching: loading } = useQuery({
        queryKey: ['dashboard-online', fromDate, toDate, month, year, source, branchId, revenueGroupBy],
        queryFn: async () => {
            try {
                const res = await dashboardApi.getDashboardForOnline({
                    fromDate: fromDate || undefined, toDate: toDate || undefined,
                    month: month ? Number(month) : undefined, year: year ? Number(year) : undefined,
                    source: source || undefined, branchId: branchId ? Number(branchId) : undefined,
                    revenueGroupBy,
                });
                return res.content;
            } catch (err: any) {
                toast.error(err?.response?.data?.Message ?? 'Không tải được dashboard');
                return null;
            }
        },
        placeholderData: (prev) => prev,
    });

    const { data: msgRows = [] } = useQuery<any[]>({
        queryKey: ['msg-stats', month, year, msgType],
        queryFn: async () => {
            try {
                const res = await messageReportApi.getList({
                    month: month ? Number(month) : undefined,
                    year: year ? Number(year) : undefined,
                    type: msgType || undefined,
                });
                return (res.content ?? []) as any[];
            } catch { return []; }
        },
        staleTime: 2 * 60 * 1000,
    });

    const hasFilter = fromDate || toDate || month || year || source || branchId;
    const revenueData: { period: string; revenue: number }[] = dashboard?.revenueByMonth ?? [];
    const sourceData: { name: string; value: number }[] = dashboard?.customersBySource ?? [];
    const branchData: { name: string; value: number }[] = dashboard?.revenueByBranch ?? [];
    const statusData: { name: string; value: number }[] = dashboard?.ordersByStatus ?? [];

    // ── Message stats ──────────────────────────────────────────────────────────
    const msgDates = [...new Set(msgRows.map(r => r.reportDate))].sort();
    const zaloSeries = msgDates.map(d => msgRows.find(r => r.reportDate === d && r.type === 'Zalo')?.count ?? 0);
    const fbSeries = msgDates.map(d => msgRows.find(r => r.reportDate === d && r.type === 'Facebook')?.count ?? 0);
    const otherSeries = msgDates.map(d => msgRows.find(r => r.reportDate === d && r.type === 'Khác')?.count ?? 0);
    const zTotal = msgRows.filter(r => r.type === 'Zalo').reduce((s, r) => s + r.count, 0);
    const fbTotal = msgRows.filter(r => r.type === 'Facebook').reduce((s, r) => s + r.count, 0);
    const otherTotal = msgRows.filter(r => r.type === 'Khác').reduce((s, r) => s + r.count, 0);

    // ── ApexCharts options ─────────────────────────────────────────────────────

    const revenueTrendOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 900 } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: revenueData.length > 20 ? '82%' : '52%', borderRadiusApplication: 'end' } },
        colors: [GREEN],
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical', shadeIntensity: 0.35, opacityFrom: 1, opacityTo: 0.7 } },
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: {
            categories: revenueData.map(x => x.period),
            labels: { style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' }, rotate: revenueData.length > 20 ? -35 : 0, hideOverlappingLabels: true },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { formatter: (v: number) => fmtShort(v), style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } } },
        legend: { show: false },
        tooltip: { intersect: false, y: { formatter: (v: number) => fmt(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const msgSeries = [
        ...(!msgType || msgType === 'Zalo' ? [{ name: 'Zalo', data: zaloSeries, color: '#0068FF' }] : []),
        ...(!msgType || msgType === 'Facebook' ? [{ name: 'Facebook', data: fbSeries, color: '#4267B2' }] : []),
        ...(!msgType || msgType === 'Khác' ? [{ name: 'Khác', data: otherSeries, color: AMBER }] : []),
    ];
    const msgOpts: ApexOptions = {
        chart: { type: 'bar', stacked: true, toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 5, columnWidth: msgDates.length > 20 ? '82%' : '55%', borderRadiusApplication: 'end', borderRadiusWhenStacked: 'last' } },
        colors: ['#0068FF', '#4267B2', AMBER],
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: {
            categories: msgDates.map(fmtD),
            labels: { style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' }, rotate: msgDates.length > 20 ? -35 : 0, hideOverlappingLabels: true },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } } },
        legend: { position: 'top', fontSize: '12px', fontFamily: 'inherit', markers: { size: 8 } },
        tooltip: { y: { formatter: (v: number) => `${v.toLocaleString('vi-VN')} tin` }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const sourceBarOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 7, horizontal: true, barHeight: '52%', borderRadiusApplication: 'end', distributed: true } },
        colors: CAT_COLORS.slice(0).reverse(),
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.8 } },
        dataLabels: {
            enabled: true,
            formatter: (v: number) => v > 0 ? v.toLocaleString('vi-VN') + ' KH' : '',
            style: { fontSize: '11px', fontFamily: 'inherit', colors: ['#fff'] },
        },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: false } } },
        xaxis: {
            categories: sourceData.map(x => x.name),
            labels: { formatter: (v: string) => Number(v).toLocaleString('vi-VN'), style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '12px', colors: '#475569', fontFamily: 'inherit' }, maxWidth: 150 } },
        tooltip: { y: { formatter: (v: number) => `${v.toLocaleString('vi-VN')} khách` }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const branchBarOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 7, columnWidth: branchData.length <= 4 ? '40%' : '55%', borderRadiusApplication: 'end', distributed: true } },
        colors: [GREEN, BLUE, PURPLE, AMBER, RED, PINK],
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical', shadeIntensity: 0.35, opacityFrom: 1, opacityTo: 0.75 } },
        dataLabels: {
            enabled: true,
            formatter: (v: number) => v > 0 ? fmtShort(v) : '',
            style: { fontSize: '11px', fontFamily: 'inherit', colors: ['#1e293b'] },
            offsetY: -6,
        },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: {
            categories: branchData.map(x => x.name),
            labels: { style: { fontSize: '12px', colors: '#475569', fontFamily: 'inherit' } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { formatter: (v: number) => fmtShort(v), style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } } },
        tooltip: { y: { formatter: (v: number) => fmt(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const STATUS_COLOR_MAP: Record<string, string> = {
        'đang giao dịch': AMBER, 'giao dịch': AMBER, 'đang xử lý': AMBER,
        'hoàn trả': RED, 'trả hàng': RED,
        'hoàn thành': TEAL, 'hoàn tất': TEAL, 'thành công': TEAL,
        'hủy': '#94a3b8', 'đã hủy': '#94a3b8',
        'chờ xử lý': BLUE, 'chờ thanh toán': BLUE,
        'đang giao': PURPLE, 'đang giao hàng': PURPLE,
    };
    const statusColors = statusData.map(x => STATUS_COLOR_MAP[x.name?.toLowerCase()?.trim()] ?? INDIGO);
    const donutOpts: ApexOptions = {
        chart: { type: 'donut', fontFamily: 'inherit', animations: { enabled: true, speed: 900, animateGradually: { enabled: true, delay: 100 } } },
        colors: statusColors,
        labels: statusData.map(x => x.name),
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical', shadeIntensity: 0.35, opacityFrom: 1, opacityTo: 0.8 } },
        plotOptions: {
            pie: {
                donut: {
                    size: '62%',
                    labels: {
                        show: true,
                        total: {
                            show: true, label: 'Tổng đơn', fontSize: '11px', color: '#94a3b8', fontWeight: 600,
                            formatter: w => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toLocaleString('vi-VN'),
                        },
                        value: { fontSize: '18px', fontWeight: 800, color: '#1e293b', formatter: (v: string) => Number(v).toLocaleString('vi-VN') },
                    },
                },
            },
        },
        dataLabels: { enabled: false },
        stroke: { show: false },
        legend: { position: 'bottom', fontSize: '12px', fontFamily: 'inherit', markers: { size: 8 } },
        tooltip: { y: { formatter: (v: number) => `${v.toLocaleString('vi-VN')} đơn` }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', p: { xs: 2, md: 4 }, position: 'relative' }}>
            <LoadingOverlay open={loading} fullScreen />
            <PageHeader
                title="Tổng Quan CSKH"
                subtitle="Báo cáo kinh doanh tổng quan theo thời gian thực"
                icon={<InsightsRounded />}
                gradient="linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%)"
                shadowColor="rgba(14,165,233,0.28)"
            />

            {/* ── Filter bar ───────────────────────────────────────────────── */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: CARD_RADIUS, mb: 3, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(14,165,233,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <FilterListIcon sx={{ color: BLUE, fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Bộ lọc</Typography>
                    {hasFilter && <Chip label="Đang lọc" size="small" sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: 11, height: 20, border: '1px solid #bae6fd' }} />}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(8,1fr)' }, gap: 2 }}>
                    {[
                        { label: 'Từ ngày', type: 'date', value: fromDate, set: setFromDate },
                        { label: 'Đến ngày', type: 'date', value: toDate, set: setToDate },
                    ].map(f => (
                        <TextField key={f.label} size="small" type={f.type} label={f.label} value={f.value}
                            onChange={e => f.set(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth sx={fieldSx} />
                    ))}
                    <TextField select size="small" label="Biểu đồ DT" value={revenueGroupBy}
                        onChange={e => setRevenueGroupBy(e.target.value as 'day' | 'week' | 'month')} fullWidth sx={fieldSx}>
                        <MenuItem value="day">Theo ngày</MenuItem>
                        <MenuItem value="week">Theo tuần</MenuItem>
                        <MenuItem value="month">Theo tháng</MenuItem>
                    </TextField>
                    <TextField select size="small" label="Tháng" value={month}
                        onChange={e => setMonth(e.target.value === '' ? '' : Number(e.target.value))} fullWidth sx={fieldSx}>
                        <MenuItem value="">Tất cả tháng</MenuItem>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <MenuItem key={m} value={m}>Tháng {m}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Năm" value={year} onChange={e => setYear(e.target.value)} fullWidth sx={fieldSx}>
                        <MenuItem value="">Tất cả năm</MenuItem>
                        {[2024, 2025, 2026, 2027].map(y => <MenuItem key={y} value={y}>Năm {y}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Nguồn khách" value={source} onChange={e => setSource(e.target.value)} fullWidth sx={fieldSx}>
                        <MenuItem value="">Tất cả nguồn</MenuItem>
                        {['Zalo', 'Facebook', 'GrabMart', 'ShopeeFood', 'ShopeeMart', 'Livestream', 'Pos', 'Khách đặt tại quầy', 'Khác'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Chi nhánh" value={branchId} onChange={e => setBranchId(e.target.value)} fullWidth sx={fieldSx}>
                        <MenuItem value="">Tất cả chi nhánh</MenuItem>
                        {branches.map((b: any) => <MenuItem key={b.id ?? b.branchId} value={b.id ?? b.branchId}>{b.name ?? b.branchName}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Loại tin nhắn" value={msgType} onChange={e => setMsgType(e.target.value)} fullWidth sx={msgFieldSx}>
                        <MenuItem value="">Tất cả tin nhắn</MenuItem>
                        <MenuItem value="Zalo">Zalo</MenuItem>
                        <MenuItem value="Facebook">Facebook</MenuItem>
                        <MenuItem value="Khác">Khác</MenuItem>
                    </TextField>
                </Box>
            </Paper>

            {/* ── Stat cards ───────────────────────────────────────────────── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4,1fr)' }, gap: 1.5, mb: 3 }}>
                <StatCard label="Tổng đơn hàng" value={dashboard?.totalOrders ?? 0} sub="Đơn trong kỳ" icon={<ShoppingCartIcon />} color={RED} loading={loading} />
                <StatCard label="Tổng khách hàng" value={dashboard?.totalCustomers ?? 0} sub="Khách trong kỳ" icon={<PeopleAltIcon />} color={BLUE} loading={loading} />
                <StatCard label="Tổng doanh thu" value={dashboard ? fmt(dashboard.totalRevenue) : '—'} sub="Doanh thu gộp" icon={<MonetizationOnIcon />} color={GREEN} loading={loading} />
                <StatCard label="Trung bình / đơn" value={dashboard ? fmt(dashboard.averageOrderValue) : '—'} sub="Giá trị trung bình" icon={<TrendingUpIcon />} color={PURPLE} loading={loading} />
            </Box>

            {/* ── Revenue trend (full width) ────────────────────────────────── */}
            <Box sx={{ mb: 2 }}>
                <ChartCard
                    title={revenueGroupBy === 'day' ? 'Doanh thu theo ngày' : revenueGroupBy === 'week' ? 'Doanh thu theo tuần' : 'Doanh thu theo tháng'}
                    subtitle="Xu hướng doanh thu trong kỳ"
                    loading={loading} height={300}
                    action={revenueData.length > 0 ? (
                        <Chip size="small" label={`Tổng: ${fmtShort(revenueData.reduce((s, x) => s + x.revenue, 0))}`}
                            sx={{ bgcolor: alpha(GREEN, 0.1), color: GREEN, fontWeight: 700, fontSize: 12, height: 24, border: `1px solid ${alpha(GREEN, 0.2)}` }} />
                    ) : undefined}
                >
                    {revenueData.length > 0
                        ? <ReactApexChart type="bar" height={300}
                            series={[{ name: 'Doanh thu', data: revenueData.map(x => x.revenue) }]}
                            options={revenueTrendOpts} />
                        : <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</Typography></Box>
                    }
                </ChartCard>
            </Box>

            {/* ── 6 khung: grid 2 cột, 6 item flow tự động thành 3 hàng ─────── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.3fr 1fr' }, gap: 2 }}>

                {/* Hàng 1 trái: Message Stats */}
                <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', p: 2.5, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #bfdbfe, #0068FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,104,255,0.3)' }}>
                                <MessageSharpIcon sx={{ color: '#fff', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>Thống kê tin nhắn Zalo / Facebook</Typography>
                                <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Số lượng tin nhắn theo ngày</Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {[
                                { label: 'Zalo', value: zTotal, color: '#0068FF', bg: alpha('#0068FF', 0.08) },
                                { label: 'Facebook', value: fbTotal, color: '#4267B2', bg: alpha('#4267B2', 0.08) },
                                ...(otherTotal > 0 ? [{ label: 'Khác', value: otherTotal, color: AMBER, bg: alpha(AMBER, 0.08) }] : []),
                                { label: 'Tổng', value: zTotal + fbTotal + otherTotal, color: GREEN, bg: '#dcfce7' },
                            ].map(({ label, value, color, bg }) => (
                                <Box key={label} sx={{ px: 1.5, py: 0.5, borderRadius: '10px', bgcolor: bg, border: `1px solid ${color}22` }}>
                                    <Typography component="span" sx={{ fontSize: 11, color, fontWeight: 700 }}>{label}: </Typography>
                                    <Typography component="span" sx={{ fontSize: 13, color, fontWeight: 800 }}>{value.toLocaleString('vi-VN')}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                    {msgRows.length === 0
                        ? <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu tin nhắn trong kỳ này</Typography></Box>
                        : <ReactApexChart type="bar" height={240} series={msgSeries} options={msgOpts} />
                    }
                </Paper>

                {/* Hàng 1 phải: Donut */}
                <ChartCard title="Phân bổ trạng thái đơn hàng" loading={loading} height={310}>
                    {statusData.length > 0
                        ? <ReactApexChart type="donut" height={310} series={statusData.map(x => x.value)} options={donutOpts} />
                        : <Box sx={{ height: 310, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</Typography></Box>
                    }
                </ChartCard>

                {/* Hàng 2 trái: Source */}
                <ChartCard title="Khách hàng từ các nguồn" subtitle="Phân bổ theo kênh mua hàng" loading={loading} height={Math.max(240, sourceData.length * 52)}>
                    {sourceData.length > 0
                        ? <ReactApexChart type="bar" height={Math.max(240, sourceData.length * 52)}
                            series={[{ name: 'Khách hàng', data: sourceData.map(x => x.value) }]}
                            options={sourceBarOpts} />
                        : <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</Typography></Box>
                    }
                </ChartCard>

                {/* Hàng 2 phải: Branch */}
                <ChartCard title="Doanh thu theo chi nhánh" subtitle="So sánh hiệu suất từng chi nhánh" loading={loading} height={280}>
                    {branchData.length > 0
                        ? <ReactApexChart type="bar" height={280}
                            series={[{ name: 'Doanh thu', data: branchData.map(x => x.value) }]}
                            options={branchBarOpts} />
                        : <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</Typography></Box>
                    }
                </ChartCard>

                {/* Hàng 3 trái: Top Customers */}
                <Paper elevation={0} sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: CARD_RADIUS, p: 3, boxShadow: '0 2px 20px rgba(0,0,0,0.06)', height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #fde68a, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
                            <EmojiEventsIcon sx={{ color: '#fff', fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>Vinh danh khách hàng</Typography>
                            <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Top doanh thu cao nhất</Typography>
                        </Box>
                    </Box>
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {['#', 'Khách hàng', 'SĐT', 'Đơn', 'Chi tiêu'].map((h, i) => (
                                        <TableCell key={h} align={i >= 3 ? 'right' : 'left'}
                                            sx={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderColor: '#f1f5f9', py: 1.2 }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(dashboard?.topCustomersByRevenue ?? []).map((item: any, idx: number) => (
                                    <TableRow key={item.customerId}
                                        onClick={() => setSelectedCustomer({ id: item.customerId, name: item.customerName, customerCode: '', phone: item.phone, orderCount: item.totalOrders, totalRevenue: item.totalRevenue, avgOrderValue: item.totalOrders > 0 ? item.totalRevenue / item.totalOrders : 0, avgDaysBetweenOrders: 0 } as LoyalCustomerDTO)}
                                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#fef9ec' }, '& td': { borderColor: '#f1f5f9', py: 1.5 }, transition: 'background 0.12s' }}>
                                        <TableCell sx={{ width: 44, fontSize: 18 }}>
                                            {idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                                                <Typography sx={{ fontWeight: 700, color: '#cbd5e1', fontSize: 14, pl: 0.5 }}>{idx + 1}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{
                                                    width: 32, height: 32, fontSize: 13, fontWeight: 800,
                                                    bgcolor: idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#fff7ed' : '#f0fdf4',
                                                    color: idx === 0 ? '#d97706' : idx === 1 ? '#64748b' : idx === 2 ? '#ea580c' : '#086839',
                                                    border: `2px solid ${idx === 0 ? '#fde68a' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#fed7aa' : '#bbf7d0'}`,
                                                }}>{item.customerName?.[0]}</Avatar>
                                                <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: 13, whiteSpace: 'nowrap' }}>{item.customerName}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ color: '#64748b', fontSize: 13 }}>{item.phone}</TableCell>
                                        <TableCell align="right">
                                            <Chip label={item.totalOrders} size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 12, height: 22, border: '1px solid #bbf7d0' }} />
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, color: '#d97706', fontSize: 13, whiteSpace: 'nowrap' }}>
                                            {fmt(item.totalRevenue)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </Paper>

                {/* Hàng 3 phải: Birthday */}
                <Paper elevation={0} sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: CARD_RADIUS, p: 3, boxShadow: '0 2px 20px rgba(0,0,0,0.06)', height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #fbcfe8, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(236,72,153,0.3)' }}>
                            <CakeIcon sx={{ color: '#fff', fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>Sinh nhật tháng này</Typography>
                            <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Khách hàng cần chúc mừng</Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {(dashboard?.birthdayCustomersThisMonth ?? []).map((item: any, idx: number) => (
                            <Box key={item.customerId}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                                    <Avatar sx={{ width: 38, height: 38, fontSize: 15, fontWeight: 800, bgcolor: '#fce7f3', color: '#db2777', border: '2px solid #fbcfe8' }}>
                                        {item.customerName?.[0]}
                                    </Avatar>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: 13, mb: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.customerName}</Typography>
                                        <Typography sx={{ color: '#94a3b8', fontSize: 12 }}>{item.phone}</Typography>
                                    </Box>
                                    <Chip label={new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(item.dayOfBirth))}
                                        size="small" sx={{ bgcolor: '#fce7f3', color: '#db2777', fontWeight: 700, fontSize: 12, border: '1px solid #fbcfe8', height: 24, flexShrink: 0 }} />
                                </Box>
                                {idx < (dashboard?.birthdayCustomersThisMonth?.length ?? 0) - 1 && <Divider sx={{ borderColor: '#f1f5f9' }} />}
                            </Box>
                        ))}
                    </Box>
                </Paper>

            </Box>

            <LoyalCustomerDetailDialog customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} badge="Top khách hàng" badgeColor="#d97706" />
        </Box>
    );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: BLUE } },
    '& label.Mui-focused': { color: BLUE },
};

const msgFieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: '#0068FF' } },
    '& label.Mui-focused': { color: '#0068FF' },
};
