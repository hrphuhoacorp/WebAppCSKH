'use client';

import { useState } from 'react';
import {
    Box, Paper, TextField, InputAdornment, Table, TableHead, TableBody, TableRow, TableCell,
    TablePagination, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LabelOffRoundedIcon from '@mui/icons-material/LabelOffRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { personaApi, BusinessCustomerDto } from '../api/persona.api';
import { BORDER, CARD_RADIUS } from '../styles';
import { errMessage } from '@/lib/errMessage';

function formatDate(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('vi-VN');
}

function formatCurrency(value: number): string {
    return value.toLocaleString('vi-VN') + 'đ';
}

export default function PersonaBusinessCustomerTab() {
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [removeTarget, setRemoveTarget] = useState<BusinessCustomerDto | null>(null);
    const [removing, setRemoving] = useState(false);

    const { data: customersPage, isLoading } = useQuery({
        queryKey: ['persona-business-customers', search, page, pageSize],
        queryFn: () => personaApi.getBusinessCustomers({ search: search || undefined, page: page + 1, pageSize }),
    });

    const items = customersPage?.items ?? [];
    const total = customersPage?.totalItems ?? 0;

    async function handleRemove() {
        if (!removeTarget) return;
        setRemoving(true);
        try {
            await personaApi.removeBusinessFlag(removeTarget.customerId);
            toast.success('Đã gỡ nhãn khách hàng doanh nghiệp');
            setRemoveTarget(null);
            qc.invalidateQueries({ queryKey: ['persona-business-customers'] });
            qc.invalidateQueries({ queryKey: ['persona-dashboard'] });
        } catch (err) {
            toast.error(errMessage(err, 'Gỡ nhãn thất bại'));
        } finally {
            setRemoving(false);
        }
    }

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
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                            ) : items.length === 0 ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94a3b8' }}>Chưa có khách hàng doanh nghiệp nào — nạp file hóa đơn ở tab &quot;Nạp hóa đơn doanh nghiệp&quot;</TableCell></TableRow>
                            ) : items.map(c => (
                                <TableRow key={c.customerId} hover>
                                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{c.customerCode}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{c.name}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{c.phone || '—'}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{c.latestCompanyName || '—'}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 13 }}>{c.invoiceCount}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{formatDate(c.latestInvoiceDate)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>{formatCurrency(c.totalRevenue)}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Gỡ nhãn khách hàng doanh nghiệp" arrow>
                                            <IconButton size="small" onClick={() => setRemoveTarget(c)}
                                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', color: '#dc2626' }}>
                                                <LabelOffRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
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

            <Dialog open={!!removeTarget} onClose={() => setRemoveTarget(null)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Gỡ nhãn doanh nghiệp?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 14, color: '#475569' }}>
                        Khách hàng <b>{removeTarget?.name}</b> sẽ không còn được tính là khách hàng doanh nghiệp — các tag tự động dựa trên tiêu chí này sẽ gỡ khỏi khách ở lần chạy phân loại kế tiếp.
                        Lịch sử hóa đơn đã nạp vẫn được giữ lại; nếu nạp lại đúng hóa đơn này sau, cờ sẽ tự bật lại.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setRemoveTarget(null)}
                        sx={{ textTransform: 'none', borderRadius: '10px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" color="error" disabled={removing} onClick={handleRemove}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Gỡ nhãn</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
