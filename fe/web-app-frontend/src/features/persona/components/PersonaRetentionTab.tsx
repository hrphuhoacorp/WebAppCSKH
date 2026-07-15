'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { Box, Paper, Typography, Skeleton, alpha, Chip } from '@mui/material';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import Filter2RoundedIcon from '@mui/icons-material/Filter2Rounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import { useQuery } from '@tanstack/react-query';
import { personaApi } from '../api/persona.api';
import { errMessage } from '@/lib/errMessage';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const GREEN = '#086839';

function fmtMonth(m: string): string {
    const [y, mo] = m.split('-');
    return `${mo}/${y.slice(2)}`;
}

function fmtCompactVnd(v: number): string {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + ' tỷ đ';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' triệu đ';
    return v.toLocaleString('vi-VN') + 'đ';
}

function Kpi({ icon, label, value, sub, accent, loading }: {
    icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; accent: string; loading?: boolean;
}) {
    return (
        <Paper elevation={0} sx={{
            flex: '1 1 220px', minWidth: 220, p: 2.25, borderRadius: '18px', border: '1px solid #eef2f6',
            bgcolor: '#fff', display: 'flex', alignItems: 'center', gap: 1.5,
            boxShadow: `0 2px 14px ${alpha(accent, 0.08)}`,
            transition: 'transform 0.15s, box-shadow 0.15s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(accent, 0.16)}` },
        }}>
            <Box sx={{
                width: 42, height: 42, borderRadius: '13px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha(accent, 0.12), color: accent,
            }}>
                {icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Typography>
                {loading ? <Skeleton width={80} height={26} /> : (
                    <Typography sx={{ fontSize: 19, fontWeight: 900, color: '#0f172a' }}>{value}</Typography>
                )}
                {sub && <Typography sx={{ fontSize: 10.5, color: '#94a3b8' }}>{sub}</Typography>}
            </Box>
        </Paper>
    );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid #eef2f6', bgcolor: '#fff', p: 2.5, boxShadow: '0 2px 14px rgba(15,23,42,0.04)' }}>
            <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>{title}</Typography>
            {subtitle && <Typography sx={{ fontSize: 12, color: '#94a3b8', mb: 1.5 }}>{subtitle}</Typography>}
            {children}
        </Paper>
    );
}

