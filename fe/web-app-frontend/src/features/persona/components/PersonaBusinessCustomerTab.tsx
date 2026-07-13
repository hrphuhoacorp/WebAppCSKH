'use client';

import { useState } from 'react';
import {
    Box, Paper, TextField, InputAdornment, Table, TableHead, TableBody, TableRow, TableCell,
    TablePagination,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useQuery } from '@tanstack/react-query';
import { personaApi } from '../api/persona.api';
import { BORDER, CARD_RADIUS } from '../styles';

function formatDate(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('vi-VN');
}

function formatCurrency(value: number): string {
    return value.toLocaleString('vi-VN') + 'đ';
}

export default function PersonaBusinessCustomerTab() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);

    const { data: customersPage, isLoading } = useQuery({
        queryKey: ['persona-business-customers', search, page, pageSize],
        queryFn: () => personaApi.getBusinessCustomers({ search: search || undefined, page: page + 1, pageSize }),
    });

    const items = customersPage?.items ?? [];
    const total = customersPage?.totalItems ?? 0;

    return (
        <Box>
            <Paper elevation={0} sx={{ p: 2, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2 }}>
                <TextField
                    size="small"
                    placeholder="Tìm theo tên, SĐT, mã khách hàng..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0); }}
                    sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13 } }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }}
                />
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Mã KH</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Tên khách hàng</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>SĐT</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Tên đơn vị (hóa đơn gần nhất)</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Số hóa đơn</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Hóa đơn gần nhất</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Tổng doanh thu</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                            ) : items.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>Chưa có khách hàng doanh nghiệp nào — nạp file hóa đơn ở tab &quot;Nạp hóa đơn doanh nghiệp&quot;</TableCell></TableRow>
                            ) : items.map(c => (
                                <TableRow key={c.customerId} hover>
                                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{c.customerCode}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{c.name}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{c.phone || '—'}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{c.latestCompanyName || '—'}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 13 }}>{c.invoiceCount}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{formatDate(c.latestInvoiceDate)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>{formatCurrency(c.totalRevenue)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={pageSize}
                    onPageChange={(_, p) => setPage(p)}
                    onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[25, 50, 100]}
                    labelRowsPerPage="Số dòng:"
                    sx={{ borderTop: `1px solid ${BORDER}` }}
                />
            </Paper>
        </Box>
    );
}
