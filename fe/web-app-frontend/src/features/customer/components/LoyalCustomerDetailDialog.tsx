'use client';

import {
    Dialog, DialogTitle, DialogContent, Box, Typography, IconButton,
    Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, alpha, Skeleton, Divider,
} from '@mui/material';
import { Close, ShoppingBag, TrendingUp, Schedule, Star } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { customerApi } from '@/features/customer/api/customer.api';
import { LoyalCustomerDTO } from '@/features/customer/api/returnRate.api';
import toast from 'react-hot-toast';

const VND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('vi-VN') : '—';

interface Props {
    customer: LoyalCustomerDTO | null;
    onClose: () => void;
}

export default function LoyalCustomerDetailDialog({ customer, onClose }: Props) {
    const open = Boolean(customer);
    const [detail, setDetail] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!customer) { setDetail(null); return; }
        const fetch = async () => {
            try {
                setLoading(true);
                const res = await customerApi.getCustomerById(customer.id);
                setDetail(res.content);
            } catch {
                toast.error('Không tải được chi tiết khách hàng');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [customer?.id]);

    // Tính category preference từ items
    const catMap: Record<string, number> = {};
    detail?.orders?.forEach((ord: any) => {
        ord.items?.forEach((oi: any) => {
            if (oi.category) catMap[oi.category] = (catMap[oi.category] || 0) + 1;
        });
    });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const palette = ['#7c3aed', '#086839', '#0ea5e9', '#f59e0b', '#ef4444', '#ec4899'];

    // Tính avg days between orders từ order dates
    const orders: any[] = detail?.orders ?? [];
    const orderDates = orders
        .map((o: any) => new Date(o.purchaseDate))
        .sort((a, b) => a.getTime() - b.getTime());

    let avgGap = 0;
    if (orderDates.length >= 2) {
        const gaps = orderDates.slice(1).map((d, i) =>
            (d.getTime() - orderDates[i].getTime()) / (1000 * 60 * 60 * 24)
        );
        avgGap = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
    }

    const totalItems = orders.reduce((s: number, o: any) => s + (o.items?.length ?? 0), 0);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: '20px', p: 0.5, boxShadow: '0 24px 60px rgba(0,0,0,0.14)' } } }}
        >
            <DialogTitle sx={{ m: 0, p: 2.5, pb: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Avatar */}
                        <Box sx={{
                            width: 52, height: 52, borderRadius: '14px',
                            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22, fontWeight: 900, color: '#fff', flexShrink: 0,
                        }}>
                            {customer?.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </Box>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                                <Typography sx={{ fontWeight: 900, fontSize: 18, color: '#0f172a', letterSpacing: '-0.3px' }}>
                                    {customer?.name}
                                </Typography>
                                <Chip
                                    icon={<Star sx={{ fontSize: '13px !important', color: '#f59e0b !important' }} />}
                                    label="Trung thành"
                                    size="small"
                                    sx={{ bgcolor: alpha('#f59e0b', 0.1), color: '#b45309', fontWeight: 700, fontSize: 10, height: 20, border: `1px solid ${alpha('#f59e0b', 0.3)}` }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                <Typography sx={{ fontSize: 12, color: '#86efac', fontFamily: 'monospace', fontWeight: 700, bgcolor: '#166534', px: 1, py: 0.2, borderRadius: '4px' }}>
                                    {customer?.customerCode}
                                </Typography>
                                {customer?.phone && (
                                    <Typography sx={{ fontSize: 12, color: '#64748b' }}>{customer.phone}</Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#475569', bgcolor: '#f1f5f9' } }}>
                        <Close sx={{ fontSize: 20 }} />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 2.5 }}>
                {/* ── KPI strip ── */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, my: 2 }}>
                    {[
                        { label: 'Tổng đơn', value: customer?.orderCount ?? '—', icon: <ShoppingBag sx={{ fontSize: 16 }} />, color: '#7c3aed' },
                        { label: 'Tổng doanh thu', value: customer ? VND(customer.totalRevenue) : '—', icon: <TrendingUp sx={{ fontSize: 16 }} />, color: '#086839' },
                        { label: 'Giá trị TB/đơn', value: customer ? VND(customer.avgOrderValue) : '—', icon: <Star sx={{ fontSize: 16 }} />, color: '#f59e0b' },
                        { label: 'Chu kỳ mua TB', value: customer?.avgDaysBetweenOrders ? `${customer.avgDaysBetweenOrders} ngày` : '—', icon: <Schedule sx={{ fontSize: 16 }} />, color: '#0ea5e9' },
                    ].map(k => (
                        <Paper key={k.label} elevation={0} sx={{
                            p: 1.5, borderRadius: '12px', border: `1.5px solid ${alpha(k.color, 0.18)}`,
                            bgcolor: alpha(k.color, 0.04), textAlign: 'center',
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5, color: k.color }}>{k.icon}</Box>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: alpha(k.color, 0.7), textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.3 }}>
                                {k.label}
                            </Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 900, color: k.color, lineHeight: 1.2 }}>{k.value}</Typography>
                        </Paper>
                    ))}
                </Box>

                {/* ── Secondary info ── */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
                    <InfoChip label="Lần đầu mua" value={fmtDate(customer?.firstOrderAt)} />
                    <InfoChip label="Lần cuối mua" value={fmtDate(customer?.lastOrderAt)} />
                    <InfoChip label="Chưa mua" value={(customer?.daysSinceLastOrder ?? -1) >= 0 ? `${customer!.daysSinceLastOrder} ngày` : '—'} alert={(customer?.daysSinceLastOrder ?? 0) > 90} />
                    <InfoChip label="Sản phẩm đã mua" value={`${totalItems} sản phẩm`} />
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* ── Category preference ── */}
                {(loading || sortedCats.length > 0) && (
                    <Box sx={{ mb: 2.5 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.2 }}>
                            🎯 Sở thích & nhu cầu
                        </Typography>
                        {loading ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {[1,2,3,4].map(i => <Skeleton key={i} width={80} height={26} sx={{ borderRadius: '10px' }} />)}
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {sortedCats.map(([cat, cnt], i) => {
                                    const color = palette[i % palette.length];
                                    const maxCnt = sortedCats[0][1];
                                    const isTop = cnt === maxCnt;
                                    return (
                                        <Chip
                                            key={cat}
                                            label={`${cat}  ×${cnt}`}
                                            sx={{
                                                bgcolor: alpha(color, isTop ? 0.18 : 0.08),
                                                color,
                                                fontWeight: isTop ? 800 : 600,
                                                border: `1px solid ${alpha(color, isTop ? 0.4 : 0.2)}`,
                                                fontSize: isTop ? 12 : 11,
                                                height: isTop ? 28 : 24,
                                            }}
                                        />
                                    );
                                })}
                            </Box>
                        )}
                    </Box>
                )}

                <Divider sx={{ mb: 2 }} />

                {/* ── Order history ── */}
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5 }}>
                    📋 Lịch sử đơn hàng
                </Typography>
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', maxHeight: 320 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow sx={{ '& th': { bgcolor: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px', py: 1.2, borderColor: '#e2e8f0' } }}>
                                <TableCell>Mã đơn</TableCell>
                                <TableCell>Ngày mua</TableCell>
                                <TableCell>Nguồn</TableCell>
                                <TableCell align="right">Doanh thu</TableCell>
                                <TableCell>Sản phẩm</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 5 }).map((__, j) => (
                                            <TableCell key={j}><Skeleton height={18} /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#94a3b8' }}>Chưa có đơn hàng</TableCell>
                                </TableRow>
                            ) : (
                                [...orders]
                                    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
                                    .map((ord, idx) => (
                                        <TableRow key={ord.id} sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#fafcfb', '&:hover': { bgcolor: '#f5f3ff' }, '& td': { borderColor: '#f1f5f9', py: 1.1 } }}>
                                            <TableCell sx={{ fontWeight: 700, color: '#7c3aed', fontSize: 12, fontFamily: 'monospace' }}>{ord.orderCode}</TableCell>
                                            <TableCell sx={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(ord.purchaseDate)}</TableCell>
                                            <TableCell>
                                                {ord.source ? (
                                                    <Chip label={ord.source} size="small" sx={{ fontSize: 10, height: 20, fontWeight: 600, bgcolor: '#f1f5f9', color: '#475569' }} />
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', fontSize: 12, whiteSpace: 'nowrap' }}>
                                                {VND(ord.revenue)}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {ord.items?.slice(0, 3).map((oi: any, ii: number) => (
                                                        <Chip
                                                            key={ii}
                                                            label={oi.productName || oi.category || '—'}
                                                            size="small"
                                                            sx={{ fontSize: 10, height: 18, maxWidth: 120, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
                                                        />
                                                    ))}
                                                    {(ord.items?.length ?? 0) > 3 && (
                                                        <Chip label={`+${ord.items.length - 3}`} size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#f1f5f9', color: '#64748b' }} />
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
        </Dialog>
    );
}

function InfoChip({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
    return (
        <Box sx={{
            px: 1.5, py: 0.8, borderRadius: '10px',
            bgcolor: alert ? alpha('#ef4444', 0.08) : '#f8fafc',
            border: `1px solid ${alert ? alpha('#ef4444', 0.25) : '#e2e8f0'}`,
            display: 'flex', alignItems: 'center', gap: 1,
        }}>
            <Typography sx={{ fontSize: 11, color: alert ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>{label}:</Typography>
            <Typography sx={{ fontSize: 12, color: alert ? '#dc2626' : '#334155', fontWeight: 800 }}>{value}</Typography>
        </Box>
    );
}
