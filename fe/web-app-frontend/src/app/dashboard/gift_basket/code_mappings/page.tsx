'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl,
    Grid, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select,
    Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import {
    Add, CheckCircle, CloudUpload, FileDownload, FormatListBulleted,
    ImageNotSupported, TaskAlt, Visibility, ZoomIn, Close,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ordersApi } from '@/features/orders/api/orders.api';
import { giftBasketApi, GiftCodeChangeRequestDTO, BASKET_GROUPS } from '@/features/gift-basket/api/gift-basket.api';
import { getFullImageUrl } from '@/features/media/utils/media.utils';
import PageHeader from '@/components/common/PageHeader';

const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('vi-VN') : '—';
const fmtVnd = (n?: number) => n != null ? n.toLocaleString('vi-VN') + ' ₫' : '—';
const groupLabel = (code?: string) => BASKET_GROUPS.find(g => g.code === code)?.name ?? code ?? '—';
const todayStr = () => new Date().toISOString().split('T')[0];

/* ── Parse bulk admin text ───────────────────────────────────── */
interface AdminBulkRow {
    raw: string;
    oldCode: string; newCode: string;
    price: number | null; date: string; note: string;
    error?: string;
}
function parseAdminBulk(text: string, defaultDate: string): AdminBulkRow[] {
    return text.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(raw => {
            const parts = raw.split(/\t|\|/).map(p => p.trim());
            const oldCode = parts[0] ?? '';
            const newCode = parts[1] ?? '';
            const priceRaw = (parts[2] ?? '').replace(/[^\d]/g, '');
            const price = priceRaw ? Number(priceRaw) : null;
            // date: dd/mm/yyyy → yyyy-mm-dd or yyyy-mm-dd passthrough
            let rawDate = parts[3]?.trim() ?? '';
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
                const [d, m, y] = rawDate.split('/');
                rawDate = `${y}-${m}-${d}`;
            }
            const date = rawDate || defaultDate;
            const note = parts[4] ?? '';
            let error: string | undefined;
            if (!oldCode) error = 'Thiếu mã trước';
            else if (!newCode) error = 'Thiếu mã sau';
            else if (!price || price <= 0) error = 'Giá không hợp lệ';
            else if (!date) error = 'Thiếu ngày';
            return { raw, oldCode, newCode, price, date, note, error };
        });
}

/* ── Lightbox ─────────────────────────────────────────────────── */
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
    return (
        <Dialog open={!!url} onClose={onClose} maxWidth={false}
            slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.88)' } } }}
            sx={{ '& .MuiDialog-paper': { bgcolor: 'transparent', boxShadow: 'none', m: 1 } }}>
            <Box sx={{ position: 'relative' }}>
                <IconButton onClick={onClose}
                    sx={{ position: 'absolute', top: -40, right: 0, color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                    <Close />
                </IconButton>
                <Box component="img" src={url} alt="preview"
                    sx={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 2, display: 'block' }} />
            </Box>
        </Dialog>
    );
}

/* ── Clickable image slot ─────────────────────────────────────── */
function ImgSlot({ url, label, height = 120, onView }: { url?: string; label: string; height?: number; onView: (u: string) => void }) {
    const full = url ? getFullImageUrl(url) : '';
    const [err, setErr] = useState(false);

    if (!full || err) return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f1f5f9', height, gap: 0.25 }}>
            <ImageNotSupported sx={{ fontSize: 22, color: '#94a3b8' }} />
            <Typography sx={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{label}</Typography>
        </Box>
    );

    return (
        <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', height, cursor: 'zoom-in' }}
            onClick={() => onView(full)}>
            <Box component="img" src={full} alt={label}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={() => setErr(true)} />
            <Box sx={{
                position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.18s',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.28)' },
                '&:hover .zoom-icon': { opacity: 1 },
            }}>
                <ZoomIn className="zoom-icon" sx={{ color: '#fff', fontSize: 28, opacity: 0, transition: 'opacity 0.18s' }} />
            </Box>
            <Box sx={{ position: 'absolute', bottom: 3, left: 4, bgcolor: 'rgba(0,0,0,0.5)', px: 0.6, borderRadius: 0.5 }}>
                <Typography sx={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{label}</Typography>
            </Box>
        </Box>
    );
}

