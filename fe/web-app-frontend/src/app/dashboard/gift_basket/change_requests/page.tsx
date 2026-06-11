'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, Grid,
    IconButton, InputLabel, MenuItem, Paper, Select, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TablePagination, TableRow, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import { Add, CloudUpload, Edit, Refresh, CheckCircle, Cancel, HourglassEmpty, Visibility } from '@mui/icons-material';
import { SwapHoriz } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ordersApi } from '@/features/orders/api/orders.api';
import { giftBasketApi, GiftCodeChangeRequestDTO } from '@/features/gift-basket/api/gift-basket.api';
import PageHeader from '@/components/common/PageHeader';

const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('vi-VN') : '—';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
    pending: { label: 'Chờ xử lý', color: '#92400e', bg: '#fef3c7', icon: HourglassEmpty },
    done: { label: 'Đã xử lý', color: '#166534', bg: '#dcfce7', icon: CheckCircle },
    rejected: { label: 'Từ chối', color: '#991b1b', bg: '#fee2e2', icon: Cancel },
};

const StatusChip = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    return (
        <Chip size="small" icon={<cfg.icon sx={{ fontSize: '14px !important', color: `${cfg.color} !important` }} />}
            label={cfg.label} sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: 11 }} />
    );
};

export default function ChangeRequestsPage() {
    const [rows, setRows] = useState<GiftCodeChangeRequestDTO[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [branchId, setBranchId] = useState<number | ''>('');
    const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [handleOpen, setHandleOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<GiftCodeChangeRequestDTO | null>(null);
    const [form, setForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadField, setUploadField] = useState<'frontImageUrl' | 'backImageUrl' | null>(null);

    useEffect(() => {
        ordersApi.getBranches().then((res: any) => { if (res?.content) setBranches(res.content); });
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await giftBasketApi.getChangeRequests({ page: page + 1, pageSize, status: statusFilter || undefined, branchId: branchId || undefined });
            if (res.content) { setRows(res.content.items); setTotal(res.content.totalItems); }
        } catch { toast.error('Lỗi tải danh sách'); }
        finally { setLoading(false); }
    }, [page, pageSize, statusFilter, branchId]);

    useEffect(() => { load(); }, [load]);

    const pendingCount = rows.filter(r => r.status === 'pending').length;

    const handleCreate = async () => {
        if (!form.basketCodeOrName?.trim() || !form.reason?.trim()) { toast.error('Vui lòng điền đầy đủ mã giỏ và lý do'); return; }
        setSaving(true);
        try {
            await giftBasketApi.createChangeRequest(form);
            toast.success('Đã gửi yêu cầu');
            setCreateOpen(false); setForm({});
            load();
        } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Lỗi'); }
        finally { setSaving(false); }
    };

    const handleHandle = async () => {
        setSaving(true);
        try {
            await giftBasketApi.handleChangeRequest(form);
            toast.success('Đã cập nhật');
            setHandleOpen(false);
            load();
        } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Lỗi'); }
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

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                minHeight: '100vh',
                bgcolor: '#f0f7f3',
                backgroundImage: `radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)`,
            }}
        >
            <PageHeader
                icon={<SwapHoriz />}
                title="Yêu cầu đổi mã"
                subtitle={pendingCount > 0 ? `${pendingCount} yêu cầu đang chờ xử lý` : 'Quản lý yêu cầu đổi mã giỏ quà'}
                actions={<Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ priority: 'normal' }); setCreateOpen(true); }}>Gửi yêu cầu</Button>}
            />

            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {[{ v: '', l: 'Tất cả' }, { v: 'pending', l: 'Chờ xử lý' }, { v: 'done', l: 'Đã xử lý' }, { v: 'rejected', l: 'Từ chối' }].map(opt => (
                        <Chip key={opt.v} label={opt.l} size="small" clickable onClick={() => { setStatusFilter(opt.v); setPage(0); }}
                            sx={statusFilter === opt.v
                                ? { bgcolor: '#086839', color: '#fff', fontWeight: 700 }
                                : { bgcolor: '#f1f5f9', color: '#475569' }} />
                    ))}
                </Box>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Chi nhánh</InputLabel>
                    <Select label="Chi nhánh" value={branchId} onChange={e => { setBranchId(e.target.value as any); setPage(0); }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Làm mới"><IconButton onClick={load} size="small"><Refresh /></IconButton></Tooltip>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha('#086839', 0.06) }}>
                                {['Mã YC', 'Chi nhánh', 'Mã / Tên giỏ', 'Lý do', 'Ưu tiên', 'Trạng thái', 'Người tạo', 'Ngày tạo', ''].map(h => (
                                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#374151', py: 1.2 }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>Không có dữ liệu</TableCell></TableRow>
                            ) : rows.map(row => (
                                <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: alpha('#086839', 0.03) } }}>
                                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>{row.requestUid}</Typography></TableCell>
                                    <TableCell><Typography variant="caption">{row.branchName ?? '—'}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.basketCodeOrName}</Typography></TableCell>
                                    <TableCell sx={{ maxWidth: 220 }}><Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{row.reason}</Typography></TableCell>
                                    <TableCell>
                                        <Chip label={row.priority === 'urgent' ? '🔥 Gấp' : 'Thường'} size="small"
                                            sx={row.priority === 'urgent'
                                                ? { bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700 }
                                                : { bgcolor: '#f1f5f9', color: '#64748b' }} />
                                    </TableCell>
                                    <TableCell><StatusChip status={row.status} /></TableCell>
                                    <TableCell><Typography variant="caption">{row.createdByName ?? '—'}</Typography></TableCell>
                                    <TableCell><Typography variant="caption">{fmtDate(row.createdAt)}</Typography></TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Xem chi tiết">
                                            <IconButton size="small" onClick={() => { setSelected(row); setDetailOpen(true); }} sx={{ color: '#94a3b8', '&:hover': { color: '#3b82f6' } }}>
                                                <Visibility fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Xử lý">
                                            <IconButton size="small" onClick={() => { setSelected(row); setForm({ id: row.id, status: row.status, resultNote: row.resultNote ?? '' }); setHandleOpen(true); }}
                                                sx={{ color: '#94a3b8', '&:hover': { color: '#f59e0b' } }}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={pageSize} onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                    rowsPerPageOptions={[10, 20, 50]} labelRowsPerPage="Hiển thị:" />
            </Paper>

            {/* Create dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Gửi yêu cầu đổi mã</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Chi nhánh</InputLabel>
                                <Select label="Chi nhánh" value={form.branchId ?? ''} onChange={e => setForm((p: any) => ({ ...p, branchId: e.target.value || undefined }))}>
                                    <MenuItem value="">Không chọn</MenuItem>
                                    {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Mức độ ưu tiên</InputLabel>
                                <Select label="Mức độ ưu tiên" value={form.priority ?? 'normal'} onChange={e => setForm((p: any) => ({ ...p, priority: e.target.value }))}>
                                    <MenuItem value="normal">Bình thường</MenuItem>
                                    <MenuItem value="urgent">🔥 Gấp</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Mã hoặc tên giỏ *" value={form.basketCodeOrName ?? ''} onChange={e => setForm((p: any) => ({ ...p, basketCodeOrName: e.target.value }))} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Lý do đổi mã *" multiline rows={3} value={form.reason ?? ''} onChange={e => setForm((p: any) => ({ ...p, reason: e.target.value }))} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Ghi chú thêm" value={form.note ?? ''} onChange={e => setForm((p: any) => ({ ...p, note: e.target.value }))} />
                        </Grid>
                        <Grid size={12}><Divider sx={{ my: 0.5 }}>Ảnh minh họa (tuỳ chọn)</Divider></Grid>
                        {(['frontImageUrl', 'backImageUrl'] as const).map(field => (
                            <Grid size={{ xs: 12, sm: 6 }} key={field}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                    {field === 'frontImageUrl' ? 'Mặt trước' : 'Mặt sau'}
                                </Typography>
                                {form[field]
                                    ? <Box component="img" src={form[field]} sx={{ width: '100%', height: 100, objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider', mb: 0.5 }} />
                                    : <Box sx={{ width: '100%', height: 60, borderRadius: 1, border: '2px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.disabled">Chưa có ảnh</Typography>
                                    </Box>}
                                <Button size="small" variant="outlined" fullWidth startIcon={<CloudUpload />} onClick={() => { setUploadField(field); fileInputRef.current?.click(); }}>Tải ảnh</Button>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button onClick={() => setCreateOpen(false)} color="inherit">Hủy</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving} sx={{ minWidth: 90 }}>
                        {saving ? <CircularProgress size={16} /> : 'Gửi yêu cầu'}
                    </Button>
                </DialogActions>
            </Dialog>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />

            {/* Handle dialog */}
            <Dialog open={handleOpen} onClose={() => setHandleOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Xử lý — {selected?.requestUid}</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    <Stack spacing={2}>
                        <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Yêu cầu</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{selected?.basketCodeOrName}</Typography>
                            <Typography variant="caption">{selected?.reason}</Typography>
                        </Box>
                        <FormControl fullWidth size="small">
                            <InputLabel>Kết quả xử lý</InputLabel>
                            <Select label="Kết quả xử lý" value={form.status ?? 'pending'} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))}>
                                <MenuItem value="pending">Chờ xử lý</MenuItem>
                                <MenuItem value="done">✅ Đã xử lý</MenuItem>
                                <MenuItem value="rejected">❌ Từ chối</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField fullWidth size="small" label="Ghi chú kết quả" multiline rows={3} value={form.resultNote ?? ''} onChange={e => setForm((p: any) => ({ ...p, resultNote: e.target.value }))} />
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button onClick={() => setHandleOpen(false)} color="inherit">Hủy</Button>
                    <Button variant="contained" onClick={handleHandle} disabled={saving} sx={{ minWidth: 90 }}>
                        {saving ? <CircularProgress size={16} /> : 'Lưu'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detail dialog */}
            <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Chi tiết — {selected?.requestUid}
                    <Box sx={{ float: 'right', mt: 0.3 }}><StatusChip status={selected?.status ?? 'pending'} /></Box>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    {selected && (
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary">Chi nhánh</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selected.branchName ?? '—'}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary">Ưu tiên</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selected.priority === 'urgent' ? '🔥 Gấp' : 'Bình thường'}</Typography>
                            </Grid>
                            <Grid size={12}>
                                <Typography variant="caption" color="text.secondary">Mã / Tên giỏ</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{selected.basketCodeOrName}</Typography>
                            </Grid>
                            <Grid size={12}>
                                <Typography variant="caption" color="text.secondary">Lý do</Typography>
                                <Typography variant="body2">{selected.reason}</Typography>
                            </Grid>
                            {selected.note && <Grid size={12}>
                                <Typography variant="caption" color="text.secondary">Ghi chú</Typography>
                                <Typography variant="body2">{selected.note}</Typography>
                            </Grid>}
                            {(selected.frontImageUrl || selected.backImageUrl) && (
                                <>
                                    <Grid size={12}><Divider sx={{ my: 0.5 }}>Ảnh</Divider></Grid>
                                    {selected.frontImageUrl && <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary">Mặt trước</Typography>
                                        <Box component="img" src={selected.frontImageUrl} sx={{ width: '100%', borderRadius: 1, mt: 0.5 }} />
                                    </Grid>}
                                    {selected.backImageUrl && <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary">Mặt sau</Typography>
                                        <Box component="img" src={selected.backImageUrl} sx={{ width: '100%', borderRadius: 1, mt: 0.5 }} />
                                    </Grid>}
                                </>
                            )}
                            {selected.resultNote && (
                                <Grid size={12}>
                                    <Typography variant="caption" color="text.secondary">Ghi chú xử lý</Typography>
                                    <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1, mt: 0.5 }}>
                                        <Typography variant="body2">{selected.resultNote}</Typography>
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