export default function PersonaRetentionTab() {
    const { data, isLoading, isError, error } = useQuery({ queryKey: ['persona-retention'], queryFn: personaApi.getRetentionStats });

    const months = (data?.monthlyTrend ?? []).map(m => fmtMonth(m.month));

    const trendOpts: ApexOptions = {
        chart: { type: 'bar', stacked: true, toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
        xaxis: { categories: months, labels: { style: { fontSize: '11px', colors: '#94a3b8' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { fontSize: '11px', colors: '#94a3b8' } } },
        colors: ['#0ea5e9', GREEN],
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        legend: { position: 'bottom', fontSize: '12px', markers: { size: 6 } },
        tooltip: { y: { formatter: v => `${v} khách` } },
    };

    const freq = data?.frequencyDistribution;
    const freqOpts: ApexOptions = {
        chart: { type: 'donut', fontFamily: 'inherit' },
        labels: ['Mua 1 lần', '2-3 lần', '4-10 lần', 'Trên 10 lần'],
        colors: ['#bbf7d0', '#4ade80', '#16a34a', '#065f2d'],
        legend: { position: 'bottom', fontSize: '12px' },
        dataLabels: { enabled: false },
        stroke: { width: 2, colors: ['#fff'] },
    };

    const dormancy = data?.dormancySegments;
    const dormancyOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 4, distributed: true } },
        xaxis: {
            categories: ['Hoạt động (≤30 ngày)', 'Bắt đầu im ắng (30-60)', 'Im ắng (60-90)', 'Lâu không quay lại (90+)', 'Chưa từng mua'],
            labels: { style: { fontSize: '11px', colors: '#94a3b8' } },
        },
        colors: ['#16a34a', '#eab308', '#f97316', '#dc2626', '#94a3b8'],
        dataLabels: { enabled: true, style: { fontSize: '11px', colors: ['#fff'] } },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {isError && (
                <Box sx={{ p: 2, borderRadius: '14px', border: '1px solid #fecaca', bgcolor: '#fef2f2', color: '#991b1b', fontSize: 13, fontWeight: 600 }}>
                    {errMessage(error, 'Không tải được số liệu tỉ lệ quay lại')}
                </Box>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Kpi icon={<ReplayRoundedIcon />} label="Tỉ lệ quay lại TB" value={`${(data?.avgReturnRatePercent ?? 0).toFixed(1)}%`}
                    sub="Trung bình 12 tháng gần nhất" accent={GREEN} loading={isLoading} />
                <Kpi icon={<ScheduleRoundedIcon />} label="TB ngày giữa 2 đơn" value={Math.round(data?.avgDaysBetweenOrders ?? 0)}
                    sub="Khách có ≥2 đơn" accent="#0ea5e9" loading={isLoading} />
                <Kpi icon={<Filter2RoundedIcon />} label="TB ngày đến đơn thứ 2" value={Math.round(data?.avgDaysToSecondPurchase ?? 0)}
                    sub="Từ đơn đầu tiên" accent="#8b5cf6" loading={isLoading} />
                <Kpi icon={<WarningAmberRoundedIcon />} label="Nguy cơ rời bỏ" value={data?.atRiskCount ?? 0}
                    sub="≥2 đơn, 60-180 ngày chưa quay lại" accent="#f97316" loading={isLoading} />
            </Box>

            <SectionCard title="Khách mới vs khách quay lại theo tháng" subtitle="12 tháng gần nhất — 1 khách tính &quot;quay lại&quot; nếu đã từng mua trước tháng đó">
                {isLoading ? <Skeleton height={260} /> : months.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, py: 8 }}>Chưa có dữ liệu</Typography>
                ) : (
                    <ReactApexChart type="bar" height={260} options={trendOpts} series={[
                        { name: 'Khách mới', data: (data?.monthlyTrend ?? []).map(m => m.newCustomers) },
                        { name: 'Khách quay lại', data: (data?.monthlyTrend ?? []).map(m => m.returningCustomers) },
                    ]} />
                )}
            </SectionCard>

            <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'stretch' }}>
                <Box sx={{ flex: '1 1 340px', minWidth: 300 }}>
                    <SectionCard title="Tần suất mua (lũy kế)" subtitle="Toàn bộ lịch sử mua của khách">
                        {isLoading || !freq ? <Skeleton height={260} /> : (
                            <ReactApexChart type="donut" height={280} options={freqOpts}
                                series={[freq.once, freq.twoToThree, freq.fourToTen, freq.moreThanTen]} />
                        )}
                    </SectionCard>
                </Box>
                <Box sx={{ flex: '2 1 480px', minWidth: 380 }}>
                    <SectionCard title="Mức độ &quot;im ắng&quot; của khách" subtitle="Tính theo số ngày kể từ đơn gần nhất">
                        {isLoading || !dormancy ? <Skeleton height={260} /> : (
                            <ReactApexChart type="bar" height={280} options={dormancyOpts}
                                series={[{ name: 'Số khách', data: [dormancy.active30, dormancy.dormant30To60, dormancy.dormant60To90, dormancy.dormant90Plus, dormancy.neverBought] }]} />
                        )}
                    </SectionCard>
                </Box>
            </Box>

            <SectionCard title="Top 20 khách hàng thân thiết" subtitle="Xếp theo số đơn hàng (≥2 đơn), sau đó theo doanh thu">
                {isLoading ? <Skeleton height={280} /> : data && data.topLoyalCustomers.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 460, overflowY: 'auto' }}>
                        {data.topLoyalCustomers.map((c, i) => (
                            <Box key={c.customerId} sx={{
                                display: 'flex', alignItems: 'center', gap: 1.25, py: 0.9, px: 1, borderRadius: '10px',
                                '&:hover': { bgcolor: '#f8fafc' },
                            }}>
                                <Box sx={{
                                    width: 24, height: 24, borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11.5, fontWeight: 800,
                                    bgcolor: i === 0 ? alpha('#f59e0b', 0.15) : '#f1f5f9',
                                    color: i === 0 ? '#f59e0b' : '#94a3b8',
                                }}>
                                    {i === 0 ? <EmojiEventsRoundedIcon sx={{ fontSize: 14 }} /> : i + 1}
                                </Box>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {c.name}
                                        </Typography>
                                        {c.isBusinessCustomer && (
                                            <Chip label="DN" size="small" sx={{ height: 16, fontSize: 9.5, fontWeight: 800, bgcolor: alpha('#0ea5e9', 0.12), color: '#0284c7' }} />
                                        )}
                                    </Box>
                                    <Typography sx={{ fontSize: 10.5, color: '#94a3b8' }}>{c.phone || '—'}</Typography>
                                </Box>
                                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: GREEN, flexShrink: 0 }}>{c.totalOrders} đơn</Typography>
                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', flexShrink: 0, minWidth: 90, textAlign: 'right' }}>
                                    {fmtCompactVnd(c.totalRevenue)}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Typography sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, py: 8 }}>Chưa có khách hàng mua từ 2 lần trở lên</Typography>
                )}
            </SectionCard>
        </Box>
    );
}
