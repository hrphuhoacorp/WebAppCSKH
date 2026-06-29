'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Autocomplete, Badge, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, IconButton, InputAdornment, MenuItem, Paper,
    Popover, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TablePagination, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vppApi, VppImportCreateDto, VppAttachmentItem, VPP_GREEN } from '../api/vpp.api';
import toast from 'react-hot-toast';

const GREEN = VPP_GREEN;
const BLUE = '#0284c7';
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '& fieldset': { borderColor: BORDER }, '&.Mui-focused fieldset': { borderColor: BLUE, borderWidth: 1.5 } },
    '& label.Mui-focused': { color: BLUE },
};

function fmtDate(s?: string | null) {
    if (!s) return '-';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtVND(v: number) { return Math.round(v).toLocaleString('vi-VN') + 'đ'; }

interface AttachmentEntry extends VppAttachmentItem { size?: number; }
interface ImportLine {
    itemId: number;
    quantity: number;
    unitPrice: number;
    attachments: AttachmentEntry[];
}

export default function TabImport() {
    const qc = useQueryClient();
    const fileInputsRef = useRef<(HTMLInputElement | null)[]>([]);
    const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [createOpen, setCreateOpen] = useState(false);
    const [detailId, setDetailId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Popover for per-line attachment in create form
    const [attachAnchor, setAttachAnchor] = useState<{ el: HTMLElement; lineIdx: number } | null>(null);
    const [uploading, setUploading] = useState(false);

    // Popover for viewing attachments from the detail dialog per line
    const [detailAttachAnchor, setDetailAttachAnchor] = useState<{ el: HTMLElement; lineIdx: number } | null>(null);

    const [importDate, setImportDate] = useState(now.toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [lines, setLines] = useState<ImportLine[]>([{ itemId: 0, quantity: 1, unitPrice: 0, attachments: [] }]);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const { data: pagedData, isLoading } = useQuery({
        queryKey: ['vpp-imports', month, year, page, rowsPerPage],
        queryFn: () => vppApi.getImports({ month, year, page: page + 1, pageSize: rowsPerPage }),
    });
    const imports = pagedData?.items ?? [];
    const totalImports = pagedData?.totalItems ?? 0;

    useEffect(() => { setPage(0); }, [month, year]);

    const { data: detail, isLoading: detailLoading } = useQuery({
        queryKey: ['vpp-import-detail', detailId],
        queryFn: () => vppApi.getImportById(detailId!),
        enabled: !!detailId,
    });

    const { data: allItems = [] } = useQuery({
        queryKey: ['vpp-items-all'],
        queryFn: () => vppApi.getItemsAll(),
        staleTime: 5 * 60 * 1000,
    });

    const createMut = useMutation({
        mutationFn: (dto: VppImportCreateDto) => vppApi.createImport(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['vpp-imports'] });
            qc.invalidateQueries({ queryKey: ['vpp-inventory'] });
            setCreateOpen(false);
            resetForm();
            toast.success('Đã tạo phiếu nhập kho');
        },
        onError: (err: any) => { toast.error(err?.response?.data?.message || 'Tạo phiếu nhập thất bại'); },
    });

    const deleteMut = useMutation({
        mutationFn: (id: number) => vppApi.deleteImport(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['vpp-imports'] });
            qc.invalidateQueries({ queryKey: ['vpp-inventory'] });
            setDeleteId(null);
            toast.success('Đã xóa phiếu nhập');
        },
    });

    function resetForm() {
        setNote('');
        setImportDate(now.toISOString().split('T')[0]);
        setLines([{ itemId: 0, quantity: 1, unitPrice: 0, attachments: [] }]);
    }

    function updateLine(idx: number, patch: Partial<ImportLine>) {
        setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
    }

    async function handleUploadFiles(e: React.ChangeEvent<HTMLInputElement>, lineIdx: number) {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        e.target.value = '';
        setUploading(true);
        try {
            const results = await vppApi.uploadAttachments(files);
            setLines(prev => prev.map((l, i) => i === lineIdx
                ? { ...l, attachments: [...l.attachments, ...results.map(r => ({ url: r.url, name: r.name, size: r.size }))] }
                : l
            ));
        } catch {
            toast.error('Tải file lên thất bại');
        } finally {
            setUploading(false);
        }
    }

    function handleLineAttachClick(e: React.MouseEvent<HTMLButtonElement>, lineIdx: number) {
        if (lines[lineIdx].attachments.length > 0) {
            // has files → show popover
            setAttachAnchor({ el: e.currentTarget, lineIdx });
        } else {
            // no files → open file picker directly
            fileInputsRef.current[lineIdx]?.click();
        }
    }

    function handleCreate() {
        const valid = lines.filter(l => l.itemId > 0 && l.quantity > 0);
        if (!valid.length) { toast.error('Cần ít nhất 1 dòng hợp lệ'); return; }
        createMut.mutate({
            importDate,
            note: note || undefined,
            lines: valid.map(l => ({
                itemId: l.itemId,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                attachments: l.attachments.length > 0 ? l.attachments.map(a => ({ url: a.url, name: a.name })) : undefined,
            })),
        });
    }

    const totalAmount = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
    const q = search.trim().toLowerCase();
    const filtered = imports.filter(r =>
        !q || (r.note ?? '').toLowerCase().includes(q) || r.createdBy.toLowerCase().includes(q)
    );

    const attachLine = attachAnchor !== null ? lines[attachAnchor.lineIdx] : null;
    const detailLine = detailAttachAnchor !== null && detail ? detail.lines[detailAttachAnchor.lineIdx] : null;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Filter */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        size="small" placeholder="Tìm ghi chú / người tạo..."
                        value={searchInput} onChange={e => setSearchInput(e.target.value)}
                        sx={{ ...fieldSx, width: 220 }}
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
                        sx={{ bgcolor: BLUE, '&:hover': { bgcolor: '#0369a1' }, borderRadius: '12px', textTransform: 'none', fontWeight: 700, height: 40 }}>
                        Tạo phiếu nhập
                    </Button>
                </Box>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, overflow: 'auto', flex: 1, minHeight: 0, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {['#', 'Ngày nhập', 'Kỳ', 'Số mặt hàng', 'Tổng tiền', 'Ghi chú', 'Người tạo', ''].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 800, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8, bgcolor: BLUE }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>{imports.length === 0 ? `Chưa có phiếu nhập trong tháng ${month}/${year}` : 'Không tìm thấy kết quả phù hợp'}</Typography>
                            </TableCell></TableRow>
                        ) : filtered.map((imp, i) => (
                            <TableRow key={imp.id} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#f8fbff', '&:hover': { bgcolor: '#eff6ff !important' }, transition: 'background 0.15s', '& > *': { borderBottom: '1px solid #f1f5f9 !important' } }}>
                                <TableCell sx={{ py: 1.5 }}>
                                    <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.4, borderRadius: '6px', display: 'inline-block' }}>#{imp.id}</Box>
                                </TableCell>
                                <TableCell sx={{ py: 1.5, whiteSpace: 'nowrap' }}>{fmtDate(imp.importDate)}</TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                    <Chip label={`T${imp.periodMonth}/${imp.periodYear}`} size="small" sx={{ bgcolor: '#dbeafe', color: '#2563eb', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />
                                </TableCell>
                                <TableCell align="center" sx={{ py: 1.5, fontWeight: 600 }}>{imp.itemCount}</TableCell>
                                <TableCell sx={{ color: '#0f766e', fontWeight: 700, py: 1.5, whiteSpace: 'nowrap' }}>{fmtVND(imp.totalAmount)}</TableCell>
                                <TableCell sx={{ color: '#64748b', maxWidth: 180, py: 1.5 }}>{imp.note || '—'}</TableCell>
                                <TableCell sx={{ color: '#64748b', py: 1.5 }}>{imp.createdBy}</TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Tooltip title="Chi tiết" arrow>
                                            <IconButton size="small" onClick={() => setDetailId(imp.id)} sx={{ color: '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { color: BLUE, bgcolor: alpha(BLUE, 0.08) } }}>
                                                <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Xóa" arrow>
                                            <IconButton size="small" onClick={() => setDeleteId(imp.id)} sx={{ color: '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { color: '#dc2626', bgcolor: alpha('#dc2626', 0.08) } }}>
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
                component="div" count={totalImports} page={page}
                onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                rowsPerPageOptions={[10, 20, 50]}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                labelRowsPerPage="Hiển thị:"
                sx={{ border: `1px solid ${BORDER}`, borderTop: 0, borderRadius: `0 0 ${CARD_RADIUS} ${CARD_RADIUS}`, bgcolor: '#fff' }}
            />

            {/* ── Create Dialog ── */}
            <Dialog open={createOpen} onClose={() => { setCreateOpen(false); resetForm(); }} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, p: 1 } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Tạo phiếu nhập kho mới</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField label="Ngày nhập *" type="date" size="small" sx={{ ...fieldSx, flex: 1 }} value={importDate} onChange={e => setImportDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                        <TextField label="Ghi chú" size="small" sx={{ ...fieldSx, flex: 2 }} value={note} onChange={e => setNote(e.target.value)} />
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Danh sách hàng nhập</Typography>
                        <Button size="small" startIcon={<AddCircleOutlineRoundedIcon />}
                            onClick={() => setLines(p => [...p, { itemId: 0, quantity: 1, unitPrice: 0, attachments: [] }])}
                            sx={{ textTransform: 'none', color: BLUE, fontWeight: 700 }}>
                            Thêm dòng
                        </Button>
                    </Box>
                    <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {['Vật tư *', 'Số lượng', 'Đơn giá (đ)', 'Thành tiền', 'CT', ''].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lines.map((line, idx) => (
                                    <TableRow key={idx} sx={{ '&:last-child td': { border: 0 } }}>
                                        <TableCell sx={{ minWidth: 260 }}>
                                            <Autocomplete
                                                size="small" options={allItems}
                                                getOptionLabel={it => `${it.code} — ${it.name}`}
                                                value={allItems.find(x => x.id === line.itemId) ?? null}
                                                onChange={(_, it) => updateLine(idx, { itemId: it?.id ?? 0, unitPrice: it?.unitPrice ?? 0 })}
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
                                            <TextField size="small" type="number" value={line.quantity} onChange={e => updateLine(idx, { quantity: Math.max(1, +e.target.value) })} slotProps={{ htmlInput: { min: 1 } }} sx={fieldSx} />
                                        </TableCell>
                                        <TableCell sx={{ width: 140 }}>
                                            <TextField size="small" type="number" value={line.unitPrice} onChange={e => updateLine(idx, { unitPrice: Math.max(0, +e.target.value) })} slotProps={{ htmlInput: { min: 0 } }} sx={fieldSx} />
                                        </TableCell>
                                        <TableCell sx={{ color: '#0f766e', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                            {fmtVND(line.quantity * line.unitPrice)}
                                        </TableCell>
                                        {/* Per-line attachment icon */}
                                        <TableCell sx={{ width: 44 }}>
                                            <Tooltip title={line.attachments.length > 0 ? `${line.attachments.length} file — click để xem` : 'Đính kèm chứng từ'} arrow>
                                                <Badge badgeContent={line.attachments.length || undefined} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 15, height: 15 } }}>
                                                    <IconButton size="small"
                                                        onClick={e => handleLineAttachClick(e, idx)}
                                                        disabled={uploading && activeLineIdx === idx}
                                                        sx={{ width: 28, height: 28, borderRadius: '8px', color: line.attachments.length > 0 ? BLUE : '#cbd5e1', '&:hover': { bgcolor: alpha(BLUE, 0.08), color: BLUE } }}>
                                                        {uploading && activeLineIdx === idx
                                                            ? <CircularProgress size={12} sx={{ color: BLUE }} />
                                                            : <AttachFileRoundedIcon sx={{ fontSize: 15 }} />}
                                                    </IconButton>
                                                </Badge>
                                            </Tooltip>
                                            <input
                                                type="file" hidden multiple
                                                accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png"
                                                ref={el => { fileInputsRef.current[idx] = el; }}
                                                onChange={e => { setActiveLineIdx(idx); handleUploadFiles(e, idx); }}
                                            />
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

                    <Box sx={{ textAlign: 'right', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', px: 2.5, py: 1.5 }}>
                        <Typography sx={{ fontWeight: 800, color: GREEN, fontSize: 17 }}>
                            Tổng cộng: {fmtVND(totalAmount)}
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => { setCreateOpen(false); resetForm(); }} sx={{ textTransform: 'none', borderRadius: '12px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" onClick={handleCreate} disabled={createMut.isPending}
                        sx={{ bgcolor: BLUE, '&:hover': { bgcolor: '#0369a1' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}>
                        {createMut.isPending ? 'Đang tạo...' : 'Tạo phiếu nhập'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Per-line Attachment Popover (create form) ── */}
            <Popover
                open={!!attachAnchor}
                anchorEl={attachAnchor?.el}
                onClose={() => setAttachAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: { borderRadius: '14px', border: `1px solid ${BORDER}`, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: 300, maxWidth: 380 } } }}
            >
                <Box sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                            Chứng từ — dòng {attachAnchor ? attachAnchor.lineIdx + 1 : ''}
                        </Typography>
                        <Button size="small" disabled={uploading}
                            startIcon={uploading ? <CircularProgress size={12} /> : <AddCircleOutlineRoundedIcon sx={{ fontSize: 13 }} />}
                            onClick={() => attachAnchor && fileInputsRef.current[attachAnchor.lineIdx]?.click()}
                            sx={{ textTransform: 'none', fontSize: 11.5, color: BLUE, fontWeight: 700, borderRadius: '8px', minWidth: 0, px: 1, '&:hover': { bgcolor: alpha(BLUE, 0.06) } }}>
                            {uploading ? 'Đang tải...' : 'Thêm file'}
                        </Button>
                    </Box>
                    {attachLine && attachLine.attachments.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {attachLine.attachments.map((att, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.6, bgcolor: '#f8fafc', borderRadius: '8px', border: `1px solid ${BORDER}` }}>
                                    <InsertDriveFileRoundedIcon sx={{ fontSize: 13, color: '#64748b', flexShrink: 0 }} />
                                    <Typography sx={{ flex: 1, fontSize: 12, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</Typography>
                                    <IconButton size="small" onClick={() => {
                                        if (attachAnchor) updateLine(attachAnchor.lineIdx, { attachments: attachLine.attachments.filter((_, j) => j !== i) });
                                    }} sx={{ color: '#dc2626', width: 18, height: 18, flexShrink: 0 }}>
                                        <DeleteRoundedIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Typography sx={{ fontSize: 12, color: '#94a3b8', py: 0.5 }}>Chưa có file đính kèm</Typography>
                    )}
                </Box>
            </Popover>

            {/* ── Detail Dialog ── */}
            <Dialog open={!!detailId} onClose={() => { setDetailId(null); setDetailAttachAnchor(null); }} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Chi tiết phiếu nhập #{detailId}</DialogTitle>
                <DialogContent>
                    {detailLoading ? (
                        <Typography sx={{ color: '#94a3b8', py: 2 }}>Đang tải...</Typography>
                    ) : detail ? (
                        <Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
                                {[
                                    ['Ngày nhập', fmtDate(detail.importDate)],
                                    ['Kỳ', `Tháng ${detail.periodMonth}/${detail.periodYear}`],
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
                                            {['Mã', 'Tên vật tư', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền', 'CT'].map(h => (
                                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {detail.lines.map((l, lineIdx) => (
                                            <TableRow key={l.id} sx={{ '&:last-child td': { border: 0 } }}>
                                                <TableCell><Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.3, borderRadius: '6px' }}>{l.itemCode}</Box></TableCell>
                                                <TableCell sx={{ fontWeight: 500 }}>{l.itemName}</TableCell>
                                                <TableCell sx={{ color: '#64748b' }}>{l.unit}</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700 }}>{l.quantity}</TableCell>
                                                <TableCell sx={{ color: '#64748b' }}>{fmtVND(l.unitPrice)}</TableCell>
                                                <TableCell sx={{ color: '#0f766e', fontWeight: 700 }}>{fmtVND(l.totalAmount)}</TableCell>
                                                <TableCell sx={{ width: 44 }}>
                                                    <Tooltip title={l.attachments?.length > 0 ? `${l.attachments.length} file` : 'Chưa có chứng từ'} arrow>
                                                        <Badge badgeContent={l.attachments?.length || undefined} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 15, height: 15 } }}>
                                                            <IconButton size="small"
                                                                onClick={e => setDetailAttachAnchor({ el: e.currentTarget, lineIdx })}
                                                                sx={{ width: 26, height: 26, borderRadius: '8px', color: l.attachments?.length > 0 ? BLUE : '#cbd5e1', '&:hover': { bgcolor: alpha(BLUE, 0.08), color: BLUE } }}>
                                                                <AttachFileRoundedIcon sx={{ fontSize: 14 }} />
                                                            </IconButton>
                                                        </Badge>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => { setDetailId(null); setDetailAttachAnchor(null); }} sx={{ textTransform: 'none', borderRadius: '12px', color: '#64748b' }}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* ── Per-line Attachment Popover (detail view) ── */}
            <Popover
                open={!!detailAttachAnchor}
                anchorEl={detailAttachAnchor?.el}
                onClose={() => setDetailAttachAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: { borderRadius: '14px', border: `1px solid ${BORDER}`, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: 280, maxWidth: 380 } } }}
            >
                <Box sx={{ p: 1.5 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', mb: 1 }}>
                        Chứng từ — {detailLine?.itemName}
                    </Typography>
                    {detailLine?.attachments?.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {detailLine.attachments.map((att, i) => (
                                <Button key={i} component="a" href={att.url} target="_blank" rel="noopener noreferrer"
                                    startIcon={<InsertDriveFileRoundedIcon sx={{ fontSize: 13, color: '#64748b' }} />}
                                    endIcon={<DownloadRoundedIcon sx={{ fontSize: 13 }} />}
                                    sx={{ textTransform: 'none', justifyContent: 'flex-start', fontSize: 12.5, color: '#1e293b', fontWeight: 500, borderRadius: '8px', px: 1, py: 0.6, '&:hover': { bgcolor: alpha(BLUE, 0.06), color: BLUE } }}>
                                    <Box component="span" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{att.name}</Box>
                                </Button>
                            ))}
                        </Box>
                    ) : (
                        <Typography sx={{ fontSize: 12.5, color: '#94a3b8', py: 1 }}>Dòng này chưa có chứng từ</Typography>
                    )}
                </Box>
            </Popover>

            {/* ── Delete Confirm ── */}
            <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, p: 1 } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Xóa phiếu nhập?</DialogTitle>
                <DialogContent>
                    <Box sx={{ bgcolor: '#fff7ed', border: '1px dashed #fed7aa', borderRadius: '12px', p: 2 }}>
                        <Typography sx={{ fontSize: 13.5, color: '#c2410c', lineHeight: 1.6 }}>
                            Xóa phiếu nhập sẽ làm giảm tồn kho tương ứng. Thao tác này <strong>không thể hoàn tác</strong>.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setDeleteId(null)} sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" color="error" onClick={() => deleteId && deleteMut.mutate(deleteId)} disabled={deleteMut.isPending} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}>
                        {deleteMut.isPending ? 'Đang xóa...' : 'Xóa phiếu nhập'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
