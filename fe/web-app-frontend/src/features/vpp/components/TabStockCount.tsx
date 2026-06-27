'use client';

import React, { useState } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, MenuItem, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vppApi, VPP_GREEN } from '../api/vpp.api';
import toast from 'react-hot-toast';

const GREEN = VPP_GREEN;
const TEAL = '#0f766e';
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '& fieldset': { borderColor: BORDER }, '&.Mui-focused fieldset': { borderColor: TEAL, borderWidth: 1.5 } },
    '& label.Mui-focused': { color: TEAL },
};

function fmtDate(s?: string) {
    if (!s) return '-';
    return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatusChip({ status }: { status: string }) {
    if (status === 'confirmed') return <Chip icon={<LockRoundedIcon sx={{ fontSize: '12px !important' }} />} label="Đã xác nhận" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 24, '& .MuiChip-icon': { color: '#15803d' } }} />;
    return <Chip icon={<FactCheckRoundedIcon sx={{ fontSize: '12px !important' }} />} label="Nháp" size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 24, '& .MuiChip-icon': { color: '#94a3b8' } }} />;
}

interface EditedLines { [lineId: number]: { actualQty: number; note: string } }

export default function TabStockCount() {
    const qc = useQueryClient();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [createOpen, setCreateOpen] = useState(false);
    const [detailId, setDetailId] = useState<number | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [countDate, setCountDate] = useState(now.toISOString().split('T')[0]);
    const [createNote, setCreateNote] = useState('');
    const [edited, setEdited] = useState<EditedLines>({});

    const { data: stockCountPage, isLoading } = useQuery({
        queryKey: ['vpp-stock-counts', month, year],
        queryFn: () => vppApi.getStockCounts({ month, year, page: 1, pageSize: 50 }),
    });
    const counts = stockCountPage?.items ?? [];

    const { data: detail, isLoading: detailLoading } = useQuery({
        queryKey: ['vpp-stock-count-detail', detailId],
        queryFn: () => vppApi.getStockCountById(detailId!),
        enabled: !!detailId,
    });

    const createMut = useMutation({
        mutationFn: () => vppApi.createStockCount({ countDate, periodMonth: month, periodYear: year, note: createNote || undefined }),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['vpp-stock-counts'] });
            setCreateOpen(false);
            setCreateNote('');
            setDetailId(data.id);
            setEdited({});
            toast.success('Đã tạo phiếu kiểm kho — hãy nhập số lượng thực tế');
        },
    });

    const saveLineMut = useMutation({
        mutationFn: ({ lineId, actualQty, note }: { lineId: number; actualQty: number; note: string }) =>
            vppApi.updateStockCountLine(detailId!, lineId, actualQty, note || undefined),
    });

    const confirmMut = useMutation({
        mutationFn: (id: number) => vppApi.confirmStockCount(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['vpp-stock-counts'] });
            qc.invalidateQueries({ queryKey: ['vpp-stock-count-detail', confirmId] });
            qc.invalidateQueries({ queryKey: ['vpp-inventory'] });
            setConfirmId(null);
            toast.success('Đã xác nhận kiểm kho — tồn kho đã được điều chỉnh');
        },
    });

    async function handleSaveAll() {
        const pending = Object.entries(edited);
        if (!pending.length) { toast('Không có thay đổi nào để lưu'); return; }
        try {
            await Promise.all(pending.map(([lineId, v]) => saveLineMut.mutateAsync({ lineId: +lineId, actualQty: v.actualQty, note: v.note })));
            qc.invalidateQueries({ queryKey: ['vpp-stock-count-detail', detailId] });
            setEdited({});
            toast.success('Đã lưu số lượng thực tế');
        } catch {
            toast.error('Có lỗi khi lưu, vui lòng thử lại');
        }
    }

    function getLine(lineId: number) { return edited[lineId]; }
    function setActual(lineId: number, originalActual: number, actualQty: number, note: string) {
        setEdited(prev => ({ ...prev, [lineId]: { actualQty, note } }));
    }

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
    const detailLines = detail?.lines ?? [];
    const isDraft = detail?.status === 'draft';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Filter */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField select size="small" label="Tháng" value={month} onChange={e => setMonth(+e.target.value)} sx={{ ...fieldSx, minWidth: 130 }}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <MenuItem key={m} value={m}>Tháng {m}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Năm" value={year} onChange={e => setYear(+e.target.value)} sx={{ ...fieldSx, minWidth: 100 }}>
                        {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </TextField>
                    <Box sx={{ flex: 1 }} />
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}
                        sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0d6461' }, borderRadius: '12px', textTransform: 'none', fontWeight: 700, height: 40 }}>
                        Tạo phiếu kiểm kho
                    </Button>
                </Box>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, overflow: 'auto', flex: 1, minHeight: 0, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {['#', 'Ngày kiểm', 'Kỳ', 'Trạng thái', 'Ghi chú', 'Người tạo', 'Xác nhận lúc', ''].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 800, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8, bgcolor: TEAL }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                        ) : counts.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>Chưa có phiếu kiểm kho trong tháng {month}/{year}</Typography>
                            </TableCell></TableRow>
                        ) : counts.map((c, i) => (
                            <TableRow key={c.id} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#f0fdfa', '&:hover': { bgcolor: '#ccfbf1 !important' }, transition: 'background 0.15s', '& > *': { borderBottom: '1px solid #f1f5f9 !important' } }}>
                                <TableCell sx={{ fontWeight: 700, color: '#475569', fontFamily: 'monospace', py: 1.5 }}>#{c.id}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap', py: 1.5 }}>{fmtDate(c.countDate)}</TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                    <Chip label={`T${c.periodMonth}/${c.periodYear}`} size="small" sx={{ bgcolor: alpha(TEAL, 0.1), color: TEAL, fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />
                                </TableCell>
                                <TableCell sx={{ py: 1.5 }}><StatusChip status={c.status} /></TableCell>
                                <TableCell sx={{ color: '#64748b', py: 1.5 }}>{c.note || '—'}</TableCell>
                                <TableCell sx={{ color: '#64748b', py: 1.5 }}>{c.createdBy}</TableCell>
                                <TableCell sx={{ color: '#94a3b8', py: 1.5, whiteSpace: 'nowrap' }}>{c.confirmedAt ? fmtDate(c.confirmedAt) : '—'}</TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                    <Tooltip title="Mở phiếu kiểm" arrow>
                                        <IconButton size="small" onClick={() => { setDetailId(c.id); setEdited({}); }}
                                            sx={{ color: '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { color: TEAL, bgcolor: alpha(TEAL, 0.08) } }}>
                                            <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, p: 1 } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Tạo phiếu kiểm kho mới</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
                    <Box sx={{ bgcolor: alpha(TEAL, 0.05), border: `1px solid ${alpha(TEAL, 0.15)}`, borderRadius: '12px', px: 2, py: 1.5 }}>
                        <Typography sx={{ fontSize: 13, color: TEAL, lineHeight: 1.6 }}>
                            Hệ thống sẽ tự động tạo danh sách tất cả vật tư với số lượng sổ sách hiện tại. Bạn nhập số lượng thực tế sau khi tạo.
                        </Typography>
                    </Box>
                    <TextField label="Ngày kiểm *" type="date" size="small" fullWidth sx={fieldSx} value={countDate} onChange={e => setCountDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField select size="small" label="Kỳ tháng" value={month} onChange={e => setMonth(+e.target.value)} sx={{ ...fieldSx, flex: 1 }}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <MenuItem key={m} value={m}>Tháng {m}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" label="Năm" value={year} onChange={e => setYear(+e.target.value)} sx={{ ...fieldSx, flex: 1 }}>
                            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </TextField>
                    </Box>
                    <TextField label="Ghi chú" size="small" fullWidth sx={fieldSx} value={createNote} onChange={e => setCreateNote(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none', borderRadius: '12px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" onClick={() => createMut.mutate()} disabled={createMut.isPending}
                        sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0d6461' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}>
                        {createMut.isPending ? 'Đang tạo...' : 'Tạo phiếu kiểm'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={!!detailId} onClose={() => { setDetailId(null); setEdited({}); }} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <FactCheckRoundedIcon sx={{ color: TEAL }} />
                    Phiếu kiểm kho #{detailId}
                    {detail && <StatusChip status={detail.status} />}
                    <Box sx={{ flex: 1 }} />
                    {isDraft && (
                        <Button variant="outlined" size="small" startIcon={<CheckCircleRoundedIcon />} onClick={() => setConfirmId(detailId)}
                            sx={{ textTransform: 'none', borderRadius: '10px', borderColor: '#15803d', color: '#15803d', fontWeight: 700, '&:hover': { bgcolor: '#dcfce7', borderColor: '#15803d' } }}>
                            Xác nhận kiểm kho
                        </Button>
                    )}
                </DialogTitle>
                <DialogContent>
                    {detailLoading ? (
                        <Typography sx={{ color: '#94a3b8', py: 2 }}>Đang tải...</Typography>
                    ) : detail ? (
                        <Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 2.5 }}>
                                {[
                                    ['Ngày kiểm', fmtDate(detail.countDate)],
                                    ['Kỳ', `Tháng ${detail.periodMonth}/${detail.periodYear}`],
                                    ['Người tạo', detail.createdBy],
                                    ['Ghi chú', detail.note || '—'],
                                ].map(([l, v]) => (
                                    <Box key={l}>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.4 }}>{l}</Typography>
                                        <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{v}</Typography>
                                    </Box>
                                ))}
                            </Box>

                            {isDraft && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Nhập số lượng thực tế
                                    </Typography>
                                    {Object.keys(edited).length > 0 && (
                                        <Button variant="contained" size="small" onClick={handleSaveAll} disabled={saveLineMut.isPending}
                                            sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0d6461' }, textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}>
                                            {saveLineMut.isPending ? 'Đang lưu...' : `Lưu ${Object.keys(edited).length} dòng`}
                                        </Button>
                                    )}
                                </Box>
                            )}

                            <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '12px', maxHeight: 480, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {['Mã', 'Tên vật tư', 'ĐVT', 'Sổ sách', 'Thực tế', 'Chênh lệch', 'Ghi chú'].map(h => (
                                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '2px solid #e2e8f0' }}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {detailLines.map((l, i) => {
                                            const e = getLine(l.id);
                                            const actualQty = e !== undefined ? e.actualQty : l.actualQty;
                                            const noteVal = e !== undefined ? e.note : l.note;
                                            const diff = actualQty - l.systemQty;
                                            const changed = e !== undefined;
                                            return (
                                                <TableRow key={l.id} sx={{ bgcolor: changed ? alpha(TEAL, 0.03) : (i % 2 === 0 ? '#fff' : '#fafafa'), '& > *': { borderBottom: '1px solid #f1f5f9 !important' } }}>
                                                    <TableCell><Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.3, borderRadius: '6px' }}>{l.itemCode}</Box></TableCell>
                                                    <TableCell sx={{ fontWeight: 500, maxWidth: 180 }}>{l.itemName}</TableCell>
                                                    <TableCell sx={{ color: '#64748b' }}>{l.unit}</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 600 }}>{l.systemQty}</TableCell>
                                                    <TableCell sx={{ width: 110 }}>
                                                        {isDraft ? (
                                                            <TextField
                                                                size="small" type="number" value={actualQty}
                                                                onChange={e => setActual(l.id, l.actualQty, Math.max(0, +e.target.value), noteVal)}
                                                                slotProps={{ htmlInput: { min: 0 } }}
                                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '&.Mui-focused fieldset': { borderColor: TEAL } }, '& input': { textAlign: 'center', fontWeight: 700 } }}
                                                            />
                                                        ) : (
                                                            <Typography align="center" sx={{ fontWeight: 700 }}>{l.actualQty}</Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 800, color: diff === 0 ? '#64748b' : diff > 0 ? '#15803d' : '#dc2626' }}>
                                                        {diff === 0 ? '0' : diff > 0 ? `+${diff}` : diff}
                                                    </TableCell>
                                                    <TableCell sx={{ width: 180 }}>
                                                        {isDraft ? (
                                                            <TextField
                                                                size="small" placeholder="Ghi chú..." value={noteVal}
                                                                onChange={e => setActual(l.id, l.actualQty, actualQty, e.target.value)}
                                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '&.Mui-focused fieldset': { borderColor: TEAL } } }}
                                                            />
                                                        ) : (
                                                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>{l.note || '—'}</Typography>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => { setDetailId(null); setEdited({}); }} sx={{ textTransform: 'none', borderRadius: '12px', color: '#64748b' }}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Confirm Dialog */}
            <Dialog open={!!confirmId} onClose={() => setConfirmId(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, p: 1 } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleRoundedIcon sx={{ color: '#15803d' }} /> Xác nhận kiểm kho?
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', p: 2 }}>
                        <Typography sx={{ fontSize: 13.5, color: '#166534', lineHeight: 1.6 }}>
                            Sau khi xác nhận, hệ thống sẽ tạo <strong>phiếu điều chỉnh kiểm kho</strong> và cập nhật tồn kho theo số liệu thực tế. Phiếu sẽ bị <strong>khóa</strong> và không thể chỉnh sửa.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setConfirmId(null)} sx={{ textTransform: 'none', borderRadius: '12px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" onClick={() => confirmId && confirmMut.mutate(confirmId)} disabled={confirmMut.isPending}
                        sx={{ bgcolor: '#15803d', '&:hover': { bgcolor: '#166534' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}>
                        {confirmMut.isPending ? 'Đang xử lý...' : 'Xác nhận kiểm kho'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
