'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { Typography } from '@mui/material';
import { PersonaCategoryStats } from '../api/persona.api';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

function fmtVnd(v: number): string {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + ' tỷ';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(0) + 'tr';
    return v.toLocaleString('vi-VN');
}

export default function PersonaTopCategoriesChart({ data }: { data: PersonaCategoryStats[] }) {
    if (data.length === 0) {
        return <Typography sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, py: 8 }}>Chưa có dữ liệu nhóm hàng</Typography>;
    }

    const sorted = [...data].reverse();

    const opts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 4 } },
        xaxis: { categories: sorted.map(d => d.category), labels: { formatter: v => fmtVnd(Number(v)), style: { fontSize: '11px', colors: '#94a3b8' } } },
        yaxis: { labels: { style: { fontSize: '11.5px', colors: '#334155' } } },
        colors: ['#086839'],
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        tooltip: { y: { formatter: v => v.toLocaleString('vi-VN') + 'đ' } },
    };

    return <ReactApexChart type="bar" height={Math.max(260, sorted.length * 34)} options={opts} series={[{ name: 'Doanh thu', data: sorted.map(d => d.totalRevenue) }]} />;
}
