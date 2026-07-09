// Bộ token/thành phần dùng chung cho toàn bộ module XNT — khớp đúng ngôn ngữ thiết kế đã dùng ở
// VPP (src/features/vpp/components/TabOverview.tsx, TabStockCount.tsx) và Đơn hàng
// (src/app/dashboard/sales/orders/page.tsx): bo góc 20px cho khối lớn/12px cho input-nút,
// viền #e2e8f0, bóng đổ xanh nhạt, MUI TextField/Select/Button/Chip thay cho input/select/button
// thô. Import từ đây thay vì định nghĩa lại sx trùng lặp ở mỗi tab.
import React from 'react';
import { Box, Chip, Paper, Skeleton, Typography, alpha } from '@mui/material';

export const GREEN = '#086839';
export const CARD_RADIUS = '20px';
export const BORDER = '#e2e8f0';
export const PAGE_BG = '#f0f7f3';
export const PAGE_BG_IMAGE = 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)';

export const cardSx = {
    borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff',
    boxShadow: '0 2px 16px rgba(8,104,57,0.05)', p: { xs: 2, md: 2.5 }, mb: 2,
} as const;

// Áp cho TextField/Select MUI — bo góc 12px, viền/label đổi màu xanh khi focus.
export const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '12px', bgcolor: '#fff',
        '& fieldset': { borderColor: BORDER },
        '&:hover fieldset': { borderColor: alpha(GREEN, 0.5) },
        '&.Mui-focused fieldset': { borderColor: GREEN, borderWidth: 1.5 },
    },
    '& label.Mui-focused': { color: GREEN },
} as const;

export const primaryBtnSx = {
    bgcolor: GREEN, borderRadius: '12px', fontWeight: 700, textTransform: 'none', fontSize: 13,
    boxShadow: 'none', px: 2, '&:hover': { bgcolor: '#065f2d', boxShadow: 'none' },
} as const;

export const ghostBtnSx = {
    borderColor: alpha(GREEN, 0.3), color: GREEN, bgcolor: alpha(GREEN, 0.06),
    borderRadius: '12px', fontWeight: 700, textTransform: 'none', fontSize: 13,
    '&:hover': { bgcolor: alpha(GREEN, 0.12), borderColor: alpha(GREEN, 0.5) },
} as const;

export const dangerBtnSx = {
    bgcolor: '#dc2626', borderRadius: '12px', fontWeight: 700, textTransform: 'none', fontSize: 13,
    boxShadow: 'none', '&:hover': { bgcolor: '#b91c1c', boxShadow: 'none' },
} as const;

// Header ô bảng — nền xanh, chữ trắng, khớp đúng bảng cảnh báo VPP/TabOverview.
export const thSx = {
    bgcolor: GREEN, color: '#fff', fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: '0.5px', py: 1.5, textAlign: 'center', whiteSpace: 'nowrap', border: 'none',
} as const;
export const thLSx = { ...thSx, textAlign: 'left' } as const;

export const tableContainerSx = {
    borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
} as const;

export function zebraRowSx(index: number) {
    return { bgcolor: index % 2 === 0 ? '#fff' : '#fafcfb', '&:hover': { bgcolor: alpha(GREEN, 0.04) } } as const;
}

export const hintBoxSx = {
    bgcolor: alpha(GREEN, 0.06), border: `1px solid ${alpha(GREEN, 0.2)}`, borderRadius: '14px',
    p: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.6, mb: 1.5,
} as const;
export const warnBoxSx = { ...hintBoxSx, bgcolor: '#fffbeb', border: '1px solid #fde68a', color: '#78350f' } as const;
export const errBoxSx = { ...hintBoxSx, bgcolor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' } as const;
export const okBoxSx = { ...hintBoxSx, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' } as const;

export const sectionTitleSx = {
    fontWeight: 800, fontSize: 14, color: '#1e293b', mb: 1, mt: 0.5,
} as const;

// ── StatCard — khớp đúng pattern src/features/vpp/components/TabOverview.tsx ──────────────────
export function StatCard({ label, value, color = GREEN, loading }: {
    label: string; value: React.ReactNode; color?: string; loading?: boolean;
}) {
    return (
        <Paper elevation={0} sx={{
            p: 1.75, borderRadius: '16px', border: `1px solid ${alpha(color, 0.18)}`,
            background: `linear-gradient(135deg, #fff 60%, ${alpha(color, 0.06)} 100%)`,
            textAlign: 'center', transition: 'box-shadow .15s, border-color .15s',
            '&:hover': { boxShadow: `0 4px 16px ${alpha(color, 0.18)}`, borderColor: alpha(color, 0.4) },
        }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', lineHeight: 1.3 }}>
                {label}
            </Typography>
            {loading ? (
                <Skeleton width={48} height={30} sx={{ mx: 'auto', mt: 0.5 }} />
            ) : (
                <Typography sx={{ fontSize: 20, fontWeight: 900, mt: 0.5, color: '#1e293b', lineHeight: 1.2 }}>{value}</Typography>
            )}
        </Paper>
    );
}

// ── Chip trạng thái Lệch/Khớp ────────────────────────────────────────────────────────────────
export function DiffChip({ diff }: { diff: number }) {
    if (diff === 0) return <Chip label="Khớp" size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />;
    return <Chip label={diff} size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />;
}

// ── Chip DTT/CTT/luân chuyển — thay .stock-badge/.transfer-badge CSS cũ ────────────────────────
export function StockLabelChip({ label, tone }: { label: string; tone: 'dtt' | 'ctt' | 'warn' | 'in' | 'out' }) {
    const TONES: Record<typeof tone, { bg: string; color: string; border: string }> = {
        dtt: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
        ctt: { bg: '#fef9c3', color: '#854d0e', border: '#fde68a' },
        warn: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
        in: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
        out: { bg: '#fef9c3', color: '#854d0e', border: '#fde68a' },
    };
    const t = TONES[tone];
    return (
        <Chip label={label} size="small" sx={{
            bgcolor: t.bg, color: t.color, border: `1px solid ${t.border}`,
            fontWeight: 700, fontSize: 10.5, borderRadius: '8px', height: 20,
        }} />
    );
}

export function EmptyState({ text }: { text: string }) {
    return (
        <Box sx={{ border: '1px dashed #d1d5db', bgcolor: '#f9fafb', borderRadius: '12px', p: 2.5, textAlign: 'center', color: '#6b7280', fontWeight: 700, fontSize: 13 }}>
            {text}
        </Box>
    );
}
