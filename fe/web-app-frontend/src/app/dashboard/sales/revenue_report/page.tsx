'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Paper,
    TextField,
    Typography,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Chip,
    Avatar,
    Divider,
    Skeleton,
    alpha,
} from '@mui/material';
import { BarChart, PieChart } from '@mui/x-charts';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import PageHeader from '@/components/common/PageHeader';
import { InsightsRounded } from '@mui/icons-material';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';
import { ordersApi } from '@/features/orders/api/orders.api';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CakeIcon from '@mui/icons-material/Cake';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FilterListIcon from '@mui/icons-material/FilterList';
import LoyalCustomerDetailDialog from '@/features/customer/components/LoyalCustomerDetailDialog';
import { LoyalCustomerDTO } from '@/features/customer/api/returnRate.api';

export default function DashboardPage() {
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [month, setMonth] = useState<number | ''>(
        new Date().getMonth() + 1
    );
    const [year, setYear] = useState('');
    const [source, setSource] = useState('');
    const [branchId, setBranchId] = useState('');
    const [revenueGroupBy, setRevenueGroupBy] = useState<'day' | 'week' | 'month'>('day');

    const [selectedCustomer, setSelectedCustomer] = useState<LoyalCustomerDTO | null>(null);
    const [selectedSegmentIdx, setSelectedSegmentIdx] = useState(0);

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value ?? 0);

    const { data: branches = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const r = await ordersApi.getBranches();
            return r.content ?? r ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: dashboard, isFetching: loading } = useQuery({
        queryKey: ['dashboard-sales', fromDate, toDate, month, year, source, branchId, revenueGroupBy],
        queryFn: async () => {
            try {
                const res = await dashboardApi.getDashboardForSales({
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                    month: month ? Number(month) : undefined,
                    year: year ? Number(year) : undefined,
                    source: source || undefined,
                    branchId: branchId ? Number(branchId) : undefined,
                    revenueGroupBy,
                });
                return res.content;
            } catch (error: any) {
                toast.error(error?.response?.data?.Message ?? 'Không tải được dashboard');
                return null;
            }
        },
        placeholderData: (prev) => prev,
    });

    const hasFilter = fromDate || toDate || month || year || source || branchId || revenueGroupBy;

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#f0f7f3',
                backgroundImage: `radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)`,
                p: { xs: 2, md: 4 },
            }}
        >
            <LoadingOverlay open={loading} fullScreen text="Đang tải dashboard..." />

            <PageHeader
                title="Tổng Quan Bán Hàng"
                subtitle="Báo cáo kinh doanh tổng quan theo thời gian thực"
                icon={<InsightsRounded />}
                gradient="linear-gradient(135deg, #086839 0%, #16a34a 100%)"
                shadowColor="rgba(8,104,57,0.28)"
            />

            {/* ── Filter Bar ── */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    borderRadius: '20px',
                    mb: 3,
                    border: '1px solid #e2e8f0',
                    bgcolor: '#fff',
                    boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <FilterListIcon sx={{ color: '#086839', fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Bộ lọc</Typography>
                    {hasFilter && (
                        <Chip
                            label="Đang lọc"
                            size="small"
                            sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, height: 20, border: '1px solid #bbf7d0' }}
                        />
                    )}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(7,1fr)' }, gap: 2 }}>
                    {[
                        { label: 'Từ ngày', type: 'date', value: fromDate, onChange: setFromDate },
                        { label: 'Đến ngày', type: 'date', value: toDate, onChange: setToDate },
                    ].map(({ label, type, value, onChange }) => (
                        <TextField
                            key={label}
                            size="small"
                            type={type}
                            label={label}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                            fullWidth
                            sx={filterFieldSx}
                        />
                    ))}
                    <TextField
                        select
                        size="small"
                        label="Biểu đồ doanh thu"
                        value={revenueGroupBy}
                        onChange={(e) => setRevenueGroupBy(e.target.value as 'day' | 'week' | 'month')}
                        fullWidth
                        sx={filterFieldSx}
                    >
                        <MenuItem value="day">Theo ngày</MenuItem>
                        <MenuItem value="week">Theo tuần</MenuItem>
                        <MenuItem value="month">Theo tháng</MenuItem>
                    </TextField>
                    <TextField select size="small" label="Tháng" value={month} onChange={(e) =>
                        setMonth(
                            e.target.value === ''
                                ? ''
                                : Number(e.target.value)
                        )
                    } fullWidth sx={filterFieldSx}>
                        <MenuItem value="">Tất cả tháng</MenuItem>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <MenuItem key={m} value={m}>Tháng {m}</MenuItem>
                        ))}
                    </TextField>

                    <TextField select size="small" label="Năm" value={year} onChange={(e) => setYear(e.target.value)} fullWidth sx={filterFieldSx}>
                        <MenuItem value="">Tất cả năm</MenuItem>
                        {[2024, 2025, 2026, 2027].map((y) => (
                            <MenuItem key={y} value={y}>Năm {y}</MenuItem>
                        ))}
                    </TextField>

                    <TextField select size="small" label="Nguồn khách" value={source} onChange={(e) => setSource(e.target.value)} fullWidth sx={filterFieldSx}>
                        <MenuItem value="">Tất cả các nguồn</MenuItem>
                        {['Zalo', 'Facebook', 'GrabMart', 'ShopeeFood', 'ShopeeMart', 'Livestream', 'Pos', 'Khách đặt tại quầy', 'Khác'].map((s) => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                    </TextField>

                    <TextField select size="small" label="Chi nhánh" value={branchId} onChange={(e) => setBranchId(e.target.value)} fullWidth sx={filterFieldSx}>
                        <MenuItem value="">Tất cả chi nhánh</MenuItem>
                        {branches.map((b: any) => (
                            <MenuItem key={b.id || b.branchId} value={b.id || b.branchId}>
                                {b.name || b.branchName}
                            </MenuItem>
                        ))}
                    </TextField>

                </Box>
            </Paper>

            {dashboard && (
                <>
                    {/* ── KPI Cards ── */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4,1fr)' }, gap: 2.5, mb: 3 }}>
                        <KpiCard
                            title="Tổng đơn hàng"
                            value={dashboard.totalOrders}
                            sub="Đơn trong kỳ"
                            icon={<ShoppingCartIcon />}
                            color="#ef4444"
                        />
                        <KpiCard
                            title="Tổng khách hàng"
                            value={dashboard.totalCustomers}
                            sub="Khách trong kỳ"
                            icon={<PeopleAltIcon />}
                            color="#0ea5e9"
                        />
                        <KpiCard
                            title="Tổng doanh thu"
                            value={formatMoney(dashboard.totalRevenue)}
                            sub="Doanh thu gộp"
                            icon={<MonetizationOnIcon />}
                            color="#086839"
                        />
                        <KpiCard
                            title="Trung bình / đơn"
                            value={formatMoney(dashboard.averageOrderValue)}
                            sub="Giá trị trung bình"
                            icon={<TrendingUpIcon />}
                            color="#8b5cf6"
                        />
                    </Box>

                    {/* ── Revenue Bar Chart ── */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr' }, gap: 3, mb: 3, alignItems: 'stretch' }}>
                        <ChartCard title={revenueGroupBy === 'day' ? 'Doanh thu theo ngày' : revenueGroupBy === 'week' ? 'Doanh thu theo tuần' : 'Doanh thu theo tháng'} icon="📈">
                            <BarChart
                                height={300}
                                width={undefined}
                                colors={['#086839']}
                                borderRadius={8}
                                xAxis={[{
                                    scaleType: 'band',
                                    data: dashboard.revenueByMonth.map((x: any) => x.period),
                                    tickLabelStyle: { fontSize: 12, fill: '#64748b' },
                                }]}
                                yAxis={[{
                                    tickLabelStyle: { fontSize: 11, fill: '#94a3b8' },
                                }]}
                                series={[{
                                    data: dashboard.revenueByMonth.map((x: any) => x.revenue),
                                    label: 'Doanh thu (VNĐ)',
                                    valueFormatter: (v) => formatMoney(v ?? 0),
                                }]}
                                sx={{
                                    '.MuiChartsAxis-line': { stroke: '#e2e8f0' },
                                    '.MuiChartsAxis-tick': { stroke: '#e2e8f0' },
                                }}
                            />
                        </ChartCard>
                    </Box>

                    {/* ── Doanh thu theo loại sản phẩm ── */}
                    {dashboard.revenueByCategory?.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <ChartCard title="Doanh thu theo loại sản phẩm" icon="📦">
                                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                                    {(() => {
                                        const CAT_COLORS = ['#086839', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#10b981', '#6366f1'];
                                        const total = dashboard.revenueByCategory.reduce((s: number, c: any) => s + c.value, 0);
                                        return dashboard.revenueByCategory.map((x: any, i: number) => {
                                            const color = CAT_COLORS[i % CAT_COLORS.length];
                                            const pct = total > 0 ? ((x.value / total) * 100).toFixed(2) : '0.00';
                                            return (
                                                <Box key={x.name} sx={{ px: 1.5, py: 0.5, borderRadius: '10px', bgcolor: `${color}14`, border: `1px solid ${color}30` }}>
                                                    <Typography component="span" sx={{ fontSize: 11, color, fontWeight: 700 }}>{x.name}: </Typography>
                                                    <Typography component="span" sx={{ fontSize: 12, color, fontWeight: 800 }}>{pct}% · {formatMoney(x.value)}</Typography>
                                                </Box>
                                            );
                                        });
                                    })()}
                                </Box>
                                <BarChart
                                    height={320}
                                    borderRadius={8}
                                    xAxis={[{
                                        scaleType: 'band',
                                        data: dashboard.revenueByCategory.map((x: any) => x.name),
                                        valueFormatter: (name: string, ctx: any) =>
                                            ctx?.location === 'tick' && name.length > 12
                                                ? name.slice(0, 12) + '…'
                                                : name,
                                        tickLabelStyle: { fontSize: 10, fill: '#94a3b8' },
                                    }]}
                                    yAxis={[{ tickLabelStyle: { fontSize: 11, fill: '#94a3b8' } }]}
                                    series={[{
                                        data: dashboard.revenueByCategory.map((x: any) => x.value),
                                        label: 'Doanh thu (VNĐ)',
                                        valueFormatter: (v) => formatMoney(v ?? 0),
                                        color: '#086839',
                                    }]}
                                    sx={{
                                        '.MuiChartsAxis-line': { stroke: '#e2e8f0' },
                                        '.MuiChartsAxis-tick': { stroke: '#e2e8f0' },
                                        '.MuiChartsLegend-label': { fontSize: 12, fill: '#475569' },
                                    }}
                                />
                            </ChartCard>
                        </Box>
                    )}

                    {/* ── By Source + By Branch + Status ── */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 3, mb: 3 }}>
                        <ChartCard title="Khách hàng từ các nguồn" icon="🌐">
                            <BarChart
                                height={280}
                                colors={['#ec4899']}
                                borderRadius={8}
                                xAxis={[{
                                    scaleType: 'band',
                                    data: dashboard.customersBySource.map((x: any) => x.name),
                                    tickLabelStyle: { fontSize: 12, fill: '#64748b' },
                                }]}
                                series={[{
                                    data: dashboard.customersBySource.map((x: any) => x.value),
                                    label: 'Số lượng khách',
                                }]}
                                sx={{
                                    '.MuiChartsAxis-line': { stroke: '#e2e8f0' },
                                    '.MuiChartsAxis-tick': { stroke: '#e2e8f0' },
                                }}
                            />
                        </ChartCard>

                        <ChartCard title="Doanh thu theo chi nhánh" icon="🏪">
                            <BarChart
                                height={280}
                                colors={['#0ea5e9']}
                                borderRadius={8}
                                xAxis={[{
                                    scaleType: 'band',
                                    data: dashboard.revenueByBranch.map((x: any) => x.name),
                                    tickLabelStyle: { fontSize: 12, fill: '#64748b' },
                                }]}
                                series={[{
                                    data: dashboard.revenueByBranch.map((x: any) => x.value),
                                    label: 'Doanh thu',
                                    valueFormatter: (v) => formatMoney(v ?? 0),
                                }]}
                                sx={{
                                    '.MuiChartsAxis-line': { stroke: '#e2e8f0' },
                                    '.MuiChartsAxis-tick': { stroke: '#e2e8f0' },
                                }}
                            />
                        </ChartCard>

                        <ChartCard title="Phân bổ trạng thái đơn" icon="🥧">
                            <PieChart
                                height={300}
                                colors={['#086839', '#22c55e', '#86efac', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']}
                                series={[{
                                    data: dashboard.ordersByStatus.map((x: any, i: number) => ({
                                        id: i,
                                        value: x.value,
                                        label: `${x.name} (${x.value})`,
                                    })),
                                    innerRadius: 60,
                                    outerRadius: 105,
                                    paddingAngle: 4,
                                    cornerRadius: 8,
                                    cx: '50%',
                                }]}
                                slotProps={{
                                    legend: {
                                        direction: 'vertical',
                                        position: { vertical: 'middle', horizontal: 'end' },
                                    },
                                }}
                                sx={{
                                    '& .MuiChartsLegend-label': { fontSize: 11, fill: '#475569' },
                                    '& .MuiChartsLegend-mark': { transform: 'scale(0.8)' },
                                }}
                            />
                        </ChartCard>
                    </Box>

                    {/* ── Top Customers + Birthdays ── */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 3 }}>
                        {/* Top Customers */}
                        <Paper elevation={0} sx={cardSx}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                                <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <EmojiEventsIcon sx={{ color: '#d97706', fontSize: 20 }} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>
                                        Vinh danh khách hàng
                                    </Typography>
                                    <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Top doanh thu cao nhất</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            {['#', 'Khách hàng', 'SĐT', 'Đơn', 'Chi tiêu'].map((h, i) => (
                                                <TableCell
                                                    key={h}
                                                    align={i >= 3 ? 'right' : 'left'}
                                                    sx={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderColor: '#f1f5f9', py: 1.2 }}
                                                >
                                                    {h}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dashboard.topCustomersByRevenue.map((item: any, idx: number) => (
                                            <TableRow
                                                key={item.customerId}
                                                onClick={() => setSelectedCustomer({
                                                    id: item.customerId,
                                                    name: item.customerName,
                                                    customerCode: '',
                                                    phone: item.phone,
                                                    orderCount: item.totalOrders,
                                                    totalRevenue: item.totalRevenue,
                                                    avgOrderValue: item.totalOrders > 0 ? item.totalRevenue / item.totalOrders : 0,
                                                    avgDaysBetweenOrders: 0,
                                                } as LoyalCustomerDTO)}
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&:hover': { bgcolor: '#fef9ec' },
                                                    '& td': { borderColor: '#f1f5f9', py: 1.5 },
                                                    transition: 'background 0.12s',
                                                }}
                                            >
                                                <TableCell sx={{ width: 44, fontSize: 18 }}>
                                                    {idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                                                        <Typography sx={{ fontWeight: 700, color: '#cbd5e1', fontSize: 14, pl: 0.5 }}>{idx + 1}</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar
                                                            sx={{
                                                                width: 32, height: 32, fontSize: 13,
                                                                bgcolor: idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#fff7ed' : '#f0fdf4',
                                                                color: idx === 0 ? '#d97706' : idx === 1 ? '#64748b' : idx === 2 ? '#ea580c' : '#086839',
                                                                fontWeight: 800,
                                                                border: `2px solid ${idx === 0 ? '#fde68a' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#fed7aa' : '#bbf7d0'}`,
                                                            }}
                                                        >
                                                            {item.customerName?.[0]}
                                                        </Avatar>
                                                        <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: 13, whiteSpace: 'nowrap' }}>
                                                            {item.customerName}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ color: '#64748b', fontSize: 13 }}>{item.phone}</TableCell>
                                                <TableCell align="right">
                                                    <Chip
                                                        label={item.totalOrders}
                                                        size="small"
                                                        sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 12, height: 22, border: '1px solid #bbf7d0' }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, color: '#d97706', fontSize: 13, whiteSpace: 'nowrap' }}>
                                                    {formatMoney(item.totalRevenue)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Paper>

                        {/* Birthday Customers */}
                        <Paper elevation={0} sx={cardSx}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                                <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CakeIcon sx={{ color: '#db2777', fontSize: 20 }} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>
                                        Sinh nhật tháng này
                                    </Typography>
                                    <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Khách hàng cần chúc mừng</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {dashboard.birthdayCustomersThisMonth.map((item: any, idx: number) => (
                                    <Box key={item.customerId}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                                            <Avatar
                                                sx={{
                                                    width: 38, height: 38, fontSize: 15,
                                                    bgcolor: '#fce7f3',
                                                    color: '#db2777',
                                                    fontWeight: 800,
                                                    border: '2px solid #fbcfe8',
                                                }}
                                            >
                                                {item.customerName?.[0]}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: 13, mb: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {item.customerName}
                                                </Typography>
                                                <Typography sx={{ color: '#94a3b8', fontSize: 12 }}>
                                                    {item.phone}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(item.dayOfBirth))}
                                                size="small"
                                                sx={{
                                                    bgcolor: '#fce7f3',
                                                    color: '#db2777',
                                                    fontWeight: 700,
                                                    fontSize: 12,
                                                    border: '1px solid #fbcfe8',
                                                    height: 24,
                                                    flexShrink: 0,
                                                }}
                                            />
                                        </Box>
                                        {idx < dashboard.birthdayCustomersThisMonth.length - 1 && (
                                            <Divider sx={{ borderColor: '#f1f5f9' }} />
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        </Paper>
                    </Box>
                </>
            )}
            <LoyalCustomerDetailDialog
                customer={selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
                badge="Top khách hàng"
                badgeColor="#d97706"
            />
        </Box>
    );
}

// ── Shared styles ──────────────────────────────────────────────

const cardSx = {
    bgcolor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    p: 3,
    boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
    transition: 'box-shadow 0.2s',
    '&:hover': { boxShadow: '0 6px 24px rgba(8,104,57,0.1)' },
};

const filterFieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        '&.Mui-focused fieldset': { borderColor: '#086839' },
    },
    '& label.Mui-focused': { color: '#086839' },
};

// ── Sub-components ────────────────────────────────────────────

function KpiCard({
    title, value, sub, icon, color, loading,
}: {
    title: string;
    value: string | number;
    sub: string;
    icon: React.ReactNode;
    color: string;
    loading?: boolean;
}) {
    return (
        <Paper elevation={0} sx={{
            p: 2.5, borderRadius: '20px',
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
                    {icon}
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 0.4 }}>
                        {title}
                    </Typography>
                    {loading
                        ? <Skeleton width={80} height={32} />
                        : <Typography sx={{ fontSize: typeof value === 'string' && value.length > 10 ? 18 : 26, fontWeight: 900, color: '#1e293b', lineHeight: 1.1 }}>
                            {value}
                          </Typography>
                    }
                    <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: 0.5 }}>{sub}</Typography>
                </Box>
            </Box>
        </Paper>
    );
}

function ChartCard({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
    return (
        <Paper elevation={0} sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                {icon && (
                    <Box
                        sx={{
                            width: 32, height: 32,
                            borderRadius: '9px',
                            bgcolor: '#dcfce7',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16,
                        }}
                    >
                        {icon}
                    </Box>
                )}
                <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>
                    {title}
                </Typography>
            </Box>
            {children}
        </Paper>
    );
}
