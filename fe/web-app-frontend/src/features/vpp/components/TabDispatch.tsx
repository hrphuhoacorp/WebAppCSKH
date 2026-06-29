'use client';

import React, { useState, useEffect } from 'react';
import {
    Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, IconButton, InputAdornment, MenuItem, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TablePagination, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vppApi, VppDispatchCreateDto, VPP_GREEN } from '../api/vpp.api';
import { ordersApi } from '@/features/orders/api/orders.api';
import { userApi } from '@/features/user/api/user.api';
import toast from 'react-hot-toast';

const GREEN = VPP_GREEN;
const PURPLE = '#7c3aed';
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '& fieldset': { borderColor: BORDER }, '&.Mui-focused fieldset': { borderColor: PURPLE, borderWidth: 1.5 } },
    '& label.Mui-focused': { color: PURPLE },
};

function fmtDate(s?: string | null) {
    if (!s) return '-';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtVND(v: number) {
    return Math.round(v).toLocaleString('vi-VN') + 'đ';
}

interface DispatchLine { itemId: number; quantity: number; unitPrice: number; vatRate: number; }

function lineTotal(l: DispatchLine) { return l.quantity * l.unitPrice * (1 + l.vatRate); }

export default function TabDispatch() {
    const qc = useQueryClient();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [createOpen, setCreateOpen] = useState(false);
    const [detailId, setDetailId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [dispatchDate, setDispatchDate] = useState(now.toISOString().split('T')[0]);
    const [department, setDepartment] = useState('');
    const [branch, setBranch] = useState('');
    const [note, setNote] = useState('');
    const [lines, setLines] = useState<DispatchLine[]>([{ itemId: 0, quantity: 1, unitPrice: 0, vatRate: 0 }]);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const { data: pagedData, isLoading } = useQuery({
        queryKey: ['vpp-dispatches', month, year, page, rowsPerPage],
        queryFn: () => vppApi.getDispatches({ month, year, page: page + 1, pageSize: rowsPerPage }),
    });
    const dispatches = pagedData?.items ?? [];
    const totalDispatches = pagedData?.totalItems ?? 0;

    useEffect(() => { setPage(0); }, [month, year]);

    const { data: detail, isLoading: detailLoading } = useQuery({
        queryKey: ['vpp-dispatch-detail', detailId],
        queryFn: () => vppApi.getDispatchById(detailId!),
        enabled: !!detailId,
    });

    const { data: allItems = [] } = useQuery({
        queryKey: ['vpp-items-all'],
        queryFn: () => vppApi.getItemsAll(),
        staleTime: 5 * 60 * 1000,
    });

    const { data: rolesRaw } = useQuery({
        queryKey: ['user-roles'],
        queryFn: () => userApi.getRoles(),
        staleTime: 10 * 60 * 1000,
    });
    const { data: branchesRaw } = useQuery({
        queryKey: ['branches'],
        queryFn: () => ordersApi.getBranches(),
        staleTime: 10 * 60 * 1000,
    });

    const roleOptions: { id: number; name: string }[] = rolesRaw?.content ?? rolesRaw?.data ?? [];
    const branchOptions: { id: number; name: string }[] = branchesRaw?.content ?? branchesRaw?.data ?? [];

    const createMut = useMutation({
        mutationFn: (dto: VppDispatchCreateDto) => vppApi.createDispatch(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['vpp-dispatches'] });
            qc.invalidateQueries({ queryKey: ['vpp-inventory'] });
            qc.invalidateQueries({ queryKey: ['vpp-dispatch-stats'] });
            setCreateOpen(false);
            resetForm();
            toast.success('Đã tạo phiếu xuất kho');
        },
    });

    const deleteMut = useMutation({
        mutationFn: (id: number) => vppApi.deleteDispatch(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['vpp-dispatches'] });
            qc.invalidateQueries({ queryKey: ['vpp-inventory'] });
            qc.invalidateQueries({ queryKey: ['vpp-dispatch-stats'] });
            setDeleteId(null);
            toast.success('Đã xóa phiếu xuất');
        },
    });

    function resetForm() {
        setDepartment(''); setBranch(''); setNote('');
        setDispatchDate(now.toISOString().split('T')[0]);
        setLines([{ itemId: 0, quantity: 1, unitPrice: 0, vatRate: 0 }]);
    }
    function updateLine(idx: number, patch: Partial<DispatchLine>) {
        setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
    }
    function handleCreate() {
        const valid = lines.filter(l => l.itemId > 0 && l.quantity > 0);
        if (!valid.length) { toast.error('Cần ít nhất 1 dòng hợp lệ'); return; }
        createMut.mutate({ dispatchDate, department: department || undefined, branch: branch || undefined, note: note || undefined, lines: valid });
    }

    const totalAmount = lines.reduce((s, l) => s + lineTotal(l), 0);
    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
    const q = search.trim().toLowerCase();
    const filtered = dispatches.filter(r =>
        !q || r.code.toLowerCase().includes(q) || (r.department ?? '').toLowerCase().includes(q)
            || (r.branch ?? '').toLowerCase().includes(q) || (r.note ?? '').toLowerCase().includes(q)
            || r.createdBy.toLowerCase().includes(q)
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Filter bar */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        size="small" placeholder="Tìm mã / bộ phận / người tạo..."
                        value={searchInput} onChange={e => setSearchInput(e.target.value)}
                        sx={{ ...fieldSx, width: 240 }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }}
                    />
                    <TextField select size="small" label="Tháng" value={month} onChange={e => setMonth(+e.target.value)} sx={{ ...fieldSx, minWidth: 130 }}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <MenuItem key={m} value={m}>Tháng {m}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Năm" value={year} onChange={e => setYear(+e.target.value)} sx={{ ...fieldSx, minWidth: 100 }}>
                        {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </TextField>
                    <Box sx={{ flex: 1 }} />
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}
                        sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#6d28d9' }, borderRadius: '12px', textTransform: 'none', fontWeight: 700, height: 40 }}>
                        Tạo phiếu xuất
                    </Button>
                </Box>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, overflow: 'auto', flex: 1, minHeight: 0, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {['Mã phiếu', 'Ngày xuất', 'Bộ phận', 'Chi nhánh', 'Số mặt hàng', 'Tổng tiền', 'Người tạo', ''].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 800, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8, bgcolor: PURPLE }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>{dispatches.length === 0 ? `Chưa có phiếu xuất trong tháng ${month}/${year}` : 'Không tìm thấy kết quả phù hợp'}</Typography>
                            </TableCell></TableRow>
                        ) : filtered.map((d, i) => (
                            <TableRow key={d.id} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#fdf8ff', '&:hover': { bgcolor: '#f5f3ff !important' }, transition: 'background 0.15s', '& > *': { borderBottom: '1px solid #f1f5f9 !important' } }}>
                                <TableCell sx={{ py: 1.5 }}>
                                    <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.4, borderRadius: '6px', display: 'inline-block' }}>{d.code}</Box>
                                </TableCell>
                                <TableCell sx={{ py: 1.5, whiteSpace: 'nowrap' }}>{fmtDate(d.dispatchDate)}</TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                    {d.department ? <Chip label={d.department} size="small" sx={{ bgcolor: alpha(PURPLE, 0.1), color: PURPLE, fontWeight: 600, fontSize: 11, borderRadius: '8px', height: 22 }} /> : <Typography sx={{ color: '#cbd5e1', fontSize: 12 }}>—</Typography>}
                                </TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                    {d.branch ? <Chip label={d.branch} size="small" sx={{ bgcolor: '#f0fdf4', color: '#166534', fontWeight: 600, fontSize: 11, borderRadius: '8px', height: 22 }} /> : <Typography sx={{ color: '#cbd5e1', fontSize: 12 }}>—</Typography>}
                                </TableCell>
                                <TableCell align="center" sx={{ py: 1.5, fontWeight: 600 }}>{d.itemCount}</TableCell>
                                <TableCell sx={{ color: '#0f766e', fontWeight: 700, py: 1.5, whiteSpace: 'nowrap' }}>{fmtVND(d.totalAmount)}</TableCell>
                                <TableCell sx={{ color: '#64748b', py: 1.5 }}>{d.createdBy}</TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Tooltip title="Chi tiết" arrow>
                                            <IconButton size="small" onClick={() => setDetailId(d.id)} sx={{ color: '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { color: PURPLE, bgcolor: alpha(PURPLE, 0.08) } }}>
                                                <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Xóa" arrow>
                                            <IconButton size="small" onClick={() => setDeleteId(d.id)} sx={{ color: '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { color: '#dc2626', bgcolor: alpha('#dc2626', 0.08) } }}>
                                                <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div"
                count={totalDispatches}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                rowsPerPageOptions={[10, 20, 50]}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                labelRowsPerPage="Hiển thị:"
                sx={{ border: `1px solid ${BORDER}`, borderTop: 0, borderRadius: `0 0 ${CARD_RADIUS} ${CARD_RADIUS}`, bgcolor: '#fff' }}
            />

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => { setCreateOpen(false); resetForm(); }} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, p: 1 } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Tạo phiếu xuất kho mới</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField label="Ngày xuất *" type="date" size="small" sx={{ ...fieldSx, flex: 1 }} value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                        <Autocomplete<{ id: number; name: string }>
                            size="small"
                            options={roleOptions}
                            getOptionLabel={r => r.name}
                            value={roleOptions.find(r => r.name === department) ?? null}
                            onChange={(_, v) => setDepartment(v?.name ?? '')}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            noOptionsText="Không tìm thấy"
                            sx={{ flex: 1 }}
                            renderInput={params => <TextField {...params} label="Bộ phận" sx={fieldSx} />}
                        />
                        <Autocomplete<{ id: number; name: string }>
                            size="small"
                            options={branchOptions}
                            getOptionLabel={b => b.name}
                            value={branchOptions.find(b => b.name === branch) ?? null}
                            onChange={(_, v) => setBranch(v?.name ?? '')}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            noOptionsText="Không tìm thấy"
                            sx={{ flex: 1 }}
                            renderInput={params => <TextField {...params} label="Chi nhánh" sx={fieldSx} />}
                        />
                    </Box>
                    <TextField label="Ghi chú" size="small" fullWidth sx={fieldSx} value={note} onChange={e => setNote(e.target.value)} />
                    <Divider />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Danh sách hàng xuất</Typography>
                        <Button size="small" startIcon={<AddCircleOutlineRoundedIcon />} onClick={() => setLines(p => [...p, { itemId: 0, quantity: 1, unitPrice: 0, vatRate: 0 }])}
                            sx={{ textTransform: 'none', color: PURPLE, fontWeight: 700 }}>
                            Thêm dòng
                        </Button>
                    </Box>
                    <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {['Vật tư *', 'Số lượng', 'Đơn giá (đ)', 'Thuế', 'Thành tiền', ''].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '2px solid #e2e8f0' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lines.map((line, idx) => (
                                    <TableRow key={idx} sx={{ '&:last-child td': { border: 0 } }}>
                                        <TableCell sx={{ minWidth: 260 }}>
                                            <Autocomplete
                                                size="small"
                                                options={allItems}
                                                getOptionLabel={it => `${it.code} — ${it.name}`}
                                                value={allItems.find(x => x.id === line.itemId) ?? null}
                                                onChange={(_, it) => updateLine(idx, { itemId: it?.id ?? 0, unitPrice: it?.unitPrice ?? 0, vatRate: it?.vatRate ?? 0 })}
                                                isOptionEqualToValue={(o, v) => o.id === v.id}
                                                noOptionsText="Không tìm thấy"
                                                renderInput={params => <TextField {...params} placeholder="Tìm vật tư..." sx={fieldSx} />}
                                                renderOption={(props, it) => (
                                                    <Box component="li" {...props}>
                                                        <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', mr: 1 }}>{it.code}</Box>
                                                        {it.name}
                                                    </Box>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ width: 110 }}>
                                            <TextField size="small" type="number" value={line.quantity}
                                                onChange={e => updateLine(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                                                slotProps={{ htmlInput: { min: 1 } }} sx={fieldSx} />
                                        </TableCell>
                                        <TableCell sx={{ width: 140 }}>
                                            <TextField size="small" type="number" value={line.unitPrice}
                                                onChange={e => updateLine(idx, { unitPrice: Math.max(0, Number(e.target.value)) })}
                                                slotProps={{ htmlInput: { min: 0 } }} sx={fieldSx} />
                                        </TableCell>
                                        <TableCell sx={{ width: 70, color: '#64748b', fontSize: 12 }}>
                                            {line.vatRate > 0 ? `${(line.vatRate * 100).toFixed(0)}%` : '—'}
                                        </TableCell>
                                        <TableCell sx={{ color: '#0f766e', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                            {fmtVND(lineTotal(line))}
                                            {line.vatRate > 0 && (
                                                <Typography component="span" sx={{ fontSize: 10, color: '#94a3b8', ml: 0.5 }}>
                                                    (incl. VAT)
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ width: 40 }}>
                                            {lines.length > 1 && (
                                                <IconButton size="small" onClick={() => setLines(p => p.filter((_, i) => i !== idx))} sx={{ color: '#dc2626' }}>
                                                    <RemoveCircleOutlineRoundedIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ textAlign: 'right', bgcolor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '12px', px: 2.5, py: 1.5 }}>
                        <Typography sx={{ fontWeight: 800, color: PURPLE, fontSize: 17 }}>
                            Tổng cộng: {fmtVND(totalAmount)}
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => { setCreateOpen(false); resetForm(); }} sx={{ textTransform: 'none', borderRadius: '12px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" onClick={handleCreate} disabled={createMut.isPending}
                        sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#6d28d9' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}>
                        {createMut.isPending ? 'Đang tạo...' : 'Tạo phiếu xuất'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={!!detailId} onClose={() => setDetailId(null)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Chi tiết phiếu xuất — {detail?.code}</DialogTitle>
                <DialogContent>
                    {detailLoading ? (
                        <Typography sx={{ color: '#94a3b8', py: 2 }}>Đang tải...</Typography>
                    ) : detail ? (
                        <Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2.5 }}>
                                {[
                                    ['Ngày xuất', fmtDate(detail.dispatchDate)],
                                    ['Bộ phận', detail.department || '—'],
                                    ['Chi nhánh', detail.branch || '—'],
                                    ['Người tạo', detail.createdBy],
                                    ['Tổng tiền', fmtVND(detail.totalAmount)],
                                    ['Ghi chú', detail.note || '—'],
                                ].map(([l, v]) => (
                                    <Box key={l}>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.4 }}>{l}</Typography>
                                        <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{v}</Typography>
                                    </Box>
                                ))}
                            </Box>
                            <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            {['Mã', 'Tên vật tư', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền'].map(h => (
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
                                                <TableCell align="center" sx={{ fontWeight: 700 }}>{l.quantity}</TableCell>
                                                <TableCell sx={{ color: '#64748b' }}>{fmtVND(l.unitPrice)}</TableCell>
                                                <TableCell sx={{ color: '#0f766e', fontWeight: 700 }}>{fmtVND(l.totalAmount)}</TableCell>
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

            {/* Delete Confirm */}
            <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, p: 1 } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Xóa phiếu xuất?</DialogTitle>
                <DialogContent>
                    <Box sx={{ bgcolor: '#fff7ed', border: '1px dashed #fed7aa', borderRadius: '12px', p: 2 }}>
                        <Typography sx={{ fontSize: 13.5, color: '#c2410c', lineHeight: 1.6 }}>
                            Xóa phiếu xuất sẽ làm tăng tồn kho tương ứng. Thao tác này <strong>không thể hoàn tác</strong>.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setDeleteId(null)} sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" color="error" onClick={() => deleteId && deleteMut.mutate(deleteId)} disabled={deleteMut.isPending} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}>
                        {deleteMut.isPending ? 'Đang xóa...' : 'Xóa phiếu xuất'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
