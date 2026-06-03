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
import { BarChart, LineChart, PieChart } from '@mui/x-charts';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';
import { ordersApi } from '@/features/orders/api/orders.api'; // Import ordersApi để lấy chi nhánh
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CakeIcon from '@mui/icons-material/Cake';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default function DashboardPage() {
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [source, setSource] = useState('');
    const [branchId, setBranchId] = useState('');
    const [branches, setBranches] = useState<any[]>([]); // State lưu danh sách chi nhánh từ API
    const [dashboard, setDashboard] = useState<any>(null);

    const palette = {
        primary: '#6366f1',
        primaryLight: '#818cf8',
        secondary: '#ec4899',
        gold: '#f59e0b',
        success: '#10b981',
        info: '#0ea5e9',
        surface: '#f3f4f6',
        surfaceCard: '#ffffff',
        border: '#e5e7eb',
        text: '#1f2937',
        textMuted: '#6b7280',
        chartColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F9CA24', '#F0932B', '#6AB04C', '#E056FD', '#22A6B3'],
    };

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value ?? 0);

    // Gọi API lấy danh sách chi nhánh khi component mount
    const fetchBranches = async () => {
        try {
            const response = await ordersApi.getBranches();
            // Xử lý dữ liệu linh hoạt nếu API bọc trong thuộc tính content hoặc trả về mảng trực tiếp
            setBranches(response.content || response || []);
        } catch (error) {
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

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fromDate, toDate, month, year, source, branchId]);

    const cardSx = {
        background: palette.surfaceCard,
        border: `1px solid ${palette.border}`,
        borderRadius: 4,
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
            boxShadow: '0 12px 28px rgba(0,0,0,0.08)',
            transform: 'translateY(-4px)',
        },
    };

    return (
        <Box sx={{ minHeight: '100vh', background: palette.surface, p: { xs: 2, md: 4 } }}>
            <LoadingOverlay open={loading} fullScreen text="Đang tải dashboard..." />

            {/* ─── Header ─── */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 800,
                            background: `#086839`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.02em',
                            lineHeight: 1.2
                        }}
                    >
                        Dashboard
                    </Typography>
                    <Typography sx={{ color: palette.textMuted, fontSize: 14, mt: 0.5, fontWeight: 500 }}>
                        Báo cáo kinh doanh tổng quan
                    </Typography>
                </Box>

              
            </Box>

            {/* ─── Filters Thanh Bộ Lọc Toàn Diện ─── */}
            <Paper sx={{ p: 3, mb: 4, ...cardSx }} elevation={0}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2 }}>
                    <TextField
                        size="small" type="date" label="Từ ngày"
                        value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        fullWidth
                    />
                    <TextField
                        size="small" type="date" label="Đến ngày"
                        value={toDate} onChange={(e) => setToDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        fullWidth
                    />
                    <TextField
                        select size="small" label="Tháng"
                        value={month} onChange={(e) => setMonth(e.target.value)}
                        fullWidth
                    >
                        <MenuItem value="">Tất cả tháng</MenuItem>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <MenuItem key={m} value={m}>Tháng {m}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select size="small" label="Năm"
                        value={year} onChange={(e) => setYear(e.target.value)}
                        fullWidth
                    >
                        <MenuItem value="">Tất cả năm</MenuItem>
                        {[2024, 2025, 2026, 2027].map((y) => (
                            <MenuItem key={y} value={y}>Năm {y}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select size="small" label="Nguồn khách"
                        value={source} onChange={(e) => setSource(e.target.value)}
                        fullWidth
                    >
                        <MenuItem value="">Tất cả các nguồn</MenuItem>
                        {['Zalo', 'Facebook', 'GrabMark', 'ShopeeFood'].map((s) => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select size="small" label="Chi nhánh"
                        value={branchId} onChange={(e) => setBranchId(e.target.value)}
                        fullWidth
                    >
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
                    {/* ─── KPI Cards ─── */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 4 }}>
                        <KpiCard title="Tổng đơn hàng" value={dashboard.totalOrders}
                            icon={<ShoppingCartIcon sx={{ fontSize: 24, color: '#fff' }} />}
                            gradient="linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)" palette={palette} />

                        <KpiCard title="Tổng khách hàng" value={dashboard.totalCustomers}
                            icon={<PeopleAltIcon sx={{ fontSize: 24, color: '#fff' }} />}
                            gradient="linear-gradient(135deg, #4ECDC4 0%, #6EE7E7 100%)" palette={palette} />

                        <KpiCard title="Tổng doanh thu" value={formatMoney(dashboard.totalRevenue)}
                            icon={<MonetizationOnIcon sx={{ fontSize: 24, color: '#fff' }} />}
                            gradient="linear-gradient(135deg, #F9CA24 0%, #F6E58D 100%)" palette={palette} />

                        <KpiCard title="Trung bình / đơn" value={formatMoney(dashboard.averageOrderValue)}
                            icon={<TrendingUpIcon sx={{ fontSize: 24, color: '#fff' }} />}
                            gradient="linear-gradient(135deg, #E056FD 0%, #BE2EDD 100%)" palette={palette} />
                    </Box>

                    {/* ─── Revenue + Order Status ─── */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 4 }}>
                        <Paper sx={{ ...cardSx, p: 3.5 }} elevation={0}>
                            <SectionLabel title="Biểu đồ doanh thu theo tháng" palette={palette} />
                            <LineChart
                                height={320}
                                colors={[palette.primary]}
                                xAxis={[{
                                    scaleType: 'point',
                                    data: dashboard.revenueByMonth.map((x: any) => `Tháng ${x.month}`),
                                }]}
                                series={[{
                                    data: dashboard.revenueByMonth.map((x: any) => x.revenue),
                                    label: 'Doanh thu',
                                    area: true,
                                    showMark: true,
                                    curve: 'catmullRom',
                                }]}
                                sx={{
                                    '.MuiLineElement-root': { strokeWidth: 3 },
                                }}
                            />
                        </Paper>

                        <Paper sx={{ ...cardSx, p: 3.5 }} elevation={0}>
                            <SectionLabel title="Phân bổ trạng thái đơn" palette={palette} />
                            <PieChart
                                height={320}
                                colors={palette.chartColors}
                                series={[{
                                    data: dashboard.ordersByStatus.map((x: any, i: number) => {
                                        const visualValue = (x.value > 0 && x.value < 50) ? 80 : x.value;
                                        return {
                                            id: i,
                                            value: visualValue,
                                            label: `${x.name} (${x.value})`,
                                        };
                                    }),
                                    innerRadius: 65,
                                    outerRadius: 110,
                                    paddingAngle: 4,
                                    cornerRadius: 8,
                                    cx: '50%',
                                }]}
                            />
                        </Paper>
                    </Box>

                    {/* ─── By Source + By Branch ─── */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}>
                        <Paper sx={{ ...cardSx, p: 3.5 }} elevation={0}>
                            <SectionLabel title="Khách hàng từ các nguồn" palette={palette} />
                            <BarChart
                                height={320}
                                colors={[palette.secondary]}
                                borderRadius={8}
                                xAxis={[{
                                    scaleType: 'band',
                                    data: dashboard.customersBySource.map((x: any) => x.name),
                                }]}
                                series={[{
                                    data: dashboard.customersBySource.map((x: any) => x.value),
                                    label: 'Số lượng khách',
                                }]}
                            />
                        </Paper>

                        <Paper sx={{ ...cardSx, p: 3.5 }} elevation={0}>
                            <SectionLabel title="Doanh thu theo chi nhánh" palette={palette} />
                            <BarChart
                                height={320}
                                colors={[palette.info]}
                                borderRadius={8}
                                xAxis={[{
                                    scaleType: 'band',
                                    data: dashboard.revenueByBranch.map((x: any) => x.name),
                                }]}
                                series={[{
                                    data: dashboard.revenueByBranch.map((x: any) => x.value),
                                    label: 'Doanh thu',
                                }]}
                            />
                        </Paper>
                    </Box>

                    {/* ─── Top Customers + Birthdays ─── */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: 3 }}>
                        <Paper sx={{ ...cardSx, p: 3.5 }} elevation={0}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <Box sx={{ p: 1, borderRadius: 2, background: 'rgba(245,158,11,0.15)' }}>
                                    <EmojiEventsIcon sx={{ color: palette.gold, fontSize: 24 }} />
                                </Box>
                                <SectionLabel title="Vinh danh Khách hàng (Top Doanh thu)" palette={palette} noMargin />
                            </Box>

                            <Table size="medium">
                                <TableHead>
                                    <TableRow>
                                        {['Hạng', 'Khách hàng', 'Liên hệ', 'Số đơn', 'Tổng chi tiêu'].map((h, i) => (
                                            <TableCell
                                                key={h}
                                                align={i >= 3 ? 'right' : 'left'}
                                                sx={{
                                                    color: palette.textMuted,
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    borderColor: palette.border,
                                                }}
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
                                                '&:hover': { background: '#f8fafc' },
                                                '& td': { borderColor: palette.border, py: 2 },
                                            }}
                                        >
                                            <TableCell sx={{ fontSize: 16, width: 60 }}>
                                                {idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <Typography sx={{ fontWeight: 600, color: palette.textMuted, pl: 1 }}>{idx + 1}</Typography>}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Avatar
                                                        sx={{
                                                            width: 36, height: 36, fontSize: 14,
                                                            background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
                                                            fontWeight: 700,
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                                        }}
                                                    >
                                                        {item.customerName?.[0]}
                                                    </Avatar>
                                                    <Typography sx={{ fontWeight: 700, color: palette.text, fontSize: 14 }}>
                                                        {item.customerName}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ color: palette.textMuted, fontSize: 14, fontWeight: 500 }}>{item.phone}</TableCell>
                                            <TableCell align="right">
                                                <Chip
                                                    label={`${item.totalOrders} đơn`}
                                                    sx={{
                                                        background: 'rgba(16,185,129,0.1)',
                                                        color: palette.success,
                                                        fontWeight: 700,
                                                        fontSize: 13,
                                                        px: 1,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: palette.gold, fontWeight: 800, fontSize: 15 }}>
                                                {formatMoney(item.totalRevenue)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>

                        <Paper sx={{ ...cardSx, p: 3.5 }} elevation={0}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <Box sx={{ p: 1, borderRadius: 2, background: 'rgba(236,72,153,0.15)' }}>
                                    <CakeIcon sx={{ color: palette.secondary, fontSize: 24 }} />
                                </Box>
                                <SectionLabel title="Sinh nhật trong tháng" palette={palette} noMargin />
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {dashboard.birthdayCustomersThisMonth.map((item: any, idx: number) => (
                                    <Box key={item.customerId}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5 }}>
                                            <Avatar
                                                sx={{
                                                    width: 42, height: 42, fontSize: 16,
                                                    background: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)',
                                                    color: '#d61f69',
                                                    fontWeight: 800,
                                                }}
                                            >
                                                {item.customerName?.[0]}
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography sx={{ fontWeight: 700, color: palette.text, fontSize: 14, mb: 0.5 }}>
                                                    {item.customerName}
                                                </Typography>
                                                <Typography sx={{ color: palette.textMuted, fontSize: 13, fontWeight: 500 }}>
                                                    {item.phone}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(item.dayOfBirth))}
                                                sx={{
                                                    background: 'linear-gradient(135deg, #E056FD, #BE2EDD)',
                                                    color: '#fff',
                                                    fontWeight: 700,
                                                    fontSize: 13,
                                                    boxShadow: '0 2px 6px rgba(190, 46, 221, 0.3)'
                                                }}
                                            />
                                        </Box>
                                        {idx < dashboard.birthdayCustomersThisMonth.length - 1 && (
                                            <Divider sx={{ borderColor: palette.border, mt: 1.5 }} />
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

// ─── Sub-components ───────────────────────────────────────────

function KpiCard({
    title, value, icon, gradient, palette,
}: {
    title: string; value: string | number; icon: React.ReactNode; gradient: string; palette: any;
}) {
    return (
        <Card
            sx={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    height: 4,
                    background: gradient,
                },
            }}
        >
            <CardContent sx={{ p: '24px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography
                        sx={{
                            color: palette.textMuted,
                            fontSize: 13,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                        }}
                    >
                        {title}
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 44, height: 44, borderRadius: 3,
                            background: gradient,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                        }}
                    >
                        {icon}
                    </Box>
                </Box>
                <Typography
                    sx={{
                        fontSize: typeof value === 'string' && value.length > 12 ? 22 : 32,
                        fontWeight: 800,
                        color: palette.text,
                        lineHeight: 1.2,
                    }}
                >
                    {value}
                </Typography>
            </CardContent>
        </Card>
    );
}

function SectionLabel({ title, palette, noMargin }: { title: string; palette: any; noMargin?: boolean }) {
    return (
        <Typography
            sx={{
                fontWeight: 800,
                color: palette.text,
                fontSize: 16,
                mb: noMargin ? 0 : 3,
            }}
        >
            {title}
        </Typography>
    );
}