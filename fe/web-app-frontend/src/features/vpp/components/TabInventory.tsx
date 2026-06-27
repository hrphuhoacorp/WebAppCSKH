'use client';

import React, { useState } from 'react';
import {
    Box, Chip, InputAdornment, MenuItem, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useQuery } from '@tanstack/react-query';
import { vppApi, VPP_GREEN, VPP_GROUPS } from '../api/vpp.api';

const GREEN = VPP_GREEN;
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: GREEN } },
    '& label.Mui-focused': { color: GREEN },
};

function StatusChip({ status }: { status: string }) {
    if (status === 'out_of_stock') return <Chip label="Hết hàng" size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />;
    if (status === 'low') return <Chip label="Sắp hết" size="small" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />;
    return <Chip label="Ổn định" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />;
}

export default function TabInventory() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [search, setSearch] = useState('');

    const { data: inv, isLoading } = useQuery({
        queryKey: ['vpp-inventory', month, year],
        queryFn: () => vppApi.getInventory(month, year),
    });

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
    const q = search.trim().toLowerCase();
    const rows = (inv?.rows ?? []).filter(r =>
        !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Filter + summary */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        size="small" placeholder="Tìm mã / tên vật tư..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        sx={{ ...fieldSx, width: 240 }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }}
                    />
                    <TextField select size="small" label="Tháng" value={month} onChange={e => setMonth(+e.target.value)} sx={{ ...fieldSx, minWidth: 130 }}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <MenuItem key={m} value={m}>Tháng {m}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Năm" value={year} onChange={e => setYear(+e.target.value)} sx={{ ...fieldSx, minWidth: 100 }}>
                        {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </TextField>
                    {inv && (
                        <Box sx={{ ml: 'auto', display: 'flex', gap: 3 }}>
                            {[
                                { label: 'Giá trị kho', value: inv.totalValue.toLocaleString('vi-VN') + 'đ', color: '#0f766e' },
                                { label: 'Hết hàng', value: String(inv.outOfStockCount), color: '#dc2626' },
                                { label: 'Sắp hết', value: String(inv.lowStockCount), color: '#f59e0b' },
                            ].map(s => (
                                <Box key={s.label} sx={{ textAlign: 'right' }}>
                                    <Typography sx={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</Typography>
                                    <Typography sx={{ fontWeight: 800, color: s.color, fontSize: 16 }}>{s.value}</Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'auto', flex: 1, minHeight: 0 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {['Mã', 'Nhóm', 'Tên vật tư', 'ĐVT', 'Đầu kỳ', 'Nhập', 'Xuất', 'Điều chỉnh', 'Cuối kỳ', 'Giá trị', 'Trạng thái'].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 800, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8, bgcolor: GREEN, whiteSpace: 'nowrap' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow><TableCell colSpan={11} align="center" sx={{ py: 8 }}>
                                <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>{!inv ? `Chưa có dữ liệu tồn kho tháng ${month}/${year}` : 'Không tìm thấy vật tư phù hợp'}</Typography>
                            </TableCell></TableRow>
                        ) : rows.map((row, i) => (
                            <TableRow key={row.itemId} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#fbfefc', '&:hover': { bgcolor: '#f0fdf4 !important' }, transition: 'background 0.15s', '& > *': { borderBottom: '1px solid #f1f5f9 !important' } }}>
                                <TableCell sx={{ py: 1.5 }}>
                                    <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.4, borderRadius: '6px', display: 'inline-block' }}>{row.code}</Box>
                                </TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                    <Chip label={VPP_GROUPS.find(g => g.value === row.group)?.label ?? row.group} size="small" sx={{ fontSize: 11, fontWeight: 600, borderRadius: '8px', height: 22 }} />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 500, maxWidth: 200, fontSize: 13, py: 1.5 }}>{row.name}</TableCell>
                                <TableCell sx={{ color: '#64748b', py: 1.5 }}>{row.unit}</TableCell>
                                <TableCell align="center" sx={{ py: 1.5 }}>{row.openingQty}</TableCell>
                                <TableCell align="center" sx={{ color: '#0284c7', fontWeight: 600, py: 1.5 }}>{row.importedQty > 0 ? `+${row.importedQty}` : row.importedQty}</TableCell>
                                <TableCell align="center" sx={{ color: '#dc2626', fontWeight: 600, py: 1.5 }}>{row.dispatchedQty > 0 ? `-${row.dispatchedQty}` : row.dispatchedQty}</TableCell>
                                <TableCell align="center" sx={{ color: row.adjustedQty >= 0 ? '#15803d' : '#dc2626', fontWeight: 600, py: 1.5 }}>{row.adjustedQty > 0 ? `+${row.adjustedQty}` : row.adjustedQty}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: row.closingQty <= 0 ? '#dc2626' : '#1e293b', py: 1.5 }}>{row.closingQty}</TableCell>
                                <TableCell sx={{ color: '#0f766e', fontWeight: 700, whiteSpace: 'nowrap', py: 1.5 }}>{row.totalValue.toLocaleString('vi-VN')}đ</TableCell>
                                <TableCell sx={{ py: 1.5 }}><StatusChip status={row.stockStatus} /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
