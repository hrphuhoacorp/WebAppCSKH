'use client';

import React from 'react';
import {
    Box, Chip, Paper, Skeleton, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography, alpha,
} from '@mui/material';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useQuery } from '@tanstack/react-query';
import { vppApi, VPP_GREEN, VPP_GROUPS } from '../api/vpp.api';

const GREEN = VPP_GREEN;
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';

function StatCard({ label, value, sub, color, icon, loading }: { label: string; value: string | number; sub: string; color: string; icon: React.ReactNode; loading?: boolean }) {
    return (
        <Paper elevation={0} sx={{
            p: 2.5, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff',
            boxShadow: '0 2px 16px rgba(8,104,57,0.05)', position: 'relative', overflow: 'hidden',
            '&::after': { content: '""', position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, bgcolor: color },
        }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ width: 42, height: 42, borderRadius: '13px', bgcolor: alpha(color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 21, color }, border: `1px solid ${alpha(color, 0.14)}`, flexShrink: 0 }}>
                    {icon}
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.55px', mb: 0.5 }}>{label}</Typography>
                    {loading
                        ? <Skeleton width={60} height={32} />
                        : <Typography sx={{ fontSize: typeof value === 'string' && value.length > 10 ? 18 : 28, fontWeight: 900, color: '#1e293b', lineHeight: 1.1 }}>{value}</Typography>
                    }
                    <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.5 }}>{sub}</Typography>
                </Box>
            </Box>
        </Paper>
    );
}

export default function TabOverview() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { data: inv, isLoading } = useQuery({
        queryKey: ['vpp-inventory', month, year],
        queryFn: () => vppApi.getInventory(month, year),
    });

    const alertRows = inv?.rows.filter(r => r.stockStatus !== 'normal') ?? [];

    return (
        <Box sx={{ height: '100%', overflow: 'auto' }}>
            {/* Stat cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                <StatCard label="Tổng vật tư" value={inv?.rows.length ?? 0} sub="Đang theo dõi" color={GREEN} icon={<InventoryRoundedIcon />} loading={isLoading} />
                <StatCard label="Sắp hết hàng" value={inv?.lowStockCount ?? 0} sub="Dưới mức tối thiểu" color="#f59e0b" icon={<WarningAmberRoundedIcon />} loading={isLoading} />
                <StatCard label="Hết hàng" value={inv?.outOfStockCount ?? 0} sub="Tồn kho = 0" color="#dc2626" icon={<ErrorOutlineRoundedIcon />} loading={isLoading} />
                <StatCard label="Tổng giá trị kho" value={inv ? (inv.totalValue.toLocaleString('vi-VN') + 'đ') : '—'} sub={`Tháng ${month}/${year}`} color="#0284c7" icon={<MonetizationOnRoundedIcon />} loading={isLoading} />
            </Box>

            {/* Alert table */}
            {!isLoading && alertRows.length > 0 && (
                <>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 1.5 }}>
                        Cần chú ý — vật tư sắp hết / hết hàng
                    </Typography>
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'auto' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    {['Mã', 'Tên vật tư', 'Nhóm', 'ĐVT', 'Tồn min', 'Tồn hiện tại', 'Trạng thái'].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 800, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8, bgcolor: '#dc2626' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {alertRows.map((row, i) => (
                                    <TableRow key={row.itemId} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#fff5f5', '& > *': { borderBottom: '1px solid #fef2f2 !important' } }}>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.4, borderRadius: '6px', display: 'inline-block' }}>{row.code}</Box>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, py: 1.5 }}>{row.name}</TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Chip label={VPP_GROUPS.find(g => g.value === row.group)?.label ?? row.group} size="small" sx={{ fontSize: 11, fontWeight: 600, borderRadius: '8px', height: 22 }} />
                                        </TableCell>
                                        <TableCell sx={{ color: '#64748b', py: 1.5 }}>{row.unit}</TableCell>
                                        <TableCell align="center" sx={{ py: 1.5 }}>{row.minStock}</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800, py: 1.5, color: row.stockStatus === 'out_of_stock' ? '#dc2626' : '#f59e0b' }}>{row.closingQty}</TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            {row.stockStatus === 'out_of_stock'
                                                ? <Chip label="Hết hàng" size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />
                                                : <Chip label="Sắp hết" size="small" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />
                                            }
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}

            {!isLoading && alertRows.length === 0 && inv && (
                <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, p: 5, textAlign: 'center', bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                    <CheckCircleRoundedIcon sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
                    <Typography sx={{ fontWeight: 700, color: '#15803d', fontSize: 16 }}>Tồn kho ổn định</Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: 13, mt: 0.5 }}>Tất cả vật tư đều ở mức an toàn trong tháng {month}/{year}</Typography>
                </Paper>
            )}
        </Box>
    );
}
