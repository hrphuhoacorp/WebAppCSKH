'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { Box, Paper, Typography } from '@mui/material';
import { BORDER, CARD_RADIUS } from '../styles';
import { PersonaTagDistribution } from '../api/persona.api';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

function ChartCard({ title, subtitle, children, height = 260 }: {
    title: string; subtitle?: string; children: React.ReactNode; height?: number;
}) {
    return (
        <Paper elevation={0} sx={{ flex: 1, minWidth: 280, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff' }}>
            <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{title}</Typography>
                {subtitle && <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>{subtitle}</Typography>}
            </Box>
            <Box sx={{ px: 1, pb: 1, minHeight: height }}>{children}</Box>
        </Paper>
    );
}

export default function TagDistributionChart({ data }: { data: PersonaTagDistribution[] }) {
    if (data.length === 0) {
        return (
            <ChartCard title="Phân bố khách theo tag" subtitle="Chưa có khách nào được gắn tag">
                <Typography sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, py: 6 }}>Chưa có dữ liệu</Typography>
            </ChartCard>
        );
    }

    const opts: ApexOptions = {
        chart: { type: 'donut', fontFamily: 'inherit' },
        labels: data.map(d => d.tagName),
        colors: data.map(d => d.tagColor),
        legend: { position: 'bottom', fontSize: '12px' },
        dataLabels: { enabled: false },
        stroke: { width: 0 },
    };

    return (
        <ChartCard title="Phân bố khách theo tag" subtitle={`${data.length} tag đang có khách gắn`} height={300}>
            <ReactApexChart type="donut" height={300} options={opts} series={data.map(d => d.count)} />
        </ChartCard>
    );
}
