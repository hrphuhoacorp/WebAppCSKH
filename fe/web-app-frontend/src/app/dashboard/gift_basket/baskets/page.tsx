'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, Grid,
    IconButton, InputLabel, MenuItem, Paper, Select,
    TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import { Add, CloudUpload, Delete, Edit, Refresh, Search, Inventory2Outlined } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ordersApi } from '@/features/orders/api/orders.api';
import { giftBasketApi, GiftBasketDTO } from '@/features/gift-basket/api/gift-basket.api';
import PageHeader from '@/components/common/PageHeader';

const fmtVnd = (n: number) =>
    n?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) ?? '0 ₫';

/* ─── Card component ─── */
function BasketCard({
    row,
    onEdit,
    onDelete,
}: {
    row: GiftBasketDTO;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const base = (row.baseCode || row.currentCode || '').toUpperCase();
    const saleCodes = (row.currentCode || '')
        .split(/[\n,;|]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
    const hasNewCode = saleCodes.some((c) => c !== base);
    const overlayText = row.imageOverlayText || saleCodes[0] || base;

    return (
        <Box
            sx={{
                background: 'rgba(255,255,255,0.94)',
                border: '1px solid #dbe7df',
                borderRadius: '14px',
                boxShadow: '0 18px 45px rgba(0,81,63,0.10)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'box-shadow 0.18s, transform 0.18s',
                '&:hover': {
                    boxShadow: '0 22px 55px rgba(0,81,63,0.16)',
                    transform: 'translateY(-2px)',
                },
            }}
        >
            {/* Photos */}
            <Box
                sx={{
                    height: 200,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1px',
                    background: '#e5e7eb',
                }}
            >
                {(['frontImageUrl', 'backImageUrl'] as const).map((field, idx) => (
                    <Box
                        key={field}
                        sx={{
                            position: 'relative',
                            background: 'linear-gradient(135deg,#eaf6ec,#fff)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        {row[field] ? (
                            <Box
                                component="img"
                                src={row[field] as string}
                                loading="lazy"
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <Typography variant="caption" sx={{ color: '#789087', fontSize: 11 }}>
                                Chưa có ảnh
                            </Typography>
                        )}
                        {/* Front / Back label */}
                        <Box
                            sx={{
                                position: 'absolute',
                                left: 8,
                                top: 8,
                                bgcolor: 'rgba(8,104,57,0.88)',
                                color: '#fff',
                                borderRadius: '999px',
                                px: 1,
                                py: '3px',
                                fontSize: 11,
                                fontWeight: 800,
                            }}
                        >
                            {idx === 0 ? 'Trước' : 'Sau'}
                        </Box>
                        {/* Overlay text (front only) */}
                        {idx === 0 && overlayText && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    right: 7,
                                    bottom: 7,
                                    maxWidth: '76%',
                                    bgcolor: 'rgba(255,255,255,0.94)',
                                    color: '#111827',
                                    borderRadius: '10px',
                                    px: 1.2,
                                    py: '5px',
                                    fontSize: 12,
                                    fontWeight: 900,
                                    lineHeight: 1.2,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                    textAlign: 'center',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {overlayText}
                            </Box>
                        )}
                    </Box>
                ))}
            </Box>

            {/* Body */}
            <Box sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Code + price */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography sx={{ color: '#66756f', fontSize: 11, lineHeight: 1 }}>
                            {hasNewCode ? 'Mã cũ' : 'Mã'}
                        </Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 900, color: '#086839', lineHeight: 1.15 }}>
                            {base}
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 900, color: '#1c7d38', textAlign: 'right', pt: 0.5 }}>
                        {fmtVnd(row.price)}
                    </Typography>
                </Box>

                {/* Name */}
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#14211d', lineHeight: 1.35 }}>
                    {row.basketName}
                </Typography>

                {/* Mapping box */}
                <Box
                    sx={{
                        border: '1px solid #cfe8db',
                        background: '#f5fbf7',
                        borderRadius: '10px',
                        p: '9px 11px',
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: 10,
                            fontWeight: 900,
                            color: '#006b4f',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            mb: 0.6,
                        }}
                    >
                        Mã cần bấm trên Sapo
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px 5px' }}>
                        {(saleCodes.length ? saleCodes : [base]).map((code) => (
                            <Box
                                key={code}
                                sx={{
                                    display: 'inline-flex',
                                    px: 1,
                                    py: '3px',
                                    borderRadius: '999px',
                                    background: '#e8f6ee',
                                    border: '1px solid #cfe8db',
                                    fontWeight: 900,
                                    color: '#00513f',
                                    fontSize: 13,
                                }}
                            >
                                {code}
                            </Box>
                        ))}
                    </Box>
                    {hasNewCode && (
                        <Typography variant="caption" sx={{ color: '#476157', mt: 0.5, display: 'block' }}>
                            Mã cũ: <b>{base}</b>
                        </Typography>
                    )}
                </Box>

                {/* Meta */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {row.branchName && (
                        <Typography variant="caption" sx={{ color: '#66756f' }}>
                            Chi nhánh: <b>{row.branchName}</b>
                        </Typography>
                    )}
                    {row.effectiveDate && (
                        <Typography variant="caption" sx={{ color: '#66756f' }}>
                            Áp dụng từ: <b>{row.effectiveDate}</b>
                        </Typography>
                    )}
                </Box>

                {/* Notice */}
                {row.notice && (
                    <Box
                        sx={{
                            background: '#eef8f1',
                            borderLeft: '4px solid #61b32b',
                            borderRadius: '8px',
                            p: '8px 10px',
                            fontSize: 12,
                            color: '#315045',
                            lineHeight: 1.4,
                        }}
                    >
                        <b>Lưu ý:</b> {row.notice}
                    </Box>
                )}

                {/* Footer: status + actions */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 0.5 }}>
                    <Chip
                        label={row.status === 'active' ? 'Đang dùng' : 'Ngừng'}
                        size="small"
                        sx={
                            row.status === 'active'
                                ? { bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: 11 }
                                : { bgcolor: '#f3f4f6', color: '#6b7280', fontSize: 11 }
                        }
                    />
                    <Box>
                        <Tooltip title="Sửa">
                            <IconButton
                                size="small"
                                onClick={onEdit}
                                sx={{ color: '#94a3b8', '&:hover': { color: '#3b82f6' } }}
                            >
                                <Edit fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                            <IconButton
                                size="small"
                                onClick={onDelete}
                                sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

