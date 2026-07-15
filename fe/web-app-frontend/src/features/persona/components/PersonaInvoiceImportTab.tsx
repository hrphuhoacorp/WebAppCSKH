'use client';

import { useRef, useState } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell,
    TablePagination, Chip, CircularProgress,
} from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { personaApi } from '../api/persona.api';
import { BORDER, CARD_RADIUS, GREEN } from '../styles';
import { errMessage } from '@/lib/errMessage';

function formatDateTime(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('vi-VN');
}

export default function PersonaInvoiceImportTab() {
    const qc = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    const { data: importsPage, isLoading } = useQuery({
        queryKey: ['persona-invoice-imports', page, pageSize],
        queryFn: () => personaApi.getInvoiceImports({ page: page + 1, pageSize }),
    });

    const items = importsPage?.items ?? [];
    const total = importsPage?.totalItems ?? 0;

    async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setUploading(true);
        try {
            const result = await personaApi.importInvoices(file);
            toast.success(`Đã nạp xong — khớp ${result.matchedRows}, không khớp ${result.unmatchedRows}`);
            if (result.sampleUnmatchedOrderCodes.length > 0) {
                toast(`Mã đơn không tìm thấy (mẫu): ${result.sampleUnmatchedOrderCodes.slice(0, 5).join(', ')}...`, { icon: '⚠️', duration: 6000 });
            }
            qc.invalidateQueries({ queryKey: ['persona-invoice-imports'] });
            qc.invalidateQueries({ queryKey: ['persona-business-customers'] });
        } catch (err) {
            toast.error(errMessage(err, 'Nạp file thất bại'));
        } finally {
            setUploading(false);
        }
    }

    return (
        <Box>
            <Paper elevation={0} sx={{ p: 3, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.5 }}>Nạp file &quot;Danh sách hóa đơn&quot; từ Sapo</Typography>
                <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2 }}>
                    Dòng nào có cột &quot;Tên đơn vị&quot; khác rỗng sẽ được khớp về đơn hàng qua &quot;Mã đơn hàng&quot; và đánh dấu khách hàng đó là khách hàng doanh nghiệp.
                    Nạp lại file không tạo trùng dữ liệu — chỉ cập nhật.
                </Typography>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileSelected} />
                <Button
                    variant="contained"
                    startIcon={uploading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <UploadFileRoundedIcon />}
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ bgcolor: GREEN, textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: '#065530' } }}
                >
                    {uploading ? 'Đang nạp...' : 'Chọn file & Nạp'}
                </Button>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Tên file</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Người nạp</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Thời gian</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Tổng dòng</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Khớp</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Không khớp</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                            ) : items.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94a3b8' }}>Chưa có lần nạp nào</TableCell></TableRow>
                            ) : items.map(i => (
                                <TableRow key={i.id} hover>
                                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{i.fileName}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{i.importedByName || '—'}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{formatDateTime(i.importedAt)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 13 }}>{i.totalRows.toLocaleString('vi-VN')}</TableCell>
                                    <TableCell align="right">
                                        <Chip label={i.matchedRows.toLocaleString('vi-VN')} size="small"
                                            sx={{ bgcolor: 'rgba(8,104,57,0.1)', color: GREEN, fontWeight: 700, fontSize: 12 }} />
                                    </TableCell>
                                    <TableCell align="right">
                                        {i.unmatchedRows > 0 ? (
                                            <Chip label={i.unmatchedRows.toLocaleString('vi-VN')} size="small"
                                                sx={{ bgcolor: 'rgba(220,38,38,0.1)', color: '#dc2626', fontWeight: 700, fontSize: 12 }} />
                                        ) : (
                                            <Typography sx={{ fontSize: 12.5, color: '#94a3b8' }}>0</Typography>
                                        )}
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
                    rowsPerPageOptions={[20, 50, 100]}
                    labelRowsPerPage="Số dòng:"
                    sx={{ borderTop: `1px solid ${BORDER}` }}
                />
            </Paper>
        </Box>
    );
}
