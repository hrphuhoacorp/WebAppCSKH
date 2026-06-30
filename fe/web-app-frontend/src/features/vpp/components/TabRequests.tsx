'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, MenuItem, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TablePagination, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vppApi, VPP_GREEN } from '../api/vpp.api';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

const GREEN = VPP_GREEN;
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
    pending:    { label: 'Chờ duyệt',  bg: '#fef3c7', color: '#b45309' },
    approved:   { label: 'Đã duyệt',   bg: '#dcfce7', color: '#15803d' },
    rejected:   { label: 'Từ chối',    bg: '#fee2e2', color: '#dc2626' },
    dispatched: { label: 'Đã xuất kho', bg: '#dbeafe', color: '#2563eb' },
};

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: GREEN } },
    '& label.Mui-focused': { color: GREEN },
};

function fmtDate(s?: string | null) {
    if (!s) return '-';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TabRequests() {
    const qc = useQueryClient();
    const canApprove = usePermission('vpp.request.approve');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput), 400);
        return () => clearTimeout(t);
    }, [searchInput]);
    const [detailId, setDetailId] = useState<number | null>(null);
    const [approveId, setApproveId] = useState<number | null>(null);
    const [approveNote, setApproveNote] = useState('');
    const [approveLines, setApproveLines] = useState<{ lineId: number; qty: number }[]>([]);
    const [rejectId, setRejectId] = useState<number | null>(null);
    const [adminNote, setAdminNote] = useState('');

    useEffect(() => { setPage(0); }, [status]);

    const { data, isLoading } = useQuery({
        queryKey: ['vpp-requests', status, page, rowsPerPage],
        queryFn: () => vppApi.getRequests({ status: status || undefined, page: page + 1, pageSize: rowsPerPage }),
    });

    const { data: detail, isLoading: detailLoading } = useQuery({
        queryKey: ['vpp-request-detail', detailId],
        queryFn: () => vppApi.getRequestById(detailId!),
        enabled: !!detailId,
    });

    const { data: approveDetail, isLoading: approveDetailLoading } = useQuery({
        queryKey: ['vpp-request-approve', approveId],
        queryFn: () => vppApi.getRequestById(approveId!),
        enabled: !!approveId,
    });

    const approveMonth = new Date().getMonth() + 1;
    const approveYear = new Date().getFullYear();
    const { data: inventoryData } = useQuery({
        queryKey: ['vpp-inventory-approve', approveMonth, approveYear],
        queryFn: () => vppApi.getInventory(approveMonth, approveYear),
        enabled: !!approveId,
    });

    // Initialize approveLines once both detail and inventory are loaded
    useEffect(() => {
        if (!approveDetail || !inventoryData) return;
        setApproveLines(approveDetail.lines.map(l => {
            const inv = inventoryData.rows.find(r => r.itemId === l.itemId);
            const avail = inv?.closingQty ?? 0;
            return { lineId: l.id, qty: avail > 0 ? Math.min(l.quantity, avail) : l.quantity };
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [approveDetail?.id, !!inventoryData]);

    const approveMut = useMutation({
        mutationFn: ({ id, note, lines }: { id: number; note: string; lines: { lineId: number; quantity: number }[] }) =>
            vppApi.approveRequest(id, note, lines),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['vpp-requests'] });
            setApproveId(null); setApproveNote(''); setApproveLines([]);
            toast.success('Đã duyệt và tạo phiếu xuất kho');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => { toast.error(err?.response?.data?.message || err?.response?.data?.Message || 'Duyệt thất bại'); },
    });

    const rejectMut = useMutation({
        mutationFn: ({ id, note }: { id: number; note: string }) => vppApi.rejectRequest(id, note),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['vpp-requests'] }); setRejectId(null); setAdminNote(''); toast.success('Đã từ chối đề nghị'); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => { toast.error(err?.response?.data?.message || err?.response?.data?.Message || 'Từ chối thất bại'); },
    });

    const q = search.trim().toLowerCase();
    const requests = (data?.items ?? []).filter(r =>
        !q || r.requesterName.toLowerCase().includes(q)
            || (r.department ?? '').toLowerCase().includes(q)
            || (r.reason ?? '').toLowerCase().includes(q)
    );
    const total = data?.totalItems ?? 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Filter */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <FilterListRoundedIcon sx={{ color: GREEN, fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Bộ lọc</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        size="small" placeholder="Tìm người đề nghị / bộ phận..."
                        value={searchInput} onChange={e => setSearchInput(e.target.value)}
                        sx={{ ...fieldSx, width: 240 }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }}
                    />
                    <TextField select size="small" label="Trạng thái" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} sx={{ ...fieldSx, minWidth: 180 }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                    </TextField>
                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', px: 2, py: 0.75 }}>
                        <Typography sx={{ fontWeight: 700, color: GREEN, fontSize: 13 }}>{total} đề nghị</Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, overflow: 'auto', flex: 1, minHeight: 0, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {['#', 'Người đề nghị', 'Bộ phận', 'Lý do', 'Ngày tạo', 'Trạng thái', 'Thao tác'].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 800, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8, bgcolor: GREEN }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                        ) : requests.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>Chưa có đề nghị nào</Typography>
                            </TableCell></TableRow>
                        ) : requests.map((req, i) => {
                            const s = STATUS_MAP[req.status] ?? { label: req.status, bg: '#f1f5f9', color: '#475569' };
                            return (
                                <TableRow key={req.id} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#fbfefc', '&:hover': { bgcolor: '#f0fdf4 !important' }, transition: 'background 0.15s', '& > *': { borderBottom: '1px solid #f1f5f9 !important' } }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontFamily: 'monospace', py: 1.5 }}>#{req.id}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, py: 1.5 }}>{req.requesterName}</TableCell>
                                    <TableCell sx={{ color: '#64748b', py: 1.5 }}>{req.department}</TableCell>
                                    <TableCell sx={{ color: '#64748b', maxWidth: 200, py: 1.5 }}>{req.reason || '—'}</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', whiteSpace: 'nowrap', py: 1.5 }}>{fmtDate(req.createdAt)}</TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <Tooltip title="Xem chi tiết" arrow>
                                                <IconButton size="small" onClick={() => setDetailId(req.id)} sx={{ color: '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { color: GREEN, bgcolor: alpha(GREEN, 0.08) } }}>
                                                    <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                            {canApprove && req.status === 'pending' && (
                                                <>
                                                    <Tooltip title="Duyệt" arrow>
                                                        <IconButton size="small" onClick={() => setApproveId(req.id)}
                                                            sx={{ color: '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { color: '#15803d', bgcolor: '#dcfce7' } }}>
                                                            <CheckRoundedIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Từ chối" arrow>
                                                        <IconButton size="small" onClick={() => setRejectId(req.id)}
                                                            sx={{ color: '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { color: '#dc2626', bgcolor: '#fee2e2' } }}>
                                                            <CloseRoundedIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                rowsPerPageOptions={[10, 20, 50, 100]}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                labelRowsPerPage="Hiển thị:"
                sx={{ border: `1px solid ${BORDER}`, borderTop: 0, borderRadius: `0 0 ${CARD_RADIUS} ${CARD_RADIUS}`, bgcolor: '#fff' }}
            />

            {/* Detail Dialog */}
            <Dialog open={!!detailId} onClose={() => setDetailId(null)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Chi tiết đề nghị #{detailId}</DialogTitle>
                <DialogContent>
                    {detailLoading ? (
                        <Typography sx={{ color: '#94a3b8', py: 2 }}>Đang tải...</Typography>
                    ) : detail ? (
                        <Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2.5 }}>
                                {[
                                    ['Người đề nghị', detail.requesterName],
                                    ['Bộ phận', detail.department],
                                    ['Lý do', detail.reason || '—'],
                                    ['Giá tham khảo', detail.referencePrice || '—'],
                                    ['Ngày tạo', fmtDate(detail.createdAt)],
                                    ['Ghi chú admin', detail.adminNote || '—'],
                                ].map(([label, value]) => (
                                    <Box key={label}>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.4 }}>{label}</Typography>
                                        <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{value}</Typography>
                                    </Box>
                                ))}
                            </Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1, color: '#475569' }}>Danh sách vật tư yêu cầu</Typography>
                            <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            {['Mã', 'Tên vật tư', 'ĐVT', 'Số lượng', 'Ghi chú'].map(h => (
                                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {detail.lines.map(l => (
                                            <TableRow key={l.id} sx={{ '&:last-child td': { border: 0 } }}>
                                                <TableCell><Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.3, borderRadius: '6px' }}>{l.itemCode}</Box></TableCell>
                                                <TableCell sx={{ fontWeight: 500 }}>{l.itemName}</TableCell>
                                                <TableCell sx={{ color: '#64748b' }}>{l.unit}</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 800, color: GREEN }}>{l.quantity}</TableCell>
                                                <TableCell sx={{ color: '#64748b' }}>{l.note || '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDetailId(null)} sx={{ textTransform: 'none', borderRadius: '12px', color: '#64748b' }}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog
                open={!!approveId}
                onClose={() => { setApproveId(null); setApproveNote(''); setApproveLines([]); }}
                maxWidth="md" fullWidth
                slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}
            >
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b', pb: 1 }}>
                    Duyệt đề nghị #{approveId} — Điều chỉnh số lượng xuất
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    {approveDetailLoading || !approveDetail ? (
                        <Typography sx={{ color: '#94a3b8', py: 3 }}>Đang tải...</Typography>
                    ) : (
                        <Box>
                            {/* Thông tin người đề nghị */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2, p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: `1px solid ${BORDER}` }}>
                                {([
                                    ['Người đề nghị', approveDetail.requesterName],
                                    ['Chi nhánh', approveDetail.branch || '—'],
                                    ['Bộ phận', approveDetail.department || '—'],
                                    ['Lý do', approveDetail.reason || '—'],
                                    ['Giá tham khảo', approveDetail.referencePrice || '—'],
                                    ['Ngày gửi', fmtDate(approveDetail.createdAt)],
                                ] as [string, string][]).map(([label, value]) => (
                                    <Box key={label}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.3 }}>{label}</Typography>
                                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{value}</Typography>
                                    </Box>
                                ))}
                            </Box>
                            <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '12px', mb: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            {['Vật tư', 'ĐVT', 'Yêu cầu', 'Tồn kho', 'Số lượng duyệt'].map(h => (
                                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px', py: 1.5 }}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {approveDetail.lines.map(line => {
                                            const inv = inventoryData?.rows.find(r => r.itemId === line.itemId);
                                            const available = inv?.closingQty ?? 0;
                                            const lineState = approveLines.find(l => l.lineId === line.id);
                                            const qty = lineState?.qty ?? 0;
                                            const overStock = qty > available;
                                            const stockColor = available === 0 ? '#dc2626' : available < line.quantity ? '#b45309' : '#15803d';
                                            return (
                                                <TableRow key={line.id} sx={{ '&:last-child td': { border: 0 }, bgcolor: qty === 0 ? '#fafafa' : '#fff' }}>
                                                    <TableCell sx={{ py: 1.5 }}>
                                                        <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', mr: 0.5 }}>{line.itemCode}</Box>
                                                        <Box component="span" sx={{ fontWeight: 600, fontSize: 13 }}>{line.itemName}</Box>
                                                    </TableCell>
                                                    <TableCell sx={{ color: '#64748b', py: 1.5 }}>{line.unit}</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 700, py: 1.5 }}>{line.quantity}</TableCell>
                                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                                        <Box component="span" sx={{ fontWeight: 800, color: stockColor }}>{available}</Box>
                                                        {available < line.quantity && available > 0 && (
                                                            <Typography sx={{ fontSize: 10, color: '#b45309', lineHeight: 1.2 }}>thiếu {line.quantity - available}</Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1 }}>
                                                        <TextField
                                                            size="small" type="number"
                                                            value={qty}
                                                            onChange={e => {
                                                                const v = Math.max(0, Number(e.target.value));
                                                                setApproveLines(prev => prev.map(l => l.lineId === line.id ? { ...l, qty: v } : l));
                                                            }}
                                                            slotProps={{ htmlInput: { min: 0, max: line.quantity, style: { textAlign: 'center', fontWeight: 700, padding: '6px 8px' } } }}
                                                            error={overStock}
                                                            helperText={overStock ? `Tối đa tồn ${available}` : qty === 0 ? 'Bỏ qua dòng này' : undefined}
                                                            sx={{
                                                                width: 110,
                                                                '& .MuiOutlinedInput-root': { borderRadius: '10px', '&.Mui-focused fieldset': { borderColor: overStock ? '#dc2626' : GREEN } },
                                                                '& .MuiFormHelperText-root': { fontSize: 10, mx: 0 },
                                                            }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TextField
                                label="Ghi chú admin (tuỳ chọn)" multiline rows={2} fullWidth size="small"
                                value={approveNote} onChange={e => setApproveNote(e.target.value)}
                                placeholder="Ghi chú khi duyệt (lý do điều chỉnh, v.v.)..."
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: GREEN } } }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined"
                        onClick={() => { setApproveId(null); setApproveNote(''); setApproveLines([]); }}
                        sx={{ textTransform: 'none', borderRadius: '12px', borderColor: BORDER, color: '#64748b' }}>
                        Hủy
                    </Button>
                    <Button fullWidth variant="contained"
                        onClick={() => {
                            if (!approveId) return;
                            const validLines = approveLines.filter(l => l.qty > 0);
                            approveMut.mutate({
                                id: approveId,
                                note: approveNote,
                                lines: validLines.map(l => ({ lineId: l.lineId, quantity: l.qty })),
                            });
                        }}
                        disabled={
                            approveMut.isPending ||
                            approveLines.filter(l => l.qty > 0).length === 0 ||
                            approveLines.some(al => {
                                const line = approveDetail?.lines.find(l => l.id === al.lineId);
                                const inv = inventoryData?.rows.find(r => r.itemId === line?.itemId);
                                return al.qty > (inv?.closingQty ?? 0);
                            })
                        }
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px', bgcolor: '#15803d', '&:hover': { bgcolor: '#14532d' } }}>
                        {approveMut.isPending
                            ? 'Đang xử lý...'
                            : `Duyệt ${approveLines.filter(l => l.qty > 0).length} / ${approveDetail?.lines.length ?? 0} dòng`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={!!rejectId} onClose={() => setRejectId(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, p: 1 } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Từ chối đề nghị #{rejectId}</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Lý do từ chối" multiline rows={3} fullWidth size="small"
                        value={adminNote} onChange={e => setAdminNote(e.target.value)}
                        sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: '#dc2626' } } }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setRejectId(null)} sx={{ textTransform: 'none', borderRadius: '12px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" color="error" onClick={() => rejectId && rejectMut.mutate({ id: rejectId, note: adminNote })}
                        disabled={rejectMut.isPending} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}>
                        {rejectMut.isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
