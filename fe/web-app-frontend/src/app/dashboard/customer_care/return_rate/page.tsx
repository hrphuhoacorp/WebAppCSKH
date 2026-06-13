'use client';

import { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, alpha, MenuItem, TextField, Skeleton,
} from '@mui/material';
import { TrendingUp, People, AccessTime, Repeat } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import PageHeader from '@/components/common/PageHeader';
import { returnRateApi, ReturnRateStatsDTO } from '@/features/customer/api/returnRate.api';
import toast from 'react-hot-toast';

const MONTH_OPTIONS = [3, 6, 12, 24];

const VND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const MONTHS_VI = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

function StatCard({ label, value, sub, color, icon }: {
    label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode;
}) {
    return (
        <Paper elevation={0} sx={{
            p: 2.5, borderRadius: '16px', border: `1.5px solid ${alpha(color, 0.2)}`,
            bgcolor: alpha(color, 0.04),
            display: 'flex', alignItems: 'flex-start', gap: 2,
        }}>
            <Box sx={{
                width: 44, height: 44, borderRadius: '12px', bgcolor: alpha(color, 0.12),
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
                <Box sx={{ color }}>{icon}</Box>
            </Box>
            <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: alpha(color, 0.7), textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.3 }}>
                    {label}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value}</Typography>
                {sub && <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.4 }}>{sub}</Typography>}
            </Box>
        </Paper>
    );
}

