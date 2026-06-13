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
    badge?: string;
    badgeColor?: string;
}

export default function LoyalCustomerDetailDialog({ customer, onClose, badge = 'Thân thiết', badgeColor = '#f59e0b' }: Props) {
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

    const catMap: Record<string, number> = {};
    detail?.orders?.forEach((ord: any) => {
        ord.items?.forEach((oi: any) => {
            if (oi.category) catMap[oi.category] = (catMap[oi.category] || 0) + 1;
        });
    });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const palette = ['#7c3aed', '#086839', '#0ea5e9', '#f59e0b', '#ef4444', '#ec4899'];

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
            maxWidth="lg"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: '24px', p: 0, boxShadow: '0 32px 80px rgba(0,0,0,0.16)', overflow: 'hidden' } } }}
        >
            {/* ── Header with gradient banner ── */}
            <Box sx={{
                background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #a855f7 100%)',
                px: 3.5, pt: 3.5, pb: 2.5,
                position: 'relative',
            }}>
                <IconButton
                    onClick={onClose}
                    sx={{ position: 'absolute', top: 14, right: 14, color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' } }}
                >
                    <Close sx={{ fontSize: 22 }} />
                </IconButton>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                    {/* Avatar */}
                    <Box sx={{
                        width: 68, height: 68, borderRadius: '18px', flexShrink: 0,
                        background: 'rgba(255,255,255,0.18)',
                        border: '2px solid rgba(255,255,255,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, fontWeight: 900, color: '#fff',
                        backdropFilter: 'blur(8px)',
                    }}>
                        {customer?.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </Box>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5 }}>
                            <Typography sx={{ fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
                                {customer?.name}
                            </Typography>
                            <Chip
                                icon={<Star sx={{ fontSize: '14px !important', color: `${badgeColor} !important` }} />}
                                label={badge}
                                size="small"
                                sx={{
                                    bgcolor: alpha(badgeColor, 0.2),
                                    color: badgeColor === '#f59e0b' ? '#fde68a' : '#fff',
                                    fontWeight: 800,
                                    fontSize: 11,
                                    height: 22,
                                    border: `1px solid ${alpha(badgeColor, 0.5)}`,
                                    backdropFilter: 'blur(4px)',
                                }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace', fontWeight: 700, bgcolor: 'rgba(0,0,0,0.2)', px: 1.2, py: 0.3, borderRadius: '6px' }}>
                                {customer?.customerCode}
                            </Typography>
                            {customer?.phone && (
                                <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{customer.phone}</Typography>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>

            <DialogContent sx={{ p: 3.5 }}>
                {/* ── KPI strip ── */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3, mt: 0.5 }}>
                    {[
                        { label: 'Tổng đơn hàng', value: customer?.orderCount ?? (customer as any)?.totalOrders ?? '—', icon: <ShoppingBag sx={{ fontSize: 20 }} />, color: '#7c3aed' },
                        { label: 'Tổng doanh thu', value: customer ? VND(customer.totalRevenue) : '—', icon: <TrendingUp sx={{ fontSize: 20 }} />, color: '#086839' },
                        { label: 'Giá trị TB / đơn', value: customer ? VND(customer.avgOrderValue) : '—', icon: <Star sx={{ fontSize: 20 }} />, color: '#f59e0b' },
                        { label: 'Chu kỳ mua TB', value: avgGap > 0 ? `${avgGap} ngày` : customer?.avgDaysBetweenOrders ? `${customer.avgDaysBetweenOrders} ngày` : '—', icon: <Schedule sx={{ fontSize: 20 }} />, color: '#0ea5e9' },
                    ].map(k => (
                        <Paper key={k.label} elevation={0} sx={{
                            p: 2.5, borderRadius: '16px', border: `1.5px solid ${alpha(k.color, 0.18)}`,
                            bgcolor: alpha(k.color, 0.04), textAlign: 'center',
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.8, color: k.color }}>{k.icon}</Box>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: alpha(k.color, 0.7), textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.4 }}>
                                {k.label}
                            </Typography>
                            <Typography sx={{ fontSize: 15, fontWeight: 900, color: k.color, lineHeight: 1.2 }}>{k.value}</Typography>
                        </Paper>
                    ))}
                </Box>

                {/* ── Secondary info chips ── */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
                    <InfoChip label="Lần đầu mua" value={fmtDate(customer?.firstOrderAt)} />
                    <InfoChip label="Lần cuối mua" value={fmtDate(customer?.lastOrderAt)} />
                    <InfoChip
                        label="Chưa mua"
                        value={(customer?.daysSinceLastOrder ?? -1) >= 0 ? `${customer!.daysSinceLastOrder} ngày` : '—'}
                        alert={(customer?.daysSinceLastOrder ?? 0) > 90}
                    />
                    <InfoChip label="Sản phẩm đã mua" value={loading ? '...' : `${totalItems} sản phẩm`} />
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                {/* ── Category preference ── */}
                {(loading || sortedCats.length > 0) && (
                    <Box sx={{ mb: 3 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5 }}>
                            🎯 Sở thích & nhu cầu
                        </Typography>
                        {loading ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {[1, 2, 3, 4].map(i => <Skeleton key={i} width={90} height={30} sx={{ borderRadius: '10px' }} />)}
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2 }}>
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
                                                fontSize: isTop ? 13 : 12,
                                                height: isTop ? 32 : 28,
                                            }}
                                        />
                                    );
                                })}
                            </Box>
                        )}
                    </Box>
                )}

                <Divider sx={{ mb: 2.5 }} />

                {/* ── Order history ── */}
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 2 }}>
                    📋 Lịch sử đơn hàng
                    {orders.length > 0 && (
                        <Typography component="span" sx={{ ml: 1, fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'none', letterSpacing: 0 }}>
                            ({orders.length} đơn)
                        </Typography>
                    )}
                </Typography>
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', maxHeight: 420 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow sx={{ '& th': { bgcolor: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', py: 1.5, borderColor: '#e2e8f0' } }}>
                                <TableCell>Mã đơn</TableCell>
                                <TableCell>Ngày mua</TableCell>
                                <TableCell>Nguồn</TableCell>
                                <TableCell align="right">Doanh thu</TableCell>
                                <TableCell>Sản phẩm</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 5 }).map((__, j) => (
                                            <TableCell key={j}><Skeleton height={20} /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 5, color: '#94a3b8', fontSize: 14 }}>Chưa có đơn hàng</TableCell>
                                </TableRow>
                            ) : (
                                [...orders]
                                    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
                                    .map((ord, idx) => (
                                        <TableRow key={ord.id} sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#fafcfb', '&:hover': { bgcolor: '#f5f3ff' }, '& td': { borderColor: '#f1f5f9', py: 1.4, fontSize: 13 } }}>
                                            <TableCell sx={{ fontWeight: 700, color: '#7c3aed', fontFamily: 'monospace' }}>{ord.orderCode}</TableCell>
                                            <TableCell sx={{ color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(ord.purchaseDate)}</TableCell>
                                            <TableCell>
                                                {ord.source ? (
                                                    <Chip label={ord.source} size="small" sx={{ fontSize: 11, height: 22, fontWeight: 600, bgcolor: '#f1f5f9', color: '#475569' }} />
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                                {VND(ord.revenue)}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {ord.items?.slice(0, 3).map((oi: any, ii: number) => (
                                                        <Chip
                                                            key={ii}
                                                            label={oi.productName || oi.category || '—'}
                                                            size="small"
                                                            sx={{ fontSize: 11, height: 20, maxWidth: 140, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
                                                        />
                                                    ))}
                                                    {(ord.items?.length ?? 0) > 3 && (
                                                        <Chip label={`+${ord.items.length - 3}`} size="small" sx={{ fontSize: 11, height: 20, bgcolor: '#f1f5f9', color: '#64748b' }} />
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
            px: 2, py: 1, borderRadius: '12px',
            bgcolor: alert ? alpha('#ef4444', 0.08) : '#f8fafc',
            border: `1px solid ${alert ? alpha('#ef4444', 0.25) : '#e2e8f0'}`,
            display: 'flex', alignItems: 'center', gap: 1.2,
        }}>
            <Typography sx={{ fontSize: 12, color: alert ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>{label}:</Typography>
            <Typography sx={{ fontSize: 13, color: alert ? '#dc2626' : '#334155', fontWeight: 800 }}>{value}</Typography>
        </Box>
    );
}
