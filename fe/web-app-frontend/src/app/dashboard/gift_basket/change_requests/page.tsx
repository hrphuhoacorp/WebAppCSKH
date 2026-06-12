'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, FormControlLabel,
    Grid, InputAdornment, InputLabel, MenuItem, Paper, Select,
    Stack, Table, TableBody, TableCell, TableContainer, TableHead,
    TablePagination, TableRow, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import {
    Add, CloudUpload, DeleteOutlined, FormatListBulleted, ImageNotSupported,
    Refresh, SwapHoriz,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ordersApi } from '@/features/orders/api/orders.api';
import { giftBasketApi, GiftCodeChangeRequestDTO, BASKET_GROUPS } from '@/features/gift-basket/api/gift-basket.api';
import { getFullImageUrl } from '@/features/media/utils/media.utils';
import PageHeader from '@/components/common/PageHeader';
import { MediaFileDto } from '@/features/media/schemas/media_file.schemas';

const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('vi-VN') : '—';
const fmtVnd = (n?: number) => n != null ? n.toLocaleString('vi-VN') + ' ₫' : '—';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'Chờ duyệt', color: '#92400e', bg: '#fef3c7' },
    done:    { label: 'Đã duyệt',  color: '#166534', bg: '#dcfce7' },
    rejected:{ label: 'Từ chối',   color: '#991b1b', bg: '#fee2e2' },
};
const StatusChip = ({ status }: { status: string }) => {
    const c = STATUS_CFG[status] ?? STATUS_CFG.pending;
    return <Chip size="small" label={c.label} sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, fontSize: 11 }} />;
};

const ImgThumb = ({ url, label }: { url?: string; label: string }) => {
    const full = url ? getFullImageUrl(url) : '';
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
            {full
                ? <Box component="img" src={full} alt={label} sx={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }} />
                : <Box sx={{ width: '100%', height: 110, borderRadius: 1.5, border: '2px dashed #d1d5db', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <ImageNotSupported sx={{ color: '#d1d5db', fontSize: 28 }} />
                    <Typography variant="caption" color="text.disabled">Chưa có ảnh</Typography>
                  </Box>
            }
        </Box>
    );
};