export default function ReturnRatePage() {
    const [months, setMonths] = useState(12);
    const [data, setData] = useState<ReturnRateStatsDTO | null>(null);
    const [loading, setLoading] = useState(false);

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
    const loyal = data?.topLoyalCustomers ?? [];

    const totalCustomers = freq
        ? freq.once + freq.twoToThree + freq.fourToTen + freq.moreThanTen
        : 0;
    const repeatCustomers = freq ? freq.twoToThree + freq.fourToTen + freq.moreThanTen : 0;
    const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
    const avgReturnRate = monthly.length > 0
        ? Math.round(monthly.reduce((s, m) => s + m.returnRate, 0) / monthly.length * 10) / 10
        : 0;

    const dormTotal = dorm
        ? dorm.active30 + dorm.dormant30To60 + dorm.dormant60To90 + dorm.dormant90Plus + dorm.neverBought
        : 0;

    const chartLabels = monthly.map(m => `${MONTHS_VI[m.month - 1]}/${m.year}`);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#f8fafc' }}>
            <PageHeader
                title="Tỉ Lệ Quay Lại"
                subtitle="Phân tích tần suất mua hàng, tỉ lệ quay lại và phân khúc khách hàng"
                icon={<TrendingUp />}
                gradient="linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
                shadowColor="rgba(124,58,237,0.28)"
                actions={
                    <TextField
                        select size="small" value={months}
                        onChange={e => setMonths(Number(e.target.value))}
                        label="Khoảng thời gian"
                        sx={{
                            minWidth: 160,
                            '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#fff', '&.Mui-focused fieldset': { borderColor: '#7c3aed' } },
                            '& label.Mui-focused': { color: '#7c3aed' },
                        }}
                    >
                        {MONTH_OPTIONS.map(m => (
                            <MenuItem key={m} value={m}>{m} tháng gần nhất</MenuItem>
                        ))}
                    </TextField>
                }
            />

            {/* ── Summary Cards ── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 2, mb: 3 }}>
                {[
                    {
                        label: 'Tỉ lệ quay lại TB', color: '#7c3aed', icon: <Repeat />,
                        value: loading ? '...' : `${avgReturnRate}%`,
                        sub: `Trung bình ${months} tháng`,
                    },
                    {
                        label: 'KH mua lại (≥2 đơn)', color: '#086839', icon: <People />,
                        value: loading ? '...' : repeatCustomers.toLocaleString('vi-VN'),
                        sub: `${repeatRate}% tổng KH`,
                    },
                    {
                        label: 'KH hoạt động (30 ngày)', color: '#0ea5e9', icon: <TrendingUp />,
                        value: loading ? '...' : (dorm?.active30 ?? 0).toLocaleString('vi-VN'),
                        sub: dormTotal > 0 ? `${Math.round((dorm!.active30 / dormTotal) * 100)}% tổng KH` : '',
                    },
                    {
                        label: 'KH ngủ đông (>90 ngày)', color: '#ef4444', icon: <AccessTime />,
                        value: loading ? '...' : (dorm?.dormant90Plus ?? 0).toLocaleString('vi-VN'),
                        sub: dormTotal > 0 ? `${Math.round(((dorm!.dormant90Plus) / dormTotal) * 100)}% tổng KH` : '',
                    },
                ].map(c => (
                    <StatCard key={c.label} {...c} />
                ))}
            </Box>

            {/* ── Monthly Return Rate Chart ── */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid #e2e8f0', mb: 3 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b', mb: 0.5 }}>
                    Tỉ lệ quay lại theo tháng
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#94a3b8', mb: 2 }}>
                    Khách hàng mới (lần đầu) vs khách hàng quay lại trong từng tháng
                </Typography>
                {loading ? (
                    <Skeleton variant="rectangular" height={280} sx={{ borderRadius: '12px' }} />
                ) : monthly.length === 0 ? (
                    <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ color: '#94a3b8' }}>Chưa có dữ liệu</Typography>
                    </Box>
                ) : (
                    <BarChart
                        height={300}
                        series={[
                            { data: monthly.map(m => m.returningCustomers), label: 'Quay lại', color: '#7c3aed' },
                            { data: monthly.map(m => m.newCustomers), label: 'Mới', color: '#0ea5e9' },
                        ]}
                        xAxis={[{ data: chartLabels, scaleType: 'band' }]}
                        margin={{ bottom: 20 }}
                    />
                )}

                {/* Monthly rate table summary */}
                {!loading && monthly.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {monthly.slice(-6).map(m => (
                            <Chip
                                key={`${m.year}-${m.month}`}
                                label={`${MONTHS_VI[m.month - 1]}/${m.year}: ${m.returnRate}%`}
                                size="small"
                                sx={{
                                    bgcolor: m.returnRate >= 50 ? alpha('#086839', 0.1) : m.returnRate >= 30 ? alpha('#f59e0b', 0.1) : alpha('#ef4444', 0.1),
                                    color: m.returnRate >= 50 ? '#086839' : m.returnRate >= 30 ? '#b45309' : '#dc2626',
                                    fontWeight: 700, fontSize: 11,
                                    border: `1px solid ${m.returnRate >= 50 ? alpha('#086839', 0.2) : m.returnRate >= 30 ? alpha('#f59e0b', 0.2) : alpha('#ef4444', 0.2)}`,
                                }}
                            />
                        ))}
                    </Box>
                )}
            </Paper>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
                {/* ── Frequency Distribution ── */}
                <Box>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid #e2e8f0', height: '100%' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b', mb: 0.5 }}>
                            Phân bố tần suất mua hàng
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: '#94a3b8', mb: 2.5 }}>
                            Số lượng khách hàng theo số đơn hàng
                        </Typography>
                        {loading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[1,2,3,4].map(i => <Skeleton key={i} height={52} sx={{ borderRadius: '10px' }} />)}
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[
                                    { label: 'Mua 1 lần', value: freq?.once ?? 0, color: '#ef4444', pct: totalCustomers > 0 ? Math.round(((freq?.once ?? 0) / totalCustomers) * 100) : 0 },
                                    { label: 'Mua 2–3 lần', value: freq?.twoToThree ?? 0, color: '#f59e0b', pct: totalCustomers > 0 ? Math.round(((freq?.twoToThree ?? 0) / totalCustomers) * 100) : 0 },
                                    { label: 'Mua 4–10 lần', value: freq?.fourToTen ?? 0, color: '#0ea5e9', pct: totalCustomers > 0 ? Math.round(((freq?.fourToTen ?? 0) / totalCustomers) * 100) : 0 },
                                    { label: 'Mua > 10 lần', value: freq?.moreThanTen ?? 0, color: '#086839', pct: totalCustomers > 0 ? Math.round(((freq?.moreThanTen ?? 0) / totalCustomers) * 100) : 0 },
                                ].map(row => (
                                    <Box key={row.label}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{row.label}</Typography>
                                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: row.color }}>
                                                {row.value.toLocaleString('vi-VN')} KH ({row.pct}%)
                                            </Typography>
                                        </Box>
                                        <Box sx={{ height: 8, borderRadius: '4px', bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                                            <Box sx={{ height: '100%', width: `${row.pct}%`, bgcolor: row.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Paper>
                </Box>

                {/* ── Dormancy Segments ── */}
                <Box>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid #e2e8f0', height: '100%' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b', mb: 0.5 }}>
                            Thời gian chưa quay lại mua
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: '#94a3b8', mb: 2.5 }}>
                            Phân khúc khách hàng theo mức độ hoạt động
                        </Typography>
                        {loading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[1,2,3,4,5].map(i => <Skeleton key={i} height={52} sx={{ borderRadius: '10px' }} />)}
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[
                                    { label: 'Mua trong 30 ngày qua', value: dorm?.active30 ?? 0, color: '#086839' },
                                    { label: 'Chưa mua 30–60 ngày', value: dorm?.dormant30To60 ?? 0, color: '#0ea5e9' },
                                    { label: 'Chưa mua 60–90 ngày', value: dorm?.dormant60To90 ?? 0, color: '#f59e0b' },
                                    { label: 'Chưa mua > 90 ngày', value: dorm?.dormant90Plus ?? 0, color: '#ef4444' },
                                    { label: 'Chưa có đơn hàng nào', value: dorm?.neverBought ?? 0, color: '#94a3b8' },
                                ].map(row => {
                                    const pct = dormTotal > 0 ? Math.round((row.value / dormTotal) * 100) : 0;
                                    return (
                                        <Box key={row.label}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{row.label}</Typography>
                                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: row.color }}>
                                                    {row.value.toLocaleString('vi-VN')} KH ({pct}%)
                                                </Typography>
                                            </Box>
                                            <Box sx={{ height: 8, borderRadius: '4px', bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                                                <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: row.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Paper>
                </Box>
            </Box>

            {/* ── Top Loyal Customers ── */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b', mb: 0.5 }}>
                    Top khách hàng trung thành
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#94a3b8', mb: 2 }}>
                    Khách hàng có số lần mua hàng nhiều nhất (≥2 đơn)
                </Typography>
                <TableContainer sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ '& th': { bgcolor: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', py: 1.5, borderColor: '#e2e8f0' } }}>
                                <TableCell>#</TableCell>
                                <TableCell>Khách hàng</TableCell>
                                <TableCell align="center">Số đơn</TableCell>
                                <TableCell align="right">Tổng doanh thu</TableCell>
                                <TableCell align="center">Ngày mua gần nhất</TableCell>
                                <TableCell align="center">Chưa mua (ngày)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 6 }).map((__, j) => (
                                            <TableCell key={j}><Skeleton height={20} /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : loyal.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                                        Chưa có dữ liệu
                                    </TableCell>
                                </TableRow>
                            ) : (
                                loyal.map((c, i) => (
                                    <TableRow key={c.id} sx={{ '&:hover': { bgcolor: '#f8fafc' }, '& td': { borderColor: '#f1f5f9', py: 1.2 } }}>
                                        <TableCell sx={{ fontWeight: 700, color: '#94a3b8', fontSize: 13 }}>{i + 1}</TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{c.name}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{c.customerCode}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip label={c.orderCount} size="small" sx={{ bgcolor: alpha('#7c3aed', 0.1), color: '#7c3aed', fontWeight: 800, fontSize: 12, height: 22, border: `1px solid ${alpha('#7c3aed', 0.2)}` }} />
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', fontSize: 13, whiteSpace: 'nowrap' }}>
                                            {VND(c.totalRevenue)}
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontSize: 12, color: '#64748b' }}>
                                            {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('vi-VN') : '—'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={c.daysSinceLastOrder >= 0 ? `${c.daysSinceLastOrder} ngày` : '—'}
                                                size="small"
                                                sx={{
                                                    bgcolor: c.daysSinceLastOrder <= 30 ? alpha('#086839', 0.1) : c.daysSinceLastOrder <= 90 ? alpha('#f59e0b', 0.1) : alpha('#ef4444', 0.1),
                                                    color: c.daysSinceLastOrder <= 30 ? '#086839' : c.daysSinceLastOrder <= 90 ? '#b45309' : '#dc2626',
                                                    fontWeight: 700, fontSize: 11, height: 22,
                                                    border: `1px solid ${c.daysSinceLastOrder <= 30 ? alpha('#086839', 0.2) : c.daysSinceLastOrder <= 90 ? alpha('#f59e0b', 0.2) : alpha('#ef4444', 0.2)}`,
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
