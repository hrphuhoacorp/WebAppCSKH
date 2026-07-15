'use client';

import { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Table, TableHead,
    TableBody, TableRow, TableCell, Chip, TextField, InputAdornment, TablePagination,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useQuery } from '@tanstack/react-query';
import { personaApi, PersonaTagDto } from '../api/persona.api';
import { BORDER, CARD_RADIUS } from '../styles';
import CustomerSignatureBar from './CustomerSignatureBar';
import { errMessage } from '@/lib/errMessage';

function fmtCompactVnd(v: number): string {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + ' tỷ đ';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' triệu đ';
    return v.toLocaleString('vi-VN') + 'đ';
}

export default function TagCustomerListDialog({ open, tag, onClose }: {
    open: boolean;
    tag: PersonaTagDto | null;
    onClose: () => void;
}) {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 500);
        return () => clearTimeout(t);
    }, [search]);

    const { data: customersPage, isLoading, isError, error } = useQuery({
        queryKey: ['persona-tag-customer-list', tag?.id, debouncedSearch, page, pageSize],
        queryFn: () => personaApi.getCustomersWithTags({ search: debouncedSearch || undefined, tagId: tag!.id, page: page + 1, pageSize }),
        enabled: open && !!tag,
    });

    const items = customersPage?.items ?? [];
    const total = customersPage?.totalItems ?? 0;

    function handleClose() {
        setSearch('');
        setDebouncedSearch('');
        setPage(0);
        onClose();
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, maxHeight: '85vh' } } }}>
            <DialogTitle sx={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
                Danh sách khách hàng
                {tag && <Chip size="small" label={tag.name} sx={{ bgcolor: tag.color, color: '#fff', fontWeight: 700 }} />}
                <Typography component="span" sx={{ fontSize: 13, fontWeight: 500, color: '#94a3b8', ml: 'auto', mr: 1 }}>
                    {total} khách
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                <Box sx={{ px: 3, pb: 1.5 }}>
                    <TextField
                        size="small"
                        placeholder="Tìm theo tên, SĐT, mã khách hàng..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13 } }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }}
                    />
                </Box>
                <Box sx={{ overflowX: 'auto', borderTop: `1px solid ${BORDER}` }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Mã KH</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Tên khách hàng</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>SĐT</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Doanh thu</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Thường mua</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                            ) : isError ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: '#dc2626', fontWeight: 600 }}>{errMessage(error, 'Không tải được danh sách khách hàng')}</TableCell></TableRow>
                            ) : items.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: '#94a3b8' }}>Không có khách hàng nào</TableCell></TableRow>
                            ) : items.map(c => (
                                <TableRow key={c.id} hover>
                                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{c.customerCode}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{c.name}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{c.phone || '—'}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                                        {fmtCompactVnd(c.totalRevenue)}
                                    </TableCell>
                                    <TableCell>
                                        <CustomerSignatureBar signature={c.signature} width={220} />
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
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleClose} sx={{ textTransform: 'none', color: '#64748b' }}>Đóng</Button>
            </DialogActions>
        </Dialog>
    );
}
