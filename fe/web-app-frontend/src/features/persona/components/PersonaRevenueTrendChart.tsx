'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { Box, Typography } from '@mui/material';
import { PersonaMonthlyRevenuePoint, PersonaTagMonthlySeries } from '../api/persona.api';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

function fmtMonth(m: string): string {
    const [y, mo] = m.split('-');
    return `${mo}/${y.slice(2)}`;
}

function fmtVnd(v: number): string {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + ' tỷ';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(0) + 'tr';
    return v.toLocaleString('vi-VN');
}

export default function PersonaRevenueTrendChart({ overall, topTags }: {
    overall: PersonaMonthlyRevenuePoint[];
    topTags: PersonaTagMonthlySeries[];
}) {
    if (overall.length === 0) {
        return <Typography sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, py: 8 }}>Chưa có dữ liệu doanh thu</Typography>;
    }

    const categories = overall.map(p => fmtMonth(p.month));

    const overallOpts: ApexOptions = {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', sparkline: { enabled: false } },
        xaxis: { categories, labels: { style: { fontSize: '11px', colors: '#94a3b8' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { formatter: v => fmtVnd(v), style: { fontSize: '11px', colors: '#94a3b8' } } },
        colors: ['#086839'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] } },
        stroke: { curve: 'smooth', width: 2.5 },
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        tooltip: { y: { formatter: v => v.toLocaleString('vi-VN') + 'đ' } },
        markers: { size: 0, hover: { size: 5 } },
    };

    return (
        <Box>
            <ReactApexChart type="area" height={260} options={overallOpts} series={[{ name: 'Doanh thu', data: overall.map(p => p.totalRevenue) }]} />

            {topTags.length > 0 && (
                <Box sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#94a3b8', mb: 1, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                        Top {topTags.length} chân dung giá trị nhất theo tháng
                    </Typography>
                    <ReactApexChart
                        type="line"
                        height={240}
                        options={{
                            chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit' },
                            xaxis: { categories, labels: { style: { fontSize: '11px', colors: '#94a3b8' } }, axisBorder: { show: false }, axisTicks: { show: false } },
                            yaxis: { labels: { formatter: v => fmtVnd(v), style: { fontSize: '11px', colors: '#94a3b8' } } },
                            colors: topTags.map(t => t.tagColor),
                            stroke: { curve: 'smooth', width: 2 },
                            dataLabels: { enabled: false },
                            grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
                            legend: { position: 'bottom', fontSize: '12px', markers: { size: 6 } },
                            tooltip: { y: { formatter: v => v.toLocaleString('vi-VN') + 'đ' } },
                            markers: { size: 0, hover: { size: 5 } },
                        }}
                        series={topTags.map(t => ({ name: t.tagName, data: t.points.map(p => p.totalRevenue) }))}
                    />
                </Box>
            )}
        </Box>
    );
}