/* ── Upload thumb (inside dialogs) ───────────────────────────── */
function UploadThumb({ url, label, onUploadClick, onView }: { url?: string; label: string; onUploadClick: () => void; onView: (u: string) => void }) {
    const full = url ? getFullImageUrl(url) : '';
    const [err, setErr] = useState(false);
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
            {full && !err
                ? <Box sx={{ position: 'relative', cursor: 'zoom-in' }} onClick={() => onView(full)}>
                    <Box component="img" src={full} alt={label} onError={() => setErr(true)}
                        sx={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 1.5, border: '1px solid #e2e8f0', display: 'block' }} />
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0)', '&:hover': { bgcolor: 'rgba(0,0,0,0.25)' }, '&:hover .zi': { opacity: 1 }, transition: 'background 0.18s' }}>
                        <ZoomIn className="zi" sx={{ color: '#fff', opacity: 0, transition: 'opacity 0.18s' }} />
                    </Box>
                  </Box>
                : <Box sx={{ width: '100%', height: 100, borderRadius: 1.5, border: '2px dashed #d1d5db', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <ImageNotSupported sx={{ color: '#d1d5db', fontSize: 24 }} />
                    <Typography variant="caption" color="text.disabled">Chưa có ảnh</Typography>
                  </Box>
            }
            <Button size="small" variant="outlined" fullWidth startIcon={<CloudUpload />}
                onClick={onUploadClick}
                sx={{ mt: 0.5, borderRadius: '10px', borderColor: '#086839', color: '#086839', textTransform: 'none', fontSize: 12 }}>
                {full && !err ? 'Đổi ảnh' : 'Tải ảnh'}
            </Button>
        </Box>
    );
}