/* ── debounce hook ─────────────────────────────────────────────── */
function useDebounce<T>(value: T, delay = 350): T {
    const [dv, setDv] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDv(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return dv;
}

/* ── parse bulk text ───────────────────────────────────────────── */
interface BulkRow { raw: string; basketCode: string; price: number | null; note: string; error?: string }
function parseBulk(text: string): BulkRow[] {
    return text.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(raw => {
            const parts = raw.split(/\t|\|/).map(p => p.trim());
            const basketCode = parts[0] ?? '';
            const priceRaw = (parts[1] ?? '').replace(/[^\d]/g, '');
            const price = priceRaw ? Number(priceRaw) : null;
            const note = parts[2] ?? '';
            let error: string | undefined;
            if (!basketCode) error = 'Thiếu mã giỏ';
            else if (!price || price <= 0) error = 'Giá không hợp lệ';
            return { raw, basketCode, price, note, error };
        });
}

/* ══════════════════════════════════════════════════════════════ */
export default function ChangeRequestsPage() {
    const [rows, setRows] = useState<GiftCodeChangeRequestDTO[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [branchId, setBranchId] = useState<number | ''>('');
    const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search);

    // single create
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState<any>({ priority: 'normal', sentZaloPhoto: true });
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadField, setUploadField] = useState<'frontImageUrl' | 'backImageUrl' | null>(null);

    // bulk create
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [bulkDefaultBranch, setBulkDefaultBranch] = useState<number | ''>('');
    const [bulkDefaultGroup, setBulkDefaultGroup] = useState('');
    const [bulkPreviewed, setBulkPreviewed] = useState(false);
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkProgress, setBulkProgress] = useState('');

    // delete confirm
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const bulkRows = useMemo(() => parseBulk(bulkText), [bulkText]);
    const bulkValid = bulkRows.filter(r => !r.error);
    const bulkInvalid = bulkRows.filter(r => r.error);

    useEffect(() => {
        ordersApi.getBranches().then((res: any) => { if (res?.content) setBranches(res.content); });
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await giftBasketApi.getChangeRequests({
                page: page + 1, pageSize,
                status: statusFilter || undefined,
                branchId: branchId || undefined,
            });
            if (res.content) { setRows(res.content.items); setTotal(res.content.totalItems); }
        } catch { toast.error('Lỗi tải danh sách'); }
        finally { setLoading(false); }
    }, [page, pageSize, statusFilter, branchId]);

    useEffect(() => { load(); }, [load]);

    // Client-side search filter
    const filtered = useMemo(() => {
        const q = debouncedSearch.toLowerCase().trim();
        if (!q) return rows;
        return rows.filter(r =>
            (r.requestUid ?? '').toLowerCase().includes(q) ||
            (r.basketCodeOrName ?? '').toLowerCase().includes(q) ||
            (r.branchName ?? '').toLowerCase().includes(q) ||
            (r.createdByName ?? '').toLowerCase().includes(q)
        );
    }, [rows, debouncedSearch]);

    const pendingCount = rows.filter(r => r.status === 'pending').length;
    const groupLabel = (code?: string) => BASKET_GROUPS.find(g => g.code === code)?.name ?? code ?? '—';

    /* ── Single create ── */
    const handleCreate = async () => {
        if (!form.price || Number(form.price) <= 0) { toast.error('Vui lòng nhập giá bán'); return; }
        if (!form.frontImageUrl && !form.backImageUrl) { toast.error('Vui lòng tải lên ít nhất một ảnh'); return; }
        setSaving(true);
        try {
            await giftBasketApi.createChangeRequest({ ...form, price: Number(form.price) });
            toast.success('Đã gửi yêu cầu');
            setCreateOpen(false);
            setForm({ priority: 'normal', sentZaloPhoto: true });
            load();
        } catch (e: any) { toast.error(e?.response?.data?.MediaFileDtoessage ?? 'Lỗi'); }
        finally { setSaving(false); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadField) return;
        try {
            const res = await giftBasketApi.uploadImage(file);
            if (res.content) setForm((p: any) => ({ ...p, [uploadField]: res.content }));
        } catch { toast.error('Lỗi tải ảnh'); }
        e.target.value = '';
    };

    /* ── Delete ── */
    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await giftBasketApi.deleteChangeRequest(deleteId);
            toast.success('Đã xóa yêu cầu');
            setDeleteId(null);
            load();
        } catch (e: any) { toast.error(e?.response?.data?.Message ?? 'Lỗi xóa'); }
        finally { setDeleting(false); }
    };

    /* ── Bulk create ── */
    const handleBulkSubmit = async () => {
        if (bulkValid.length === 0) { toast.error('Không có dòng hợp lệ'); return; }
        setBulkSaving(true);
        let ok = 0; let fail = 0;
        for (let i = 0; i < bulkValid.length; i++) {
            const r = bulkValid[i];
            setBulkProgress(`Đang gửi ${i + 1}/${bulkValid.length}…`);
            try {
                await giftBasketApi.createChangeRequest({
                    basketCodeOrName: r.basketCode,
                    price: r.price!,
                    note: r.note || undefined,
                    groupCode: bulkDefaultGroup || undefined,
                    branchId: bulkDefaultBranch || undefined,
                    priority: 'normal',
                    sentZaloPhoto: false,
                });
                ok++;
            } catch { fail++; }
        }
        setBulkSaving(false);
        setBulkProgress('');
        toast.success(`Đã gửi ${ok} yêu cầu${fail > 0 ? `, thất bại ${fail}` : ''}`);
        setBulkOpen(false);
        setBulkText('');
        setBulkPreviewed(false);
        load();
    };

    return (
        <Box sx={{
            p: { xs: 2, md: 4 }, minHeight: '100vh',
            bgcolor: '#f0f7f3',
            backgroundImage: `radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)`,
        }}>
            <PageHeader
                icon={<SwapHoriz />}
                title="Yêu cầu đổi mã"
                subtitle={pendingCount > 0 ? `${pendingCount} yêu cầu đang chờ duyệt` : 'Quản lý yêu cầu đổi mã giỏ quà'}
                actions={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="outlined" startIcon={<FormatListBulleted />}
                            onClick={() => { setBulkText(''); setBulkPreviewed(false); setBulkOpen(true); }}
                            sx={{ borderColor: '#086839', color: '#086839', borderRadius: '12px', textTransform: 'none', fontWeight: 700 }}>
                            Gửi hàng loạt
                        </Button>
                        <Button variant="contained" startIcon={<Add />}
                            onClick={() => { setForm({ priority: 'normal', sentZaloPhoto: true }); setCreateOpen(true); }}
                            sx={{ bgcolor: '#086839', '&:hover': { bgcolor: '#065f2d' }, borderRadius: '12px', textTransform: 'none', fontWeight: 700 }}>
                            Gửi yêu cầu
                        </Button>
                    </Box>
                }
            />

            {/* Filter bar */}
            <Paper elevation={0} sx={{
                p: 2, mb: 2.5, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center',
                borderRadius: '20px', border: '1px solid #e2e8f0', bgcolor: '#fff',
                boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
            }}>
                <TextField size="small" placeholder="Tìm mã YC, mã giỏ, chi nhánh…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    sx={{ width: 230, '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: '#086839' } } }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><Box component="span" sx={{ fontSize: 16, color: 'text.secondary' }}>🔍</Box></InputAdornment> } }}
                />
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                    {[{ v: '', l: 'Tất cả' }, { v: 'pending', l: 'Chờ duyệt' }, { v: 'done', l: 'Đã duyệt' }, { v: 'rejected', l: 'Từ chối' }].map(opt => (
                        <Chip key={opt.v} label={opt.l} size="small" clickable
                            onClick={() => { setStatusFilter(opt.v); setPage(0); }}
                            sx={statusFilter === opt.v ? { bgcolor: '#086839', color: '#fff', fontWeight: 700 } : { bgcolor: '#f1f5f9', color: '#475569' }} />
                    ))}
                </Box>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Chi nhánh</InputLabel>
                    <Select label="Chi nhánh" value={branchId} onChange={e => { setBranchId(e.target.value as any); setPage(0); }} sx={{ borderRadius: '12px' }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Làm mới"><Button size="small" onClick={load} variant="text" sx={{ minWidth: 0, color: '#94a3b8' }}><Refresh fontSize="small" /></Button></Tooltip>
            </Paper>

            {/* Table */}
            <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid #e2e8f0', bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha('#086839', 0.06) }}>
                                {['Mã YC', 'Chi nhánh', 'Nhóm giỏ', 'Mã / Tên giỏ', 'Giá', 'Zalo', 'Ưu tiên', 'Trạng thái', 'Người tạo', 'Ngày', ''].map(h => (
                                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#374151', py: 1.2 }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6, color: 'text.secondary' }}>Không có dữ liệu</TableCell></TableRow>
                            ) : filtered.map(row => (
                                <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: alpha('#086839', 0.03) } }}>
                                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>{row.requestUid}</Typography></TableCell>
                                    <TableCell><Typography variant="caption">{row.branchName ?? '—'}</Typography></TableCell>
                                    <TableCell>
                                        {row.groupCode
                                            ? <Chip size="small" label={groupLabel(row.groupCode)} sx={{ fontSize: 10, height: 20, bgcolor: alpha('#086839', 0.08), color: '#065f2d' }} />
                                            : <Typography variant="caption" color="text.disabled">—</Typography>}
                                    </TableCell>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.basketCodeOrName || '—'}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" sx={{ color: 'success.dark', fontWeight: 600 }}>{fmtVnd(row.price)}</Typography></TableCell>
                                    <TableCell>
                                        <Chip size="small" label={row.sentZaloPhoto ? '✓' : '✗'}
                                            sx={{ fontSize: 11, height: 20, bgcolor: row.sentZaloPhoto ? '#dcfce7' : '#fee2e2', color: row.sentZaloPhoto ? '#166534' : '#991b1b', fontWeight: 700 }} />
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={row.priority === 'urgent' ? '🔥 Gấp' : 'Thường'} size="small"
                                            sx={row.priority === 'urgent' ? { bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700 } : { bgcolor: '#f1f5f9', color: '#64748b' }} />
                                    </TableCell>
                                    <TableCell><StatusChip status={row.status} /></TableCell>
                                    <TableCell><Typography variant="caption">{row.createdByName ?? '—'}</Typography></TableCell>
                                    <TableCell><Typography variant="caption">{fmtDate(row.createdAt)}</Typography></TableCell>
                                    <TableCell sx={{ pr: 1 }}>
                                        <Tooltip title="Xóa yêu cầu">
                                            <Button size="small" color="error" variant="outlined"
                                                onClick={() => setDeleteId(row.id)}
                                                sx={{ minWidth: 0, px: 1, borderRadius: '8px' }}>
                                                <DeleteOutlined fontSize="small" />
                                            </Button>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination component="div" count={total} page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={pageSize} onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                    rowsPerPageOptions={[10, 20, 50]} labelRowsPerPage="Hiển thị:" />
            </Paper>

            {/* ── SINGLE CREATE dialog ─────────────────────────────── */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Gửi yêu cầu đổi mã</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Chi nhánh</InputLabel>
                                <Select label="Chi nhánh" value={form.branchId ?? ''}
                                    onChange={e => setForm((p: any) => ({ ...p, branchId: e.target.value || undefined }))}>
                                    <MenuItem value="">Không chọn</MenuItem>
                                    {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Mức độ ưu tiên</InputLabel>
                                <Select label="Mức độ ưu tiên" value={form.priority ?? 'normal'}
                                    onChange={e => setForm((p: any) => ({ ...p, priority: e.target.value }))}>
                                    <MenuItem value="normal">Bình thường</MenuItem>
                                    <MenuItem value="urgent">🔥 Gấp</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={12}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Nhóm giỏ</InputLabel>
                                <Select label="Nhóm giỏ" value={form.groupCode ?? ''}
                                    onChange={e => setForm((p: any) => ({ ...p, groupCode: e.target.value || undefined }))}>
                                    <MenuItem value="">— Không chọn —</MenuItem>
                                    {BASKET_GROUPS.map(g => <MenuItem key={g.code} value={g.code}>{g.code} — {g.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" label="Mã gốc" value={form.basketCodeOrName ?? ''}
                                onChange={e => setForm((p: any) => ({ ...p, basketCodeOrName: e.target.value }))} placeholder="Ví dụ: H1046I" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" label="Giá bán *" type="number"
                                value={form.price ?? ''}
                                onChange={e => setForm((p: any) => ({ ...p, price: e.target.value }))}
                                slotProps={{ input: { endAdornment: <InputAdornment position="end">₫</InputAdornment> } }} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Lý do / ghi chú" multiline rows={2}
                                value={form.reason ?? ''} onChange={e => setForm((p: any) => ({ ...p, reason: e.target.value }))} />
                        </Grid>
                        <Grid size={12}>
                            <FormControlLabel
                                control={<Checkbox checked={form.sentZaloPhoto !== false}
                                    onChange={e => setForm((p: any) => ({ ...p, sentZaloPhoto: e.target.checked }))}
                                    sx={{ color: '#086839', '&.Mui-checked': { color: '#086839' } }} />}
                                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Đã chụp hình gửi Zalo</Typography>}
                            />
                        </Grid>
                        <Grid size={12}><Divider sx={{ my: 0 }}>Ảnh minh họa <Typography component="span" color="error" variant="caption">*</Typography></Divider></Grid>
                        {(['frontImageUrl', 'backImageUrl'] as const).map(field => (
                            <Grid size={{ xs: 12, sm: 6 }} key={field}>
                                <ImgThumb url={form[field]} label={field === 'frontImageUrl' ? 'Mặt trước *' : 'Mặt sau'} />
                                <Button size="small" variant="outlined" fullWidth startIcon={<CloudUpload />}
                                    onClick={() => { setUploadField(field); fileInputRef.current?.click(); }}
                                    sx={{ mt: 0.5, borderRadius: '10px', borderColor: '#086839', color: '#086839', textTransform: 'none' }}>
                                    Tải ảnh
                                </Button>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button onClick={() => setCreateOpen(false)} color="inherit">Hủy</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving}
                        sx={{ bgcolor: '#086839', '&:hover': { bgcolor: '#065f2d' }, borderRadius: '10px', textTransform: 'none' }}>
                        {saving ? <CircularProgress size={16} /> : 'Gửi yêu cầu'}
                    </Button>
                </DialogActions>
            </Dialog>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />

            {/* ── CONFIRM DELETE dialog ─────────────────────────── */}
            <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, color: '#991b1b' }}>Xác nhận xóa</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    <Typography>Bạn có chắc muốn xóa yêu cầu này không? Hành động này không thể hoàn tác.</Typography>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
                    <Button onClick={() => setDeleteId(null)} color="inherit" disabled={deleting}>Hủy</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
                        sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
                        {deleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Xóa'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── BULK REQUEST dialog ──────────────────────────────── */}
            <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormatListBulleted sx={{ color: '#086839' }} />
                        Gửi yêu cầu mã hàng loạt
                    </Box>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    <Stack spacing={2}>
                        {/* Info box */}
                        <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#166534', mb: 0.5 }}>MẪU DÁN</Typography>
                            <Typography variant="caption" color="text.secondary">
                                <b>Cột 1</b>: Mã giỏ/tên giỏ &nbsp;·&nbsp; <b>Cột 2</b>: Giá đề xuất &nbsp;·&nbsp; <b>Cột 3</b>: Ghi chú (tùy chọn)
                            </Typography>
                            <Box sx={{ mt: 0.75, fontFamily: 'monospace', fontSize: 12, color: '#475569', bgcolor: '#fff', p: 1, borderRadius: 1, border: '1px solid #e2e8f0' }}>
                                H1046I | 619000 | Đổi nho xanh thường<br />
                                GN02C | 499000 | Táo xanh Mỹ, nho đen Chile
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                Có thể dán trực tiếp từ Excel. Hệ thống đọc tab Excel hoặc dấu |
                            </Typography>
                        </Box>

                        {/* Default options */}
                        <Grid container spacing={1.5}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Chi nhánh mặc định</InputLabel>
                                    <Select label="Chi nhánh mặc định" value={bulkDefaultBranch}
                                        onChange={e => setBulkDefaultBranch(e.target.value as any)}>
                                        <MenuItem value="">— Không chọn —</MenuItem>
                                        {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Nhóm giỏ mặc định</InputLabel>
                                    <Select label="Nhóm giỏ mặc định" value={bulkDefaultGroup}
                                        onChange={e => setBulkDefaultGroup(e.target.value as string)}>
                                        <MenuItem value="">— Không chọn —</MenuItem>
                                        {BASKET_GROUPS.map(g => <MenuItem key={g.code} value={g.code}>{g.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        {/* Textarea */}
                        <TextField multiline rows={8} fullWidth
                            placeholder={'H1046I | 619000 | Ghi chú\nGN02C | 499000'}
                            value={bulkText}
                            onChange={e => { setBulkText(e.target.value); setBulkPreviewed(false); }}
                            sx={{ fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
                        />

                        {/* Preview table */}
                        {bulkPreviewed && bulkRows.length > 0 && (
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: bulkInvalid.length > 0 ? '#dc2626' : '#166534' }}>
                                    {bulkValid.length} hợp lệ · {bulkInvalid.length} lỗi
                                </Typography>
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, maxHeight: 280, overflow: 'auto' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: alpha('#086839', 0.06) }}>
                                                {['#', 'Mã giỏ', 'Giá', 'Ghi chú', 'Trạng thái'].map(h => (
                                                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {bulkRows.map((r, i) => (
                                                <TableRow key={i} sx={{ bgcolor: r.error ? '#fef2f2' : undefined }}>
                                                    <TableCell sx={{ fontSize: 11, color: '#94a3b8' }}>{i + 1}</TableCell>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{r.basketCode || '—'}</TableCell>
                                                    <TableCell sx={{ fontSize: 12 }}>{r.price != null ? r.price.toLocaleString('vi-VN') + ' ₫' : '—'}</TableCell>
                                                    <TableCell sx={{ fontSize: 11, color: '#64748b' }}>{r.note || '—'}</TableCell>
                                                    <TableCell>
                                                        {r.error
                                                            ? <Chip size="small" label={r.error} sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 600 }} />
                                                            : <Chip size="small" label="OK" sx={{ bgcolor: '#dcfce7', color: '#166534', fontSize: 10, fontWeight: 700 }} />
                                                        }
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}

                        {bulkSaving && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5 }}>
                                <CircularProgress size={16} sx={{ color: '#086839' }} />
                                <Typography variant="body2" sx={{ color: '#166534', fontWeight: 600 }}>{bulkProgress}</Typography>
                            </Box>
                        )}
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
                    <Button onClick={() => setBulkOpen(false)} color="inherit">Hủy</Button>
                    {!bulkPreviewed
                        ? <Button variant="outlined" onClick={() => setBulkPreviewed(true)} disabled={!bulkText.trim()}
                            sx={{ borderColor: '#086839', color: '#086839', borderRadius: '10px', textTransform: 'none' }}>
                            Kiểm tra dữ liệu
                          </Button>
                        : <Button variant="contained" onClick={handleBulkSubmit} disabled={bulkSaving || bulkValid.length === 0}
                            sx={{ bgcolor: '#086839', '&:hover': { bgcolor: '#065f2d' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
                            {bulkSaving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : `Gửi ${bulkValid.length} yêu cầu`}
                          </Button>
                    }
                </DialogActions>
            </Dialog>
        </Box>
    );
}
