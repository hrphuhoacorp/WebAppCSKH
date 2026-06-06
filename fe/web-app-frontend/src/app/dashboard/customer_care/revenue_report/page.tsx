'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
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
} from '@mui/material';
import { BarChart, PieChart } from '@mui/x-charts';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';
import { ordersApi } from '@/features/orders/api/orders.api';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CakeIcon from '@mui/icons-material/Cake';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FilterListIcon from '@mui/icons-material/FilterList';

export default function DashboardPage() {
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [source, setSource] = useState('');
    const [branchId, setBranchId] = useState('');
    const [branches, setBranches] = useState<any[]>([]);
    const [dashboard, setDashboard] = useState<any>(null);

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value ?? 0);

    const fetchBranches = async () => {
        try {
            const response = await ordersApi.getBranches();
            setBranches(response.content || response || []);
        } catch {
            toast.error('Không tải được danh sách chi nhánh');
        }
    };

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const response = await dashboardApi.getDashboard({
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                month: month ? Number(month) : undefined,
                year: year ? Number(year) : undefined,
                source: source || undefined,
                branchId: branchId ? Number(branchId) : undefined,
            });
            setDashboard(response.content);
        } catch (error: any) {
            toast.error(error?.response?.data?.message ?? 'Không tải được dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBranches(); }, []);
    useEffect(() => { fetchDashboard(); }, [fromDate, toDate, month, year, source, branchId]);

    const hasFilter = fromDate || toDate || month || year || source || branchId;

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

            {/* ── Header ── */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 800,
                            color: '#086839',
                            letterSpacing: '-0.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                        }}
                    >
                        <Box
                            component="span"
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 38,
                                height: 38,
                                borderRadius: '10px',
                                bgcolor: '#086839',
                                color: '#fff',
                                fontSize: 20,
                                flexShrink: 0,
                            }}
                        >
                            📊
                        </Box>
                        Dashboard
                    </Typography>
                    <Typography sx={{ color: '#6b7280', mt: 0.5, ml: '52px', fontSize: 14 }}>
                        Báo cáo kinh doanh tổng quan theo thời gian thực
                    </Typography>
                </Box>
            </Box>

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

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(6,1fr)' }, gap: 2 }}>
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

                    <TextField select size="small" label="Tháng" value={month} onChange={(e) => setMonth(e.target.value)} fullWidth sx={filterFieldSx}>
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
                        {['Zalo', 'Facebook', 'GrabMark', 'ShopeeFood'].map((s) => (
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
                            icon={<ShoppingCartIcon sx={{ fontSize: 22, color: '#fff' }} />}
                            color="#ef4444"
                            lightColor="#fee2e2"
                        />
                        <KpiCard
                            title="Tổng khách hàng"
                            value={dashboard.totalCustomers}
                            icon={<PeopleAltIcon sx={{ fontSize: 22, color: '#fff' }} />}
                            color="#0ea5e9"
                            lightColor="#e0f2fe"
                        />
                        <KpiCard
                            title="Tổng doanh thu"
                            value={formatMoney(dashboard.totalRevenue)}
                            icon={<MonetizationOnIcon sx={{ fontSize: 22, color: '#fff' }} />}
                            color="#086839"
                            lightColor="#dcfce7"
                        />
                        <KpiCard
                            title="Trung bình / đơn"
                            value={formatMoney(dashboard.averageOrderValue)}
                            icon={<TrendingUpIcon sx={{ fontSize: 22, color: '#fff' }} />}
                            color="#8b5cf6"
                            lightColor="#ede9fe"
                        />
                    </Box>

                    {/* ── Revenue Bar Chart + Order Status Pie ── */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 3 }}>
                        <ChartCard title="Doanh thu theo tháng" icon="📈">
                            <BarChart
                                height={300}
                                colors={['#086839']}
                                borderRadius={8}
                                xAxis={[{
                                    scaleType: 'band',
                                    data: dashboard.revenueByMonth.map((x: any) => `T${x.month}`),
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
                                    '.MuiBarElement-root': {
                                        fill: 'url(#greenGrad)',
                                    },
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
                                        value: x.value > 0 && x.value < 50 ? 80 : x.value,
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
                                    '& .MuiChartsLegend-label': {
                                        fontSize: 11,
                                        fill: '#475569',
                                    },
                                    '& .MuiChartsLegend-mark': {
                                        transform: 'scale(0.8)',
                                    },
                                }}
                            />
                        </ChartCard>
                    </Box>

                    {/* ── By Source + By Branch ── */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
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
                                            sx={{
                                                '&:hover': { bgcolor: '#f8faf9' },
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
    title, value, icon, color, lightColor,
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    lightColor: string;
}) {
    return (
        <Card
            elevation={0}
            sx={{
                bgcolor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 8px 28px rgba(0,0,0,0.1)',
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    height: 3,
                    bgcolor: color,
                    borderRadius: '0 0 4px 4px',
                },
            }}
        >
            <CardContent sx={{ p: '20px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.4, maxWidth: '60%' }}>
                        {title}
                    </Typography>
                    <Box
                        sx={{
                            width: 38, height: 38,
                            borderRadius: '12px',
                            bgcolor: lightColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        {/* Clone icon with correct color */}
                        <Box sx={{ '& svg': { color: `${color} !important`, fontSize: '20px !important' } }}>
                            {icon}
                        </Box>
                    </Box>
                </Box>
                <Typography
                    sx={{
                        fontSize: typeof value === 'string' && value.length > 12 ? 18 : 28,
                        fontWeight: 800,
                        color: '#1e293b',
                        lineHeight: 1.2,
                        letterSpacing: '-0.5px',
                    }}
                >
                    {value}
                </Typography>
            </CardContent>
        </Card>
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