/* ══════════════════════════════════════════════════════════════ */
export default function ApprovePage() {
    const [rows, setRows] = useState<GiftCodeChangeRequestDTO[]>([]);
    const [total, setTotal] = useState(0);
    const [page] = useState(0);
    const [pageSize] = useState(50);
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

    // dialogs
    const [approveOpen, setApproveOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [adminCreateOpen, setAdminCreateOpen] = useState(false);
    const [selected, setSelected] = useState<GiftCodeChangeRequestDTO | null>(null);
    const [approveForm, setApproveForm] = useState<any>({ status: 'done' });
    const [adminForm, setAdminForm] = useState<any>({ approvedDate: todayStr() });
    const [saving, setSaving] = useState(false);

    // image lightbox
    const [lightboxUrl, setLightboxUrl] = useState('');

    // bulk admin create
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [bulkDefaultDate, setBulkDefaultDate] = useState(todayStr());
    const [bulkPreviewed, setBulkPreviewed] = useState(false);
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkProgress, setBulkProgress] = useState('');
    const bulkRows = bulkText ? parseAdminBulk(bulkText, bulkDefaultDate) : [];
    const bulkValid = bulkRows.filter(r => !r.error);
    const bulkInvalid = bulkRows.filter(r => r.error);

    const handleBulkAdminSubmit = async () => {
        if (bulkValid.length === 0) { toast.error('Không có dòng hợp lệ'); return; }
        setBulkSaving(true);
        let ok = 0; let fail = 0;
        for (let i = 0; i < bulkValid.length; i++) {
            const r = bulkValid[i];
            setBulkProgress(`Đang xử lý ${i + 1}/${bulkValid.length}…`);
            try {
                const created = await giftBasketApi.createChangeRequest({
                    basketCodeOrName: r.oldCode,
                    price: r.price!,
                    note: r.note || undefined,
                    sentZaloPhoto: false,
                });
                if (created.content?.id) {
                    await giftBasketApi.handleChangeRequest({
                        id: created.content.id,
                        status: 'done',
                        oldCode: r.oldCode,
                        newCode: r.newCode,
                        price: r.price!,
                        approvedDate: r.date,
                        resultNote: r.note || `${r.oldCode} → ${r.newCode}`,
                    });
                    ok++;
                } else fail++;
            } catch { fail++; }
        }
        setBulkSaving(false); setBulkProgress('');
        toast.success(`Đã tạo và duyệt ${ok} mã${fail > 0 ? `, thất bại ${fail}` : ''}`);
        setBulkOpen(false); setBulkText(''); setBulkPreviewed(false);
        load();
    };

    // image upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTarget, setUploadTarget] = useState<{ form: 'admin'; field: 'frontImageUrl' | 'backImageUrl' } | null>(null);

    useEffect(() => {
        ordersApi.getBranches().then((res: any) => { if (res?.content) setBranches(res.content); });
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await giftBasketApi.getChangeRequests({ page: page + 1, pageSize, status: 'pending' });
            if (res.content) { setRows(res.content.items); setTotal(res.content.totalItems); }
        } catch { toast.error('Lỗi tải danh sách'); }
        finally { setLoading(false); }
    }, [page, pageSize]);

    useEffect(() => { load(); }, [load]);

    /* ── Approve existing pending ── */
    const openApprove = (row: GiftCodeChangeRequestDTO) => {
        setSelected(row);
        setApproveForm({
            id: row.id,
            status: 'done',
            oldCode: row.basketCodeOrName ?? '',
            newCode: '',
            price: row.price ?? '',
            approvedDate: todayStr(),
            resultNote: '',
        });
        setApproveOpen(true);
    };

    const handleApprove = async () => {
        if (approveForm.status === 'done') {
            if (!approveForm.oldCode?.trim()) { toast.error('Nhập mã trước'); return; }
            if (!approveForm.newCode?.trim()) { toast.error('Nhập mã sau'); return; }
            if (!approveForm.price || Number(approveForm.price) <= 0) { toast.error('Nhập giá'); return; }
            if (!approveForm.approvedDate?.trim()) { toast.error('Nhập ngày'); return; }
            if (!approveForm.resultNote?.trim()) { toast.error('Nhập ghi chú'); return; }
        }
        setSaving(true);
        try {
            await giftBasketApi.handleChangeRequest({ ...approveForm, price: Number(approveForm.price) });
            toast.success(approveForm.status === 'done' ? 'Đã duyệt' : 'Đã từ chối');
            setApproveOpen(false);
            load();
        } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Lỗi'); }
        finally { setSaving(false); }
    };

    /* ── Admin: create + approve directly ── */
    const handleAdminCreate = async () => {
        if (!adminForm.oldCode?.trim()) { toast.error('Nhập mã trước'); return; }
        if (!adminForm.newCode?.trim()) { toast.error('Nhập mã sau'); return; }
        if (!adminForm.price || Number(adminForm.price) <= 0) { toast.error('Nhập giá'); return; }
        if (!adminForm.approvedDate?.trim()) { toast.error('Nhập ngày'); return; }
        if (!adminForm.resultNote?.trim()) { toast.error('Nhập ghi chú'); return; }
        setSaving(true);
        try {
            // Step 1: create request
            const created = await giftBasketApi.createChangeRequest({
                branchId: adminForm.branchId,
                basketCodeOrName: adminForm.oldCode,
                groupCode: adminForm.groupCode,
                price: Number(adminForm.price),
                sentZaloPhoto: false,
                frontImageUrl: adminForm.frontImageUrl,
                backImageUrl: adminForm.backImageUrl,
                note: adminForm.resultNote,
            });
            if (!created.content?.id) throw new Error('Tạo yêu cầu thất bại');

            // Step 2: approve immediately
            await giftBasketApi.handleChangeRequest({
                id: created.content.id,
                status: 'done',
                oldCode: adminForm.oldCode,
                newCode: adminForm.newCode,
                price: Number(adminForm.price),
                approvedDate: adminForm.approvedDate,
                resultNote: adminForm.resultNote,
            });
            toast.success('Đã tạo và duyệt mã thành công');
            setAdminCreateOpen(false);
            setAdminForm({ approvedDate: todayStr() });
            load();
        } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Lỗi'); }
        finally { setSaving(false); }
    };

    /* ── Image upload ── */
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadTarget) return;
        try {
            const res = await giftBasketApi.uploadImage(file);
            if (res.content) {
                if (uploadTarget.form === 'admin') setAdminForm((p: any) => ({ ...p, [uploadTarget.field]: res.content }));
            }
        } catch { toast.error('Lỗi tải ảnh'); }
        e.target.value = '';
    };

    const triggerUpload = (field: 'frontImageUrl' | 'backImageUrl') => {
        setUploadTarget({ form: 'admin', field });
        fileInputRef.current?.click();
    };

    const pendingCount = rows.length;

    return (
        <Box sx={{
            p: { xs: 2, md: 4 },
            minHeight: '100vh',
            bgcolor: '#f0f7f3',
            backgroundImage: `radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)`,
        }}>
            <PageHeader
                icon={<TaskAlt />}
                title="Duyệt mã cần đổi"
                subtitle={`${pendingCount} yêu cầu đang chờ duyệt`}
                actions={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="outlined" startIcon={<FormatListBulleted />}
                            onClick={() => { setBulkText(''); setBulkPreviewed(false); setBulkDefaultDate(todayStr()); setBulkOpen(true); }}
                            sx={{ borderColor: '#086839', color: '#086839', borderRadius: '12px', textTransform: 'none', fontWeight: 700 }}>
                            Tạo hàng loạt
                        </Button>
                        <Button variant="contained" startIcon={<Add />}
                            onClick={() => { setAdminForm({ approvedDate: todayStr() }); setAdminCreateOpen(true); }}
                            sx={{ bgcolor: '#086839', '&:hover': { bgcolor: '#065f2d' }, borderRadius: '12px', textTransform: 'none', fontWeight: 700 }}>
                            Tạo mã mới
                        </Button>
                        <Tooltip title="Xuất Excel các mã đã duyệt">
                            <Button variant="outlined" startIcon={<FileDownload />}
                                onClick={() => giftBasketApi.exportChangeRequests()}
                                sx={{ borderColor: '#086839', color: '#086839', borderRadius: '12px', textTransform: 'none', fontWeight: 700 }}>
                                Xuất Excel
                            </Button>
                        </Tooltip>
                    </Box>
                }
            />

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
                    <CircularProgress />
                </Box>
            ) : rows.length === 0 ? (
                <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid #e2e8f0', p: 6, textAlign: 'center' }}>
                    <CheckCircle sx={{ fontSize: 56, color: '#22c55e', mb: 1.5 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#166534' }}>Không có yêu cầu nào đang chờ duyệt</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>Tất cả yêu cầu đã được xử lý</Typography>
                </Paper>
            ) : (
                <Grid container spacing={2}>
                    {rows.map(row => (
                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={row.id}>
                            <Paper elevation={0} sx={{
                                borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#fff',
                                overflow: 'hidden', boxShadow: '0 2px 12px rgba(8,104,57,0.06)',
                                transition: 'box-shadow 0.18s',
                                '&:hover': { boxShadow: '0 6px 20px rgba(8,104,57,0.12)' },
                                display: 'flex', flexDirection: 'column',
                            }}>
                                {/* Images strip — always show both slots */}
                                <Box sx={{ display: 'flex', height: 120, borderBottom: `1px solid ${alpha('#086839', 0.08)}`, gap: '1px', bgcolor: alpha('#086839', 0.08) }}>
                                    <ImgSlot url={row.frontImageUrl} label="Trước" onView={setLightboxUrl} />
                                    <ImgSlot url={row.backImageUrl} label="Sau" onView={setLightboxUrl} />
                                </Box>

                                <Box sx={{ p: 1.5, flex: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box>
                                            <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#3b82f6', fontWeight: 700 }}>{row.requestUid}</Typography>
                                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }} noWrap>{row.basketCodeOrName || '—'}</Typography>
                                        </Box>
                                        <Chip size="small"
                                            label={row.priority === 'urgent' ? '🔥 Gấp' : 'Thường'}
                                            sx={row.priority === 'urgent'
                                                ? { bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: 10 }
                                                : { bgcolor: '#f1f5f9', color: '#64748b', fontSize: 10 }} />
                                    </Box>

                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                        {row.groupCode && (
                                            <Chip size="small" label={groupLabel(row.groupCode)}
                                                sx={{ fontSize: 10, height: 20, bgcolor: alpha('#086839', 0.08), color: '#065f2d' }} />
                                        )}
                                        {row.branchName && (
                                            <Chip size="small" label={row.branchName}
                                                sx={{ fontSize: 10, height: 20, bgcolor: '#f1f5f9', color: '#475569' }} />
                                        )}
                                        {row.price != null && (
                                            <Chip size="small" label={fmtVnd(row.price)}
                                                sx={{ fontSize: 10, height: 20, bgcolor: '#dcfce7', color: '#166534', fontWeight: 700 }} />
                                        )}
                                        {row.sentZaloPhoto && (
                                            <Chip size="small" label="📷 Zalo"
                                                sx={{ fontSize: 10, height: 20, bgcolor: '#dbeafe', color: '#1e40af' }} />
                                        )}
                                    </Box>

                                    {row.reason && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.4 }}>
                                            {row.reason}
                                        </Typography>
                                    )}

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.disabled">{row.createdByName} · {fmtDate(row.createdAt)}</Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <Tooltip title="Xem chi tiết">
                                                <IconButton size="small" onClick={() => { setSelected(row); setDetailOpen(true); }}
                                                    sx={{ color: '#94a3b8', '&:hover': { color: '#3b82f6' } }}>
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Button size="small" variant="contained"
                                                onClick={() => openApprove(row)}
                                                sx={{ bgcolor: '#086839', '&:hover': { bgcolor: '#065f2d' }, borderRadius: '8px', textTransform: 'none', fontSize: 11, px: 1.5 }}>
                                                Duyệt
                                            </Button>
                                        </Box>
                                    </Box>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* ── ADMIN CREATE dialog ──────────────────────────────────── */}
            <Dialog open={adminCreateOpen} onClose={() => setAdminCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Add sx={{ color: '#086839' }} />
                        Tạo mã đổi mới
                    </Box>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    <Grid container spacing={2}>
                        {/* Row 1 */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Chi nhánh</InputLabel>
                                <Select label="Chi nhánh" value={adminForm.branchId ?? ''}
                                    onChange={e => setAdminForm((p: any) => ({ ...p, branchId: e.target.value || undefined }))}>
                                    <MenuItem value="">— Tất cả —</MenuItem>
                                    {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Nhóm giỏ</InputLabel>
                                <Select label="Nhóm giỏ" value={adminForm.groupCode ?? ''}
                                    onChange={e => setAdminForm((p: any) => ({ ...p, groupCode: e.target.value || undefined }))}>
                                    <MenuItem value="">— Không chọn —</MenuItem>
                                    {BASKET_GROUPS.map(g => (
                                        <MenuItem key={g.code} value={g.code}>{g.code} — {g.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Code swap */}
                        <Grid size={12}><Divider sx={{ my: 0 }}>Thông tin mã <Typography component="span" color="error" variant="caption">*</Typography></Divider></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" label="Mã trước *"
                                placeholder="Ví dụ: H10161"
                                value={adminForm.oldCode ?? ''}
                                onChange={e => setAdminForm((p: any) => ({ ...p, oldCode: e.target.value }))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" label="Mã sau *"
                                placeholder="Ví dụ: H1475"
                                value={adminForm.newCode ?? ''}
                                onChange={e => setAdminForm((p: any) => ({ ...p, newCode: e.target.value }))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" label="Giá *" type="number"
                                value={adminForm.price ?? ''}
                                onChange={e => setAdminForm((p: any) => ({ ...p, price: e.target.value }))}
                                slotProps={{ input: { endAdornment: <InputAdornment position="end">₫</InputAdornment> } }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" label="Ngày duyệt *" type="date"
                                value={adminForm.approvedDate ?? ''}
                                onChange={e => setAdminForm((p: any) => ({ ...p, approvedDate: e.target.value }))}
                                slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Ghi chú *" multiline rows={2}
                                placeholder="Ví dụ: ĐỔI NHO XANH THƯỜNG"
                                value={adminForm.resultNote ?? ''}
                                onChange={e => setAdminForm((p: any) => ({ ...p, resultNote: e.target.value }))} />
                        </Grid>

                        {/* Images */}
                        <Grid size={12}><Divider sx={{ my: 0 }}>Ảnh minh họa</Divider></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <UploadThumb url={adminForm.frontImageUrl} label="Mặt trước"
                                onUploadClick={() => triggerUpload('frontImageUrl')}
                                onView={setLightboxUrl} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <UploadThumb url={adminForm.backImageUrl} label="Mặt sau"
                                onUploadClick={() => triggerUpload('backImageUrl')}
                                onView={setLightboxUrl} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button onClick={() => setAdminCreateOpen(false)} color="inherit">Hủy</Button>
                    <Button variant="contained" onClick={handleAdminCreate} disabled={saving}
                        sx={{ bgcolor: '#086839', '&:hover': { bgcolor: '#065f2d' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700, minWidth: 140 }}>
                        {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : '✅ Tạo & Duyệt luôn'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── APPROVE dialog ─────────────────────────────────────── */}
            <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Duyệt yêu cầu — {selected?.requestUid}</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    <Stack spacing={2}>
                        {selected && (
                            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                                <Typography variant="caption" color="text.secondary">Yêu cầu</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selected.basketCodeOrName || '—'} · {selected.branchName || ''}</Typography>
                                {selected.price != null && <Typography variant="body2" sx={{ color: 'success.dark' }}>Giá đề xuất: {fmtVnd(selected.price)}</Typography>}
                                {/* Images preview */}
                                {(selected.frontImageUrl || selected.backImageUrl) && (
                                    <Box sx={{ display: 'flex', gap: '1px', mt: 1, height: 80, borderRadius: 1, overflow: 'hidden', bgcolor: '#e5e7eb' }}>
                                        <ImgSlot url={selected.frontImageUrl} label="Trước" height={80} onView={setLightboxUrl} />
                                        <ImgSlot url={selected.backImageUrl} label="Sau" height={80} onView={setLightboxUrl} />
                                    </Box>
                                )}
                            </Box>
                        )}

                        <FormControl fullWidth size="small">
                            <InputLabel>Kết quả</InputLabel>
                            <Select label="Kết quả" value={approveForm.status ?? 'done'}
                                onChange={e => setApproveForm((p: any) => ({ ...p, status: e.target.value }))}>
                                <MenuItem value="done">✅ Duyệt</MenuItem>
                                <MenuItem value="rejected">❌ Từ chối</MenuItem>
                            </Select>
                        </FormControl>

                        {approveForm.status === 'done' && (
                            <Grid container spacing={1.5}>
                                <Grid size={{ xs: 6 }}>
                                    <TextField fullWidth size="small" label="Mã trước *"
                                        value={approveForm.oldCode ?? ''}
                                        onChange={e => setApproveForm((p: any) => ({ ...p, oldCode: e.target.value }))} />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField fullWidth size="small" label="Mã sau *"
                                        value={approveForm.newCode ?? ''}
                                        onChange={e => setApproveForm((p: any) => ({ ...p, newCode: e.target.value }))} />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField fullWidth size="small" label="Giá *" type="number"
                                        value={approveForm.price ?? ''}
                                        onChange={e => setApproveForm((p: any) => ({ ...p, price: e.target.value }))}
                                        slotProps={{ input: { endAdornment: <InputAdornment position="end">₫</InputAdornment> } }} />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField fullWidth size="small" label="Ngày *" type="date"
                                        value={approveForm.approvedDate ?? ''}
                                        onChange={e => setApproveForm((p: any) => ({ ...p, approvedDate: e.target.value }))}
                                        slotProps={{ inputLabel: { shrink: true } }} />
                                </Grid>
                                <Grid size={12}>
                                    <TextField fullWidth size="small" label="Ghi chú *" multiline rows={2}
                                        placeholder="Ví dụ: ĐỔI NHO XANH THƯỜNG"
                                        value={approveForm.resultNote ?? ''}
                                        onChange={e => setApproveForm((p: any) => ({ ...p, resultNote: e.target.value }))} />
                                </Grid>
                            </Grid>
                        )}

                        {approveForm.status === 'rejected' && (
                            <TextField fullWidth size="small" label="Lý do từ chối" multiline rows={2}
                                value={approveForm.resultNote ?? ''}
                                onChange={e => setApproveForm((p: any) => ({ ...p, resultNote: e.target.value }))} />
                        )}
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button onClick={() => setApproveOpen(false)} color="inherit">Hủy</Button>
                    <Button variant="contained" onClick={handleApprove} disabled={saving}
                        sx={{ bgcolor: approveForm.status === 'rejected' ? '#dc2626' : '#086839', borderRadius: '10px', textTransform: 'none' }}>
                        {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : approveForm.status === 'rejected' ? 'Từ chối' : 'Xác nhận duyệt'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── DETAIL dialog ──────────────────────────────────────── */}
            <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Chi tiết — {selected?.requestUid}</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    {selected && (
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary">Chi nhánh</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selected.branchName ?? '—'}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary">Giá đề xuất</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark' }}>{fmtVnd(selected.price)}</Typography>
                            </Grid>
                            {selected.groupCode && (
                                <Grid size={12}>
                                    <Typography variant="caption" color="text.secondary">Nhóm giỏ</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{groupLabel(selected.groupCode)}</Typography>
                                </Grid>
                            )}
                            {selected.reason && (
                                <Grid size={12}>
                                    <Typography variant="caption" color="text.secondary">Lý do</Typography>
                                    <Typography variant="body2">{selected.reason}</Typography>
                                </Grid>
                            )}

                            <Grid size={12}><Divider>Ảnh</Divider></Grid>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Mặt trước</Typography>
                                {selected.frontImageUrl
                                    ? <Box sx={{ borderRadius: 1.5, overflow: 'hidden', cursor: 'zoom-in' }}
                                        onClick={() => setLightboxUrl(getFullImageUrl(selected.frontImageUrl!))}>
                                        <Box component="img" src={getFullImageUrl(selected.frontImageUrl)}
                                            sx={{ width: '100%', height: 120, objectFit: 'cover', display: 'block', '&:hover': { opacity: 0.85 }, transition: 'opacity 0.15s' }} />
                                      </Box>
                                    : <Box sx={{ height: 120, borderRadius: 1.5, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ImageNotSupported sx={{ color: '#d1d5db' }} />
                                      </Box>
                                }
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Mặt sau</Typography>
                                {selected.backImageUrl
                                    ? <Box sx={{ borderRadius: 1.5, overflow: 'hidden', cursor: 'zoom-in' }}
                                        onClick={() => setLightboxUrl(getFullImageUrl(selected.backImageUrl!))}>
                                        <Box component="img" src={getFullImageUrl(selected.backImageUrl)}
                                            sx={{ width: '100%', height: 120, objectFit: 'cover', display: 'block', '&:hover': { opacity: 0.85 }, transition: 'opacity 0.15s' }} />
                                      </Box>
                                    : <Box sx={{ height: 120, borderRadius: 1.5, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ImageNotSupported sx={{ color: '#d1d5db' }} />
                                      </Box>
                                }
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button onClick={() => setDetailOpen(false)} color="inherit">Đóng</Button>
                    {selected?.status === 'pending' && (
                        <Button variant="contained" onClick={() => { setDetailOpen(false); openApprove(selected!); }}
                            sx={{ bgcolor: '#086839', borderRadius: '10px', textTransform: 'none' }}>
                            Duyệt ngay
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* ── BULK ADMIN CREATE dialog ──────────────────────── */}
            <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormatListBulleted sx={{ color: '#086839' }} />
                        Admin cập nhật mã hàng loạt chính thức
                    </Box>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    <Stack spacing={2}>
                        <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#166534', mb: 0.5 }}>MẪU DÁN TỪ EXCEL</Typography>
                            <Typography variant="caption" color="text.secondary">
                                <b>Cột 1</b>: Mã trước/mã báo cáo gốc &nbsp;·&nbsp; <b>Cột 2</b>: Mã sau/mã Sapo cần bấm &nbsp;·&nbsp;
                                <b>Cột 3</b>: Giá &nbsp;·&nbsp; <b>Cột 4</b>: Ngày áp dụng &nbsp;·&nbsp; <b>Cột 5</b>: Ghi chú
                            </Typography>
                            <Box sx={{ mt: 0.75, fontFamily: 'monospace', fontSize: 12, color: '#475569', bgcolor: '#fff', p: 1, borderRadius: 1, border: '1px solid #e2e8f0' }}>
                                H1046I | H1046J | 619000 | 11/06/2026 | Đổi nho xanh thường<br />
                                GN02C | GN02E | 499000 | 11/06/2026 | Táo xanh Mỹ, nho đen Chile
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                Có thể dán trực tiếp từ Excel. App tự đọc tab Excel hoặc dấu |. Nếu file chỉ có 4 cột (không có cột ghi chú) hệ thống dùng ngày áp dụng mặc định phía trên.
                            </Typography>
                        </Box>

                        <TextField size="small" label="Ngày áp dụng mặc định" type="date"
                            value={bulkDefaultDate}
                            onChange={e => setBulkDefaultDate(e.target.value)}
                            helperText="Dùng cho dòng Excel chưa có cột ngày."
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={{ maxWidth: 260 }} />

                        <TextField multiline rows={8} fullWidth
                            label="Dán danh sách mã đổi hàng loạt"
                            placeholder={'Mã trước | Mã sau | Giá | Ngày áp dụng | Ghi chú\nH1046I | H1046J | 619000 | 11/06/2026 | Đổi nho xanh thường'}
                            value={bulkText}
                            onChange={e => { setBulkText(e.target.value); setBulkPreviewed(false); }}
                            sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
                            helperText="Có thể dán trực tiếp từ Excel. App tự đọc tab Excel hoặc dấu |. Nếu file chỉ có 4 cột: Mã trước | Mã sau | Giá | Ghi chú thì hệ thống dùng ngày áp dụng mặc định phía trên."
                        />

                        {bulkPreviewed && bulkRows.length > 0 && (
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: bulkInvalid.length > 0 ? '#dc2626' : '#166534' }}>
                                    {bulkValid.length} hợp lệ · {bulkInvalid.length} lỗi
                                </Typography>
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, maxHeight: 300, overflow: 'auto' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: alpha('#086839', 0.06) }}>
                                                {['#', 'MÃ TRƯỚC', 'MÃ SAU', 'GIÁ', 'NGÀY', 'GHI CHÚ', ''].map(h => (
                                                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {bulkRows.map((r, i) => (
                                                <TableRow key={i} sx={{ bgcolor: r.error ? '#fef2f2' : undefined }}>
                                                    <TableCell sx={{ fontSize: 11, color: '#94a3b8' }}>{i + 1}</TableCell>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#1e3a5f' }}>{r.oldCode || '—'}</TableCell>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#086839' }}>{r.newCode || '—'}</TableCell>
                                                    <TableCell sx={{ fontSize: 12 }}>{r.price != null ? r.price.toLocaleString('vi-VN') + ' ₫' : '—'}</TableCell>
                                                    <TableCell sx={{ fontSize: 11 }}>{r.date || '—'}</TableCell>
                                                    <TableCell sx={{ fontSize: 11, color: '#64748b', maxWidth: 160 }}>{r.note || '—'}</TableCell>
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
                        : <Button variant="contained" onClick={handleBulkAdminSubmit} disabled={bulkSaving || bulkValid.length === 0}
                            sx={{ bgcolor: '#086839', '&:hover': { bgcolor: '#065f2d' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
                            {bulkSaving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : `Ghi chính thức ${bulkValid.length} mã`}
                          </Button>
                    }
                </DialogActions>
            </Dialog>

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />

            {/* Lightbox */}
            {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl('')} />}
        </Box>
    );
}
