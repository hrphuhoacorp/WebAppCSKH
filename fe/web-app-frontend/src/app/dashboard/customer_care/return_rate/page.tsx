'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Paper, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, alpha, MenuItem, TextField,
    Skeleton, Tooltip, Tabs, Tab, TablePagination,
} from '@mui/material';
import {
    TrendingUp, People, AccessTime, Repeat, Warning, Schedule,
    Inventory2, Category, BarChart as BarChartIcon, StarBorder,
} from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import PageHeader from '@/components/common/PageHeader';
import {
    returnRateApi, ReturnRateStatsDTO, LoyalCustomerDTO, SegmentCustomerDTO,
} from '@/features/customer/api/returnRate.api';
import LoyalCustomerDetailDialog from '@/features/customer/components/LoyalCustomerDetailDialog';
import toast from 'react-hot-toast';

const MONTH_OPTIONS = [3, 6, 12, 24];
const VND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
const MONTHS_VI = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
const CAT_COLORS = ['#7c3aed','#086839','#0ea5e9','#f59e0b','#ef4444','#ec4899','#10b981','#6366f1'];

// ── Building blocks ────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }: {
    label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode;
}) {
    return (
        <Paper elevation={0} sx={{
            p: 2.5, borderRadius: '14px', border: `1.5px solid ${alpha(color, 0.2)}`,
            bgcolor: alpha(color, 0.04), display: 'flex', alignItems: 'flex-start', gap: 2,
        }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Box sx={{ color }}>{icon}</Box>
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: alpha(color, 0.7), textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.3 }}>
                    {label}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</Typography>
                {sub && <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.4 }}>{sub}</Typography>}
            </Box>
        </Paper>
    );
}

function ProgressBar({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{label}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color }}>{value}</Typography>
            </Box>
            <Box sx={{ height: 8, borderRadius: '4px', bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: '4px', transition: 'width 0.7s ease' }} />
            </Box>
        </Box>
    );
}

// ── Segment tabs config ─────────────────────────────────────────
const SEGMENTS = [
    { key: 'loyal',    label: 'Khách hàng thân thiết',  color: '#7c3aed', badge: 'Thân thiết',   badgeColor: '#f59e0b', desc: 'Mua ≥ 2 lần, sắp xếp theo số đơn giảm dần' },
    { key: 'repeat',   label: 'Mua từ 2 lần trở lên',   color: '#086839', badge: 'Mua ≥ 2 lần',  badgeColor: '#086839', desc: 'Tất cả KH có ≥2 đơn hàng' },
    { key: 'active30', label: 'Hoạt động (30 ngày)',     color: '#0ea5e9', badge: 'Hoạt động',    badgeColor: '#0ea5e9', desc: 'Mua hàng trong 30 ngày gần nhất' },
    { key: 'atRisk',   label: 'Có nguy cơ mất',         color: '#ef4444', badge: 'Nguy cơ mất',  badgeColor: '#ef4444', desc: '≥2 đơn, chưa mua 60–180 ngày' },
];

