'use client';

import { Box, Tooltip, Typography } from '@mui/material';
import { CustomerSignatureCategory } from '../api/persona.api';

const RANK_COLORS = ['#086839', '#3d9467', '#8fc7ab'];
const OTHER_COLOR = '#e2e8f0';

function fmtCompactVnd(v: number): string {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + ' tỷ đ';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' triệu đ';
    return v.toLocaleString('vi-VN') + 'đ';
}

export default function CustomerSignatureBar({ signature, width = 200 }: {
    signature: CustomerSignatureCategory[];
    width?: number;
}) {
    if (signature.length === 0) {
        return <Typography sx={{ fontSize: 12, color: '#cbd5e1' }}>Chưa có dữ liệu mua hàng</Typography>;
    }

    const top = signature[0];
    const coveredPercent = signature.reduce((sum, s) => sum + s.sharePercent, 0);
    const otherPercent = Math.max(0, 100 - coveredPercent);

    const tooltip = (
        <Box sx={{ py: 0.5 }}>
            {signature.map((s, i) => (
                <Box key={s.category} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: RANK_COLORS[i], flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 12, flex: 1 }}>{s.category}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, ml: 1 }}>{s.sharePercent.toFixed(0)}%</Typography>
                    <Typography sx={{ fontSize: 11, color: '#94a3b8', ml: 0.5 }}>{fmtCompactVnd(s.revenue)}</Typography>
                </Box>
            ))}
            {otherPercent > 0.5 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: OTHER_COLOR, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 12, flex: 1, color: '#94a3b8' }}>Nhóm khác</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, ml: 1, color: '#94a3b8' }}>{otherPercent.toFixed(0)}%</Typography>
                </Box>
            )}
        </Box>
    );

    return (
        <Tooltip title={tooltip} arrow placement="top">
            <Box sx={{ width, cursor: 'default' }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#086839', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {top.category}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', flexShrink: 0 }}>
                        {top.sharePercent.toFixed(0)}%
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: '2px', height: 6, borderRadius: '3px', overflow: 'hidden', bgcolor: OTHER_COLOR }}>
                    {signature.map((s, i) => (
                        <Box key={s.category} sx={{ width: `${s.sharePercent}%`, bgcolor: RANK_COLORS[i], minWidth: s.sharePercent > 0 ? 3 : 0 }} />
                    ))}
                </Box>
            </Box>
        </Tooltip>
    );
}
