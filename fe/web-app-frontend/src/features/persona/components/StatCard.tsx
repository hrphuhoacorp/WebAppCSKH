'use client';

import { Paper, Typography, Skeleton } from '@mui/material';
import { BORDER, CARD_RADIUS } from '../styles';

export default function StatCard({ label, value, color, loading }: {
    label: string;
    value: React.ReactNode;
    color?: string;
    loading?: boolean;
}) {
    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', flex: 1, minWidth: 160 }}>
            <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 700, mb: 0.5 }}>{label}</Typography>
            {loading ? (
                <Skeleton width={70} height={32} />
            ) : (
                <Typography sx={{ fontSize: 24, fontWeight: 900, color: color ?? '#0f172a' }}>{value}</Typography>
            )}
        </Paper>
    );
}