// ── Segment customer table ──────────────────────────────────────
function SegmentTable({
    segment, color, onViewCustomer,
}: {
    segment: string;
    color: string;
    onViewCustomer: (c: SegmentCustomerDTO) => void;
}) {
    const [rows, setRows] = useState<SegmentCustomerDTO[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        try {
            setLoading(true);
            const res = await returnRateApi.getCustomersBySegment(segment, page + 1, pageSize);
            setRows(res.items);
            setTotal(res.totalItems);
        } catch {
            toast.error('Không tải được danh sách');
        } finally {
            setLoading(false);
        }
    }, [segment, page, pageSize]);

    useEffect(() => { fetch(); }, [fetch]);
    useEffect(() => { setPage(0); }, [segment]);

    const dormColor = (days: number) =>
        days <= 30 ? '#086839' : days <= 90 ? '#b45309' : '#dc2626';
    const dormBg = (days: number) =>
        days <= 30 ? alpha('#086839', 0.1) : days <= 90 ? alpha('#f59e0b', 0.1) : alpha('#ef4444', 0.1);

    return (
        <Box>
            <TableContainer sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', maxHeight: 520 }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow sx={{ '& th': { bgcolor: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', py: 2, borderColor: '#e2e8f0' } }}>
                            <TableCell width={40}>#</TableCell>
                            <TableCell>Khách hàng</TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>SĐT</TableCell>
                            <TableCell align="center">Số đơn</TableCell>
                            <TableCell align="right">Tổng doanh thu</TableCell>
                            <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>GT trung bình/đơn</TableCell>
                            <TableCell align="center">Lần cuối mua</TableCell>
                            <TableCell align="center">Chưa mua</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 8 }).map((__, j) => (
                                        <TableCell key={j}><Skeleton height={22} /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                                    <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Không có dữ liệu</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((c, i) => (
                                <Tooltip key={c.id} title="Nhấn để xem chi tiết" placement="left" arrow>
                                    <TableRow
                                        onClick={() => onViewCustomer(c as any)}
                                        sx={{
                                            cursor: 'pointer',
                                            bgcolor: i % 2 === 0 ? '#fff' : '#fafcfb',
                                            '&:hover': { bgcolor: alpha(color, 0.06) },
                                            '& td': { borderColor: '#f1f5f9', py: 1.5 },
                                            transition: 'background 0.12s',
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 700, color: '#94a3b8', fontSize: 13 }}>
                                            {(page * pageSize) + i + 1}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{
                                                    width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
                                                    bgcolor: alpha(color, 0.14), color, fontWeight: 900, fontSize: 14,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
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
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', fontSize: 14, whiteSpace: 'nowrap' }}>
                                            {VND(c.totalRevenue)}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontSize: 13, color: '#475569', whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>
                                            {VND(c.avgOrderValue)}
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                                            {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('vi-VN') : '—'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={c.daysSinceLastOrder >= 0 ? `${c.daysSinceLastOrder} ngày` : '—'}
                                                size="small"
                                                sx={{ bgcolor: dormBg(c.daysSinceLastOrder), color: dormColor(c.daysSinceLastOrder), fontWeight: 700, fontSize: 12, height: 24, border: `1px solid ${alpha(dormColor(c.daysSinceLastOrder), 0.25)}` }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                </Tooltip>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div"
                count={total}
                page={page}
                rowsPerPage={pageSize}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 20, 50]}
                labelRowsPerPage="Số dòng:"
                sx={{ '& .MuiTablePagination-toolbar': { minHeight: 48 }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 13, color: '#64748b' } }}
            />
        </Box>
    );
}

// ── Main Page ───────────────────────────────────────────────────
export default function ReturnRatePage() {
    const [months, setMonths] = useState(12);
    const [data, setData] = useState<ReturnRateStatsDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<LoyalCustomerDTO | null>(null);
    const [selectedSegmentIdx, setSelectedSegmentIdx] = useState(0);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const res = await returnRateApi.getStats(months);
                setData(res);
            } catch {
                toast.error('Không tải được thống kê');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [months]);

    const freq = data?.frequencyDistribution;
    const dorm = data?.dormancySegments;
    const monthly = data?.monthlyReturnRate ?? [];
    const revenue = data?.monthlyRevenueBreakdown ?? [];
    const prod = data?.productStats;

    const totalCustomers = freq ? freq.once + freq.twoToThree + freq.fourToTen + freq.moreThanTen : 0;
    const repeatCustomers = freq ? freq.twoToThree + freq.fourToTen + freq.moreThanTen : 0;
    const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
    const avgReturnRate = monthly.length > 0
        ? Math.round(monthly.reduce((s, m) => s + m.returnRate, 0) / monthly.length * 10) / 10 : 0;
    const dormTotal = dorm
        ? dorm.active30 + dorm.dormant30To60 + dorm.dormant60To90 + dorm.dormant90Plus + dorm.neverBought : 0;
    const chartLabels = monthly.map(m => `${MONTHS_VI[m.month - 1]}/${String(m.year).slice(2)}`);
    const totalCatItems = prod?.categoryBreakdown.reduce((s, c) => s + c.itemCount, 0) ?? 0;

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#f8fafc' }}>
            <PageHeader
                title="Tỉ Lệ Quay Lại"
                subtitle="Phân tích tần suất mua hàng, sản phẩm và phân khúc khách hàng"
                icon={<TrendingUp />}
                gradient="linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
                shadowColor="rgba(124,58,237,0.28)"
                actions={
                    <TextField
                        select size="small" value={months}
                        onChange={e => setMonths(Number(e.target.value))}
                        label="Khoảng thời gian"
                        sx={{ minWidth: 170, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#fff', '&.Mui-focused fieldset': { borderColor: '#7c3aed' } }, '& label.Mui-focused': { color: '#7c3aed' } }}
                    >
                        {MONTH_OPTIONS.map(m => <MenuItem key={m} value={m}>{m} tháng gần nhất</MenuItem>)}
                    </TextField>
                }
            />

            {/* ── Row 1: Customer KPIs ── */}
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 1.5 }}>
                📊 Tổng quan khách hàng
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3,1fr)', lg: 'repeat(6,1fr)' }, gap: 1.5, mb: 1.5 }}>
                {[
                    { label: 'Tỉ lệ quay lại TB', color: '#7c3aed', icon: <Repeat sx={{ fontSize: 20 }} />, value: loading ? '...' : `${avgReturnRate}%`, sub: `Trung bình ${months} tháng` },
                    { label: 'KH mua ≥ 2 lần', color: '#086839', icon: <People sx={{ fontSize: 20 }} />, value: loading ? '...' : repeatCustomers.toLocaleString('vi-VN'), sub: `${repeatRate}% tổng KH` },
                    { label: 'Hoạt động (30 ngày)', color: '#0ea5e9', icon: <TrendingUp sx={{ fontSize: 20 }} />, value: loading ? '...' : (dorm?.active30 ?? 0).toLocaleString('vi-VN'), sub: dormTotal > 0 ? `${Math.round((dorm!.active30 / dormTotal) * 100)}% tổng KH` : '' },
                    { label: 'Ngủ đông (>90 ngày)', color: '#ef4444', icon: <AccessTime sx={{ fontSize: 20 }} />, value: loading ? '...' : (dorm?.dormant90Plus ?? 0).toLocaleString('vi-VN'), sub: dormTotal > 0 ? `${Math.round((dorm!.dormant90Plus / dormTotal) * 100)}% tổng KH` : '' },
                    { label: 'Chu kỳ mua TB', color: '#f59e0b', icon: <Schedule sx={{ fontSize: 20 }} />, value: loading ? '...' : data ? `${data.avgDaysBetweenOrders} ngày` : '—', sub: 'Giữa 2 đơn liên tiếp' },
                    { label: 'KH có nguy cơ mất', color: '#dc2626', icon: <Warning sx={{ fontSize: 20 }} />, value: loading ? '...' : (data?.atRiskCustomers ?? 0).toLocaleString('vi-VN'), sub: '≥2 đơn, chưa mua 60-180 ngày' },
                ].map(c => <StatCard key={c.label} {...c} />)}
            </Box>

            {/* ── Row 2: Product KPIs ── */}
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 1.5, mt: 2.5 }}>
                📦 Thống kê sản phẩm ({months} tháng gần nhất)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3,1fr)', lg: 'repeat(6,1fr)' }, gap: 1.5, mb: 3 }}>
                {[
                    { label: 'Tổng SP bán ra', color: '#7c3aed', icon: <Inventory2 sx={{ fontSize: 20 }} />, value: loading ? '...' : (prod?.totalItemsSold ?? 0).toLocaleString('vi-VN'), sub: `${months} tháng gần nhất` },
                    { label: 'Doanh thu từ SP', color: '#086839', icon: <TrendingUp sx={{ fontSize: 20 }} />, value: loading ? '...' : prod ? VND(prod.totalProductRevenue) : '—', sub: 'Tổng giá trị order items' },
                    { label: 'TB sản phẩm/đơn', color: '#0ea5e9', icon: <BarChartIcon sx={{ fontSize: 20 }} />, value: loading ? '...' : prod ? `${prod.avgItemsPerOrder}` : '—', sub: 'Số SP trung bình mỗi đơn' },
                    { label: 'Số danh mục', color: '#f59e0b', icon: <Category sx={{ fontSize: 20 }} />, value: loading ? '...' : (prod?.uniqueCategories ?? 0).toLocaleString('vi-VN'), sub: 'Danh mục sản phẩm khác nhau' },
                    { label: 'Danh mục hot nhất', color: '#ec4899', icon: <StarBorder sx={{ fontSize: 20 }} />, value: loading ? '...' : prod?.topCategory ?? '—', sub: prod ? `${prod.topCategoryCount.toLocaleString('vi-VN')} sản phẩm` : '' },
                    { label: 'Tỉ lệ DM hot', color: '#10b981', icon: <BarChartIcon sx={{ fontSize: 20 }} />, value: loading ? '...' : prod && totalCatItems > 0 ? `${Math.round(prod.topCategoryCount / totalCatItems * 100)}%` : '—', sub: `${prod?.topCategory ?? ''} / tổng SP` },
                ].map(c => <StatCard key={c.label} {...c} />)}
            </Box>

            {/* ── Avg time to 2nd purchase callout ── */}
            {!loading && data && data.avgTimeToSecondPurchase > 0 && (
                <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: '14px', border: '1px solid #ddd6fe', bgcolor: alpha('#7c3aed', 0.04), display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: alpha('#7c3aed', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Schedule sx={{ color: '#7c3aed', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#4c1d95' }}>
                            Trung bình <span style={{ fontSize: 20 }}>{data.avgTimeToSecondPurchase}</span> ngày để khách hàng quay lại mua lần thứ 2
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: '#7c3aed', mt: 0.3 }}>
                            Tập trung remarketing trong khung thời gian này để tối đa hoá tỉ lệ quay lại
                        </Typography>
                    </Box>
                </Paper>
            )}

            {/* ── Charts row ── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 3 }}>
                {/* Return Rate Chart */}
                <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b', mb: 0.4 }}>KH mới vs quay lại theo tháng</Typography>
                    <Typography sx={{ fontSize: 13, color: '#94a3b8', mb: 1.5 }}>Phân loại khách mua hàng từng tháng</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                        {monthly.slice(-6).map(m => (
                            <Chip key={`${m.year}-${m.month}`}
                                label={`${MONTHS_VI[m.month - 1]}/${String(m.year).slice(2)}: ${m.returnRate}%`}
                                size="small"
                                sx={{ bgcolor: m.returnRate >= 50 ? alpha('#086839', 0.1) : m.returnRate >= 30 ? alpha('#f59e0b', 0.1) : alpha('#ef4444', 0.1), color: m.returnRate >= 50 ? '#086839' : m.returnRate >= 30 ? '#b45309' : '#dc2626', fontWeight: 700, fontSize: 12, height: 24, border: `1px solid ${m.returnRate >= 50 ? alpha('#086839', 0.2) : m.returnRate >= 30 ? alpha('#f59e0b', 0.2) : alpha('#ef4444', 0.2)}` }}
                            />
                        ))}
                    </Box>
                    {loading ? <Skeleton variant="rectangular" height={240} sx={{ borderRadius: '12px' }} /> : (
                        <BarChart height={240} series={[
                            { data: monthly.map(m => m.returningCustomers), label: 'Quay lại', color: '#7c3aed', stack: 'total' },
                            { data: monthly.map(m => m.newCustomers), label: 'Mới', color: '#0ea5e9', stack: 'total' },
                        ]} xAxis={[{ data: chartLabels, scaleType: 'band' }]} margin={{ bottom: 30, top: 10 }} />
                    )}
                </Paper>

                {/* Category breakdown */}
                <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b', mb: 0.4 }}>Phân bổ danh mục sản phẩm</Typography>
                    <Typography sx={{ fontSize: 13, color: '#94a3b8', mb: 2 }}>Sản phẩm bán chạy theo danh mục trong {months} tháng</Typography>
                    {loading ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>{[1,2,3,4,5,6].map(i => <Skeleton key={i} height={36} sx={{ borderRadius: '8px' }} />)}</Box>
                    ) : !prod || prod.categoryBreakdown.length === 0 ? (
                        <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>Chưa có dữ liệu</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {prod.categoryBreakdown.map((cat, i) => {
                                const color = CAT_COLORS[i % CAT_COLORS.length];
                                const pct = totalCatItems > 0 ? Math.round((cat.itemCount / totalCatItems) * 100) : 0;
                                return (
                                    <Box key={cat.category}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                                                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{cat.category}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                                <Typography sx={{ fontSize: 13, color: '#94a3b8' }}>{cat.itemCount.toLocaleString('vi-VN')} SP</Typography>
                                                <Typography sx={{ fontSize: 13, fontWeight: 800, color, minWidth: 36, textAlign: 'right' }}>{pct}%</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 7, borderRadius: '4px', bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                                            <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: '4px', transition: 'width 0.7s ease' }} />
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </Paper>
            </Box>

            {/* ── Revenue + Frequency+Dormancy ── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b', mb: 0.4 }}>Doanh thu KH mới vs KH quay lại</Typography>
                    <Typography sx={{ fontSize: 13, color: '#94a3b8', mb: 1.5 }}>Tỉ trọng doanh thu đóng góp từng nhóm mỗi tháng</Typography>
                    {!loading && revenue.length > 0 && (() => {
                        const totalRev = revenue.reduce((s, r) => s + r.newRevenue + r.returningRevenue, 0);
                        const returnRev = revenue.reduce((s, r) => s + r.returningRevenue, 0);
                        const pct = totalRev > 0 ? Math.round(returnRev / totalRev * 100) : 0;
                        return (
                            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                                <Chip size="small" label={`KH quay lại: ${pct}%`} sx={{ bgcolor: alpha('#7c3aed', 0.1), color: '#7c3aed', fontWeight: 700, fontSize: 12, height: 24, border: `1px solid ${alpha('#7c3aed', 0.2)}` }} />
                                <Chip size="small" label={`KH mới: ${100 - pct}%`} sx={{ bgcolor: alpha('#0ea5e9', 0.1), color: '#0369a1', fontWeight: 700, fontSize: 12, height: 24, border: `1px solid ${alpha('#0ea5e9', 0.2)}` }} />
                            </Box>
                        );
                    })()}
                    {loading ? <Skeleton variant="rectangular" height={240} sx={{ borderRadius: '12px' }} /> : (
                        <BarChart height={240} series={[
                            { data: revenue.map(r => Math.round(r.returningRevenue / 1000000)), label: 'KH quay lại (triệu)', color: '#7c3aed', stack: 'rev' },
                            { data: revenue.map(r => Math.round(r.newRevenue / 1000000)), label: 'KH mới (triệu)', color: '#0ea5e9', stack: 'rev' },
                        ]} xAxis={[{ data: revenue.map(r => `${MONTHS_VI[r.month - 1]}/${String(r.year).slice(2)}`), scaleType: 'band' }]} margin={{ bottom: 30, top: 10 }} />
                    )}
                </Paper>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Frequency */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', flex: 1 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b', mb: 0.4 }}>Phân bố tần suất mua hàng</Typography>
                        <Typography sx={{ fontSize: 13, color: '#94a3b8', mb: 2 }}>Số KH theo số lần đặt hàng</Typography>
                        {loading ? <Skeleton height={120} /> : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[
                                    { label: 'Mua 1 lần', value: freq?.once ?? 0, color: '#ef4444' },
                                    { label: 'Mua 2–3 lần', value: freq?.twoToThree ?? 0, color: '#f59e0b' },
                                    { label: 'Mua 4–10 lần', value: freq?.fourToTen ?? 0, color: '#0ea5e9' },
                                    { label: 'Mua >10 lần (VIP)', value: freq?.moreThanTen ?? 0, color: '#086839' },
                                ].map(row => {
                                    const pct = totalCustomers > 0 ? Math.round((row.value / totalCustomers) * 100) : 0;
                                    return <ProgressBar key={row.label} label={row.label} value={`${row.value.toLocaleString('vi-VN')} KH (${pct}%)`} pct={pct} color={row.color} />;
                                })}
                            </Box>
                        )}
                    </Paper>
                    {/* Dormancy */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', flex: 1 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b', mb: 0.4 }}>Phân khúc theo thời gian chưa quay lại</Typography>
                        <Typography sx={{ fontSize: 13, color: '#94a3b8', mb: 2 }}>Mức độ hoạt động của tổng khách hàng</Typography>
                        {loading ? <Skeleton height={140} /> : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[
                                    { label: '🟢 ≤30 ngày', value: dorm?.active30 ?? 0, color: '#086839' },
                                    { label: '🟡 30–60 ngày', value: dorm?.dormant30To60 ?? 0, color: '#0ea5e9' },
                                    { label: '🟠 60–90 ngày', value: dorm?.dormant60To90 ?? 0, color: '#f59e0b' },
                                    { label: '🔴 >90 ngày', value: dorm?.dormant90Plus ?? 0, color: '#ef4444' },
                                    { label: '⚪ Chưa có đơn', value: dorm?.neverBought ?? 0, color: '#94a3b8' },
                                ].map(row => {
                                    const pct = dormTotal > 0 ? Math.round((row.value / dormTotal) * 100) : 0;
                                    return <ProgressBar key={row.label} label={row.label} value={`${row.value.toLocaleString('vi-VN')} KH (${pct}%)`} pct={pct} color={row.color} />;
                                })}
                            </Box>
                        )}
                    </Paper>
                </Box>
            </Box>

            {/* ── Tabbed customer segment tables ── */}
            <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <Box sx={{ borderBottom: '1px solid #e2e8f0', px: 3, bgcolor: '#fff' }}>
                    <Box sx={{ pt: 2.5, pb: 0 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Danh sách khách hàng theo phân khúc</Typography>
                        <Typography sx={{ fontSize: 13, color: '#94a3b8', mt: 0.4 }}>Nhấn vào hàng để xem chi tiết khách hàng</Typography>
                    </Box>
                    <Tabs
                        value={activeTab}
                        onChange={(_, v) => setActiveTab(v)}
                        sx={{
                            mt: 1.5,
                            '& .MuiTab-root': { fontSize: 13, fontWeight: 700, textTransform: 'none', minWidth: 'auto', px: 2.5, py: 1.5 },
                            '& .Mui-selected': { color: `${SEGMENTS[activeTab].color} !important` },
                            '& .MuiTabs-indicator': { bgcolor: SEGMENTS[activeTab].color, height: 3, borderRadius: '2px 2px 0 0' },
                        }}
                    >
                        {SEGMENTS.map((seg, i) => (
                            <Tab
                                key={seg.key}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{
                                            width: 9, height: 9, borderRadius: '50%',
                                            bgcolor: i === activeTab ? seg.color : '#cbd5e1',
                                            transition: 'all 0.2s',
                                        }} />
                                        {seg.label}
                                    </Box>
                                }
                            />
                        ))}
                    </Tabs>
                </Box>

                <Box sx={{ px: 3, py: 1.5, bgcolor: alpha(SEGMENTS[activeTab].color, 0.04), borderBottom: `2px solid ${alpha(SEGMENTS[activeTab].color, 0.15)}` }}>
                    <Typography sx={{ fontSize: 13, color: SEGMENTS[activeTab].color, fontWeight: 600 }}>
                        {SEGMENTS[activeTab].desc}
                    </Typography>
                </Box>

                <Box sx={{ p: 2.5 }}>
                    {SEGMENTS.map((seg, i) => (
                        <Box key={seg.key} sx={{ display: activeTab === i ? 'block' : 'none' }}>
                            <SegmentTable
                                segment={seg.key}
                                color={seg.color}
                                onViewCustomer={c => {
                                    setSelectedSegmentIdx(i);
                                    setSelectedCustomer({
                                        ...c,
                                        orderCount: c.totalOrders,
                                        avgDaysBetweenOrders: 0,
                                    });
                                }}
                            />
                        </Box>
                    ))}
                </Box>
            </Paper>

            {/* ── Detail Dialog ── */}
            <LoyalCustomerDetailDialog
                customer={selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
                badge={SEGMENTS[selectedSegmentIdx].badge}
                badgeColor={SEGMENTS[selectedSegmentIdx].badgeColor}
            />
        </Box>
    );
}