/* ─── Page ─── */
export default function BasketsPage() {
    const [rows, setRows] = useState<GiftBasketDTO[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize] = useState(24);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState<number | ''>('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Partial<GiftBasketDTO> | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<GiftBasketDTO | null>(null);
    const [saving, setSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadField, setUploadField] = useState<'frontImageUrl' | 'backImageUrl' | null>(null);

    useEffect(() => {
        ordersApi.getBranches().then((res: any) => {
            if (res?.content) setBranches(res.content);
        });
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await giftBasketApi.getList({
                page: page + 1,
                pageSize,
                search: search || undefined,
                branchId: branchFilter || undefined,
                status: statusFilter || undefined,
            });
            if (res.content) {
                setRows(res.content.items);
                setTotal(res.content.totalItems);
            }
        } catch {
            toast.error('Lỗi tải danh sách');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, branchFilter, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const setField = (f: string, v: any) => setEditTarget((p) => (p ? { ...p, [f]: v } : p));

    const handleSave = async () => {
        if (!editTarget) return;
        setSaving(true);
        try {
            if (editTarget.id) {
                await giftBasketApi.update(editTarget as any);
                toast.success('Đã cập nhật');
            } else {
                await giftBasketApi.create(editTarget as any);
                toast.success('Đã tạo mới');
            }
            setEditOpen(false);
            load();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Lỗi lưu');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await giftBasketApi.delete(deleteTarget.id);
            toast.success('Đã xóa');
            setDeleteTarget(null);
            load();
        } catch {
            toast.error('Lỗi xóa');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadField) return;
        try {
            const res = await giftBasketApi.uploadImage(file);
            if (res.content) setEditTarget((p) => (p ? { ...p, [uploadField]: res.content } : p));
            toast.success('Đã tải ảnh lên');
        } catch {
            toast.error('Lỗi tải ảnh');
        }
        e.target.value = '';
    };

    const activeCount = rows.filter((r) => r.status === 'active').length;

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
                icon={<Inventory2Outlined />}
                title="Thư viện giỏ quà"
                subtitle={`${total} giỏ · ${activeCount} đang dùng`}
                actions={
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        sx={{ bgcolor: '#086839', '&:hover': { bgcolor: '#065f2d' }, borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 2.5 }}
                        onClick={() => {
                            setEditTarget({ status: 'active', price: 0, baseCode: '', basketName: '', currentCode: '' });
                            setEditOpen(true);
                        }}
                    >
                        Thêm giỏ
                    </Button>
                }
            />

            {/* Filter bar */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 2.5,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    alignItems: 'center',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#fff',
                    boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                }}
            >
                <TextField
                    size="small"
                    placeholder="Tìm mã / tên giỏ…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    slotProps={{ input: { startAdornment: <Search sx={{ mr: 0.5, color: 'text.disabled', fontSize: 20 }} /> } }}
                    sx={{
                        minWidth: 220,
                        '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: '#086839' } },
                        '& label.Mui-focused': { color: '#086839' },
                    }}
                />

                {/* Status filter chips */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {[
                        { v: '', l: 'Tất cả' },
                        { v: 'active', l: 'Đang dùng' },
                        { v: 'inactive', l: 'Ngừng' },
                    ].map((opt) => (
                        <Chip
                            key={opt.v}
                            label={opt.l}
                            size="small"
                            clickable
                            onClick={() => { setStatusFilter(opt.v); setPage(0); }}
                            sx={
                                statusFilter === opt.v
                                    ? { bgcolor: '#086839', color: '#fff', fontWeight: 700 }
                                    : { bgcolor: '#f1f5f9', color: '#475569' }
                            }
                        />
                    ))}
                </Box>

                <Box sx={{ flex: 1 }} />

                {/* Branch filter */}
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Chi nhánh</InputLabel>
                    <Select
                        label="Chi nhánh"
                        value={branchFilter}
                        onChange={(e) => { setBranchFilter(e.target.value as any); setPage(0); }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        {branches.map((b) => (
                            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Tooltip title="Làm mới">
                    <IconButton onClick={load} size="small">
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </Paper>

            {/* Branch quick tabs */}
            {branches.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                        label="Tất cả chi nhánh"
                        clickable
                        onClick={() => { setBranchFilter(''); setPage(0); }}
                        sx={
                            branchFilter === ''
                                ? { bgcolor: '#086839', color: '#fff', fontWeight: 800, fontSize: 13 }
                                : { bgcolor: '#f8fcf9', color: '#315045', border: '1px solid #dbe7df', fontSize: 13 }
                        }
                    />
                    {branches.map((b) => (
                        <Chip
                            key={b.id}
                            label={b.name}
                            clickable
                            onClick={() => { setBranchFilter(b.id); setPage(0); }}
                            sx={
                                branchFilter === b.id
                                    ? { bgcolor: '#086839', color: '#fff', fontWeight: 800, fontSize: 13 }
                                    : { bgcolor: '#f8fcf9', color: '#315045', border: '1px solid #dbe7df', fontSize: 13 }
                            }
                        />
                    ))}
                </Box>
            )}

            {/* Count + info bar */}
            {!loading && (
                <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Tìm thấy <b>{total}</b> giỏ
                        {search && <> · từ khoá: <b>"{search}"</b></>}
                        {!search && (
                            <Box component="span" sx={{ ml: 1, color: '#66756f' }}>
                                Không tìm thấy mã cần quy đổi → bán theo mã Sapo bình thường.
                            </Box>
                        )}
                    </Typography>
                    {total > pageSize && (
                        <Typography variant="caption" color="text.secondary">
                            Trang {page + 1} / {Math.ceil(total / pageSize)}
                        </Typography>
                    )}
                </Box>
            )}

            {/* Card grid */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : rows.length === 0 ? (
                <Box
                    sx={{
                        p: 5,
                        textAlign: 'center',
                        border: '1px dashed #dbe7df',
                        borderRadius: '14px',
                        background: '#fff',
                        color: '#66756f',
                    }}
                >
                    <Typography>Không tìm thấy mã cần quy đổi trong bộ lọc hiện tại.</Typography>
                    <Typography variant="caption">Nếu mã này không có trong danh sách thì bán theo mã Sapo như bình thường.</Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 2,
                    }}
                >
                    {rows.map((row) => (
                        <BasketCard
                            key={row.id}
                            row={row}
                            onEdit={() => { setEditTarget({ ...row }); setEditOpen(true); }}
                            onDelete={() => setDeleteTarget(row)}
                        />
                    ))}
                </Box>
            )}

            {/* Pagination */}
            {total > pageSize && !loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        ← Trang trước
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        disabled={(page + 1) * pageSize >= total}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Trang sau →
                    </Button>
                </Box>
            )}

            {/* ─── Edit dialog ─── */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
                    {editTarget?.id ? `Sửa giỏ — ${editTarget.basketName}` : 'Thêm giỏ quà mới'}
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    <Grid container spacing={2}>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Tên giỏ *" value={editTarget?.basketName ?? ''} onChange={(e) => setField('basketName', e.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <TextField fullWidth size="small" label="Mã gốc *" value={editTarget?.baseCode ?? ''} onChange={(e) => setField('baseCode', e.target.value.toUpperCase())} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <TextField fullWidth size="small" label="Mã Sapo cần bấm *" value={editTarget?.currentCode ?? ''} onChange={(e) => setField('currentCode', e.target.value.toUpperCase())} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <TextField fullWidth size="small" label="Ngày hiệu lực" value={editTarget?.effectiveDate ?? ''} onChange={(e) => setField('effectiveDate', e.target.value)} placeholder="VD: 2025-01" />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <TextField fullWidth size="small" label="Giá (VNĐ)" type="number" value={editTarget?.price ?? 0} onChange={(e) => setField('price', Number(e.target.value))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Chi nhánh</InputLabel>
                                <Select label="Chi nhánh" value={editTarget?.branchId ?? ''} onChange={(e) => setField('branchId', e.target.value || undefined)}>
                                    <MenuItem value="">Không chọn</MenuItem>
                                    {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Trạng thái</InputLabel>
                                <Select label="Trạng thái" value={editTarget?.status ?? 'active'} onChange={(e) => setField('status', e.target.value)}>
                                    <MenuItem value="active">Đang dùng</MenuItem>
                                    <MenuItem value="inactive">Ngừng dùng</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField fullWidth size="small" label="Chữ đè lên ảnh" value={editTarget?.imageOverlayText ?? ''} onChange={(e) => setField('imageOverlayText', e.target.value)} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Thông báo / Lưu ý" value={editTarget?.notice ?? ''} onChange={(e) => setField('notice', e.target.value)} multiline rows={2} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Ghi chú nội bộ" value={editTarget?.note ?? ''} onChange={(e) => setField('note', e.target.value)} />
                        </Grid>

                        <Grid size={12}><Divider sx={{ my: 0.5 }}>Ảnh sản phẩm</Divider></Grid>
                        {(['frontImageUrl', 'backImageUrl'] as const).map((field) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={field}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                    {field === 'frontImageUrl' ? 'Mặt trước' : 'Mặt sau'}
                                </Typography>
                                {editTarget?.[field] ? (
                                    <Box
                                        component="img"
                                        src={editTarget[field] as string}
                                        sx={{ width: '100%', height: 110, objectFit: 'contain', borderRadius: 1.5, border: '1px solid', borderColor: 'divider', mb: 0.5 }}
                                    />
                                ) : (
                                    <Box sx={{ width: '100%', height: 80, borderRadius: 1.5, border: '2px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.disabled">Chưa có ảnh</Typography>
                                    </Box>
                                )}
                                <Button
                                    size="small"
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<CloudUpload />}
                                    onClick={() => { setUploadField(field); fileInputRef.current?.click(); }}
                                >
                                    {editTarget?.[field] ? 'Đổi ảnh' : 'Tải lên'}
                                </Button>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button onClick={() => setEditOpen(false)} color="inherit">Hủy</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ minWidth: 90, bgcolor: '#086839', '&:hover': { bgcolor: '#065f2d' } }}>
                        {saving ? <CircularProgress size={16} /> : 'Lưu'}
                    </Button>
                </DialogActions>
            </Dialog>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />

            {/* ─── Delete dialog ─── */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <Typography>
                        Xóa giỏ <b>{deleteTarget?.basketName}</b> (<code>{deleteTarget?.currentCode}</code>)?
                    </Typography>
                    <Typography variant="caption" color="error.main">
                        Thao tác này không thể hoàn tác.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button onClick={() => setDeleteTarget(null)} color="inherit">Hủy</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>Xóa</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
