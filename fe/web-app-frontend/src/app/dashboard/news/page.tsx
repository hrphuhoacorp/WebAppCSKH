'use client';

import { useEffect, useRef, useState } from 'react';
import {
    Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, IconButton, MenuItem, Paper, TablePagination,
    TextField, Tooltip, Typography, Switch,
} from '@mui/material';
import {
    AddRounded, EditRounded, DeleteRounded, PushPinRounded,
    SendRounded, UnpublishedRounded, CloudUploadRounded, CloseRounded,
    ArticleRounded, CheckCircleRounded, DraftsRounded, BookmarkRounded,
    VisibilityRounded, AccessTimeRounded,
} from '@mui/icons-material';
import { CampaignRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import PageHeader from '@/components/common/PageHeader';
import { newsApi } from '@/features/news/api/news.api';
import NewsEditor from '@/features/news/components/NewsEditor';
import { TYPE_LABEL, TYPE_OPTIONS, NewsItem, fixVnDate } from '@/features/news/news.shared';

// ── Helpers ──────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type?: string }) {
    const info = type ? TYPE_LABEL[type] : null;
    if (!info) return null;
    return (
        <Box sx={{
            display: 'inline-flex', alignItems: 'center',
            px: 1.2, py: 0.25,
            borderRadius: '5px',
            bgcolor: info.color + '18',
            color: info.color,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
            border: `1px solid ${info.color}30`,
            whiteSpace: 'nowrap',
        }}>
            {info.label}
        </Box>
    );
}

function StatusBadge({ status }: { status?: string }) {
    const published = status === 'published';
    return (
        <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.4,
            px: 1.2, py: 0.25,
            borderRadius: '5px',
            bgcolor: published ? '#dcfce7' : '#fef3c7',
            color: published ? '#15803d' : '#92400e',
            fontSize: 11, fontWeight: 700,
        }}>
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'currentColor' }} />
            {published ? 'Đã đăng' : 'Nháp'}
        </Box>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewsManagePage() {
    const [loading, setLoading] = useState(false);
    const [newsList, setNewsList] = useState<NewsItem[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    const [page, setPage] = useState(0);
    const pageSize = 8;

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({
        title: '', content: '', thumbnailUrl: '',
        type: 'announcement', status: 'draft', isPinned: false,
    });

    // stats derived from list (approximation — real stats need dedicated API)
    const publishedCount = newsList.filter(n => n.status === 'published').length;
    const draftCount = newsList.filter(n => n.status !== 'published').length;
    const pinnedCount = newsList.filter(n => n.isPinned).length;

    const fetchNews = async () => {
        try {
            setLoading(true);
            const res = await newsApi.getPaged({
                search: search || undefined,
                status: filterStatus || undefined,
                type: filterType || undefined,
                pageSize,
                page: page + 1,
            });
            setNewsList(res.content.items);
            setTotal(res.content.totalItems);
        } catch {
            toast.error('Không tải được danh sách tin');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { setPage(0); }, [search, filterStatus, filterType]);
    useEffect(() => { fetchNews(); }, [search, filterStatus, filterType, page]);

    const openCreate = () => {
        setEditingId(null);
        setForm({ title: '', content: '', thumbnailUrl: '', type: 'announcement', status: 'draft', isPinned: false });
        setDialogOpen(true);
    };

    const openEdit = (item: NewsItem) => {
        setEditingId(item.id);
        setForm({
            title: item.title,
            content: item.content,
            thumbnailUrl: item.thumbnailUrl || '',
            type: item.type || 'announcement',
            status: item.status || 'draft',
            isPinned: item.isPinned,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) { toast.error('Vui lòng nhập tiêu đề'); return; }
        if (!form.content.trim()) { toast.error('Vui lòng nhập nội dung'); return; }
        try {
            setLoading(true);
            if (editingId) {
                await newsApi.update(editingId, form);
                toast.success('Cập nhật thành công');
            } else {
                await newsApi.create(form);
                toast.success('Tạo bài viết thành công');
            }
            setDialogOpen(false);
            fetchNews();
        } catch (e: any) {
            toast.error(e?.response?.data?.Message ?? 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Bạn có chắc muốn xóa bài này?')) return;
        try {
            await newsApi.delete(id);
            toast.success('Đã xóa bài viết');
            fetchNews();
        } catch { toast.error('Xóa thất bại'); }
    };

    const handleTogglePin = async (id: number) => {
        try { await newsApi.togglePin(id); fetchNews(); }
        catch (e: any) {
            if (e?.response?.status === 409) { fetchNews(); return; }
            toast.error(e?.response?.data?.Message ?? e?.response?.data?.Message ?? 'Ghim thất bại');
        }
    };

    const handlePublish = async (id: number, currentStatus: string) => {
        try {
            if (currentStatus === 'published') {
                await newsApi.unpublish(id);
                toast.success('Đã hủy đăng');
            } else {
                await newsApi.publish(id);
                toast.success('Đã đăng bài');
            }
            fetchNews();
        } catch (e: any) {
            if (e?.response?.status === 409) {
                // State mismatch — sync lại từ server
                toast('Trạng thái bài đã thay đổi, đang cập nhật...', { icon: '🔄' });
                fetchNews();
                return;
            }
            const msg = e?.response?.data?.Message;
            toast.error(msg ?? 'Thao tác thất bại');
        }
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingThumb(true);
            const res = await newsApi.uploadImage(file);
            setForm(f => ({ ...f, thumbnailUrl: res.content }));
            toast.success('Upload ảnh bìa thành công');
        } catch {
            toast.error('Upload ảnh bìa thất bại');
        } finally {
            setUploadingThumb(false);
            if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
        }
    };

    const typeColor = TYPE_LABEL[form.type]?.color ?? '#086839';

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#f8fafc' }}>
            <LoadingOverlay open={loading} text="Đang xử lý..." />

            <PageHeader
                title="Quản Lý Tin Nội Bộ"
                subtitle="Soạn thảo và quản lý thông báo, tin tức nội bộ"
                icon={<CampaignRounded />}
                actions={
                    <Button
                        variant="contained"
                        startIcon={<AddRounded />}
                        onClick={openCreate}
                        sx={{
                            bgcolor: '#086839', borderRadius: '10px', fontWeight: 700,
                            textTransform: 'none', boxShadow: 'none',
                            '&:hover': { bgcolor: '#064e2b', boxShadow: 'none' },
                        }}
                    >
                        Soạn bài mới
                    </Button>
                }
            />

            {/* ── Stats row ── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
                {[
                    { label: 'Tổng bài viết', value: total, icon: <ArticleRounded sx={{ fontSize: 20 }} />, color: '#0369a1', bg: '#e0f2fe' },
                    { label: 'Đã đăng', value: publishedCount, icon: <CheckCircleRounded sx={{ fontSize: 20 }} />, color: '#15803d', bg: '#dcfce7' },
                    { label: 'Bản nháp', value: draftCount, icon: <DraftsRounded sx={{ fontSize: 20 }} />, color: '#b45309', bg: '#fef3c7' },
                    { label: 'Đang ghim', value: pinnedCount, icon: <BookmarkRounded sx={{ fontSize: 20 }} />, color: '#7c3aed', bg: '#ede9fe' },
                ].map(stat => (
                    <Paper key={stat.label} elevation={0} sx={{
                        p: 2, borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#fff',
                        display: 'flex', alignItems: 'center', gap: 1.5,
                    }}>
                        <Box sx={{ p: 1, borderRadius: '10px', bgcolor: stat.bg, color: stat.color, display: 'flex' }}>
                            {stat.icon}
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                                {stat.value}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.2 }}>{stat.label}</Typography>
                        </Box>
                    </Paper>
                ))}
            </Box>

            {/* ── Filter bar ── */}
            <Paper elevation={0} sx={{ borderRadius: '14px', mb: 3, border: '1px solid #e2e8f0', bgcolor: '#fff', overflow: 'hidden' }}>
                {/* Row 1: Search */}
                <Box sx={{ px: 2.5, pt: 2.5, pb: 2, display: 'flex', gap: 1.5 }}>
                    <TextField
                        size="small"
                        placeholder="Tìm theo tiêu đề bài viết..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchNews()}
                        sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13.5, bgcolor: '#f8fafc' } }}
                        slotProps={{
                            input: {
                                endAdornment: search ? (
                                    <IconButton size="small" onClick={() => setSearch('')} sx={{ mr: -0.5 }}>
                                        <CloseRounded sx={{ fontSize: 14 }} />
                                    </IconButton>
                                ) : null,
                            },
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={fetchNews}
                        sx={{
                            bgcolor: '#086839', borderRadius: '10px', fontWeight: 600,
                            textTransform: 'none', px: 2.5, boxShadow: 'none', flexShrink: 0,
                            '&:hover': { bgcolor: '#064e2b', boxShadow: 'none' },
                        }}
                    >
                        Tìm kiếm
                    </Button>
                </Box>

                {/* Row 2: Filters */}
                <Box sx={{
                    px: 2.5, py: 1.5,
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center',
                }}>
                    {/* Status label */}
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase', mr: 0.5 }}>
                        Trạng thái
                    </Typography>
                    {[
                        { value: '', label: 'Tất cả', color: '#475569', bg: '#f1f5f9' },
                        { value: 'published', label: 'Đã đăng', color: '#15803d', bg: '#dcfce7' },
                        { value: 'draft', label: 'Nháp', color: '#92400e', bg: '#fef3c7' },
                    ].map(s => (
                        <Box key={s.value} onClick={() => setFilterStatus(s.value)} sx={{
                            px: 1.4, py: 0.45, borderRadius: '7px', fontSize: 12.5, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                            bgcolor: filterStatus === s.value ? s.bg : 'transparent',
                            color: filterStatus === s.value ? s.color : '#94a3b8',
                            border: `1.5px solid ${filterStatus === s.value ? s.bg : 'transparent'}`,
                            '&:hover': { bgcolor: s.bg, color: s.color },
                        }}>
                            {s.label}
                        </Box>
                    ))}

                    <Box sx={{ width: 1, height: 18, bgcolor: '#e2e8f0', mx: 0.5 }} />

                    {/* Type label */}
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase', mr: 0.5 }}>
                        Danh mục
                    </Typography>
                    <Box onClick={() => setFilterType('')} sx={{
                        px: 1.4, py: 0.45, borderRadius: '7px', fontSize: 12.5, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                        bgcolor: filterType === '' ? '#f1f5f9' : 'transparent',
                        color: filterType === '' ? '#475569' : '#94a3b8',
                        '&:hover': { bgcolor: '#f1f5f9', color: '#475569' },
                    }}>
                        Tất cả
                    </Box>
                    {Object.entries(TYPE_LABEL).map(([key, info]) => (
                        <Box key={key} onClick={() => setFilterType(filterType === key ? '' : key)} sx={{
                            px: 1.4, py: 0.45, borderRadius: '7px', fontSize: 12.5, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                            bgcolor: filterType === key ? info.color + '18' : 'transparent',
                            color: filterType === key ? info.color : '#94a3b8',
                            border: `1.5px solid ${filterType === key ? info.color + '40' : 'transparent'}`,
                            '&:hover': { bgcolor: info.color + '14', color: info.color },
                        }}>
                            {info.label}
                        </Box>
                    ))}
                </Box>
            </Paper>

            {/* ── Article list ── */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {newsList.length === 0 && !loading && (
                    <Box sx={{ textAlign: 'center', py: 14, color: '#94a3b8', bgcolor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <ArticleRounded sx={{ fontSize: 48, mb: 1, opacity: 0.25 }} />
                        <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#64748b' }}>Chưa có bài viết nào</Typography>
                        <Typography sx={{ fontSize: 13, mt: 0.5 }}>Nhấn "Soạn bài mới" để bắt đầu</Typography>
                    </Box>
                )}

                {newsList.map(item => {
                    const typeInfo = item.type ? TYPE_LABEL[item.type] : null;
                    const accentColor = typeInfo?.color ?? '#086839';

                    return (
                        <Paper key={item.id} elevation={0} sx={{
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            bgcolor: '#fff',
                            overflow: 'hidden',
                            display: 'flex',
                            transition: 'box-shadow 0.2s, border-color 0.2s',
                            '&:hover': {
                                boxShadow: `0 4px 20px ${accentColor}14`,
                                borderColor: accentColor + '40',
                            },
                        }}>
                            {/* Left color accent */}
                            <Box sx={{ width: 4, flexShrink: 0, bgcolor: accentColor, opacity: item.status === 'published' ? 1 : 0.35 }} />

                            {/* Main content */}
                            <Box sx={{ flex: 1, minWidth: 0, p: 2.5, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    {/* Badges row */}
                                    <Box sx={{ display: 'flex', gap: 0.8, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                        {item.isPinned && (
                                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1.2, py: 0.25, borderRadius: '5px', bgcolor: '#ede9fe', color: '#7c3aed', fontSize: 11, fontWeight: 700 }}>
                                                <PushPinRounded sx={{ fontSize: 11 }} /> Đang ghim
                                            </Box>
                                        )}
                                        <TypeBadge type={item.type} />
                                        <StatusBadge status={item.status} />
                                    </Box>

                                    {/* Title */}
                                    <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a', mb: 0.8, lineHeight: 1.4 }}>
                                        {item.title}
                                    </Typography>

                                    {/* Meta */}
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, color: '#94a3b8' }}>
                                            <AccessTimeRounded sx={{ fontSize: 13 }} />
                                            {item.createdAt ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(item.createdAt)) : '—'}
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, color: '#94a3b8' }}>
                                            <VisibilityRounded sx={{ fontSize: 13 }} />
                                            {item.viewCount.toLocaleString()} lượt xem
                                        </Box>
                                        {item.createdByName && (
                                            <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                                                bởi <Box component="span" sx={{ color: '#64748b', fontWeight: 600 }}>{item.createdByName}</Box>
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>

                                {/* Thumbnail */}
                                {item.thumbnailUrl && (
                                    <Box sx={{
                                        width: 80, height: 60, flexShrink: 0,
                                        borderRadius: '8px', overflow: 'hidden',
                                        border: '1px solid #f1f5f9',
                                        display: { xs: 'none', sm: 'block' },
                                    }}>
                                        <Box component="img" src={item.thumbnailUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    </Box>
                                )}
                            </Box>

                            {/* Action buttons */}
                            <Box sx={{
                                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                                gap: 0.5, px: 1.5, borderLeft: '1px solid #f1f5f9',
                                flexShrink: 0,
                            }}>
                                <Tooltip title={item.isPinned ? 'Bỏ ghim' : 'Ghim bài'}>
                                    <IconButton size="small" onClick={() => handleTogglePin(item.id)}
                                        sx={{ color: item.isPinned ? '#7c3aed' : '#cbd5e1', '&:hover': { bgcolor: '#ede9fe', color: '#7c3aed' } }}>
                                        <PushPinRounded sx={{ fontSize: 17 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={item.status === 'published' ? 'Hủy đăng' : 'Đăng bài'}>
                                    <IconButton size="small" onClick={() => handlePublish(item.id, item.status ?? '')}
                                        sx={{
                                            color: item.status === 'published' ? '#f59e0b' : '#15803d',
                                            '&:hover': { bgcolor: item.status === 'published' ? '#fef3c7' : '#dcfce7' },
                                        }}>
                                        {item.status === 'published'
                                            ? <UnpublishedRounded sx={{ fontSize: 17 }} />
                                            : <SendRounded sx={{ fontSize: 17 }} />}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Chỉnh sửa">
                                    <IconButton size="small" onClick={() => openEdit(item)}
                                        sx={{ color: '#93c5fd', '&:hover': { bgcolor: '#dbeafe', color: '#2563eb' } }}>
                                        <EditRounded sx={{ fontSize: 17 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa">
                                    <IconButton size="small" onClick={() => handleDelete(item.id)}
                                        sx={{ color: '#fca5a5', '&:hover': { bgcolor: '#fee2e2', color: '#ef4444' } }}>
                                        <DeleteRounded sx={{ fontSize: 17 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Paper>
                    );
                })}
            </Box>

            {/* ── Pagination ── */}
            {total > pageSize && (
                <Paper elevation={0} sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#fff', mt: 2, overflow: 'hidden' }}>
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        rowsPerPage={pageSize}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPageOptions={[]}
                        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count} bài`}
                        sx={{
                            '& .MuiTablePagination-toolbar': { minHeight: 48 },
                            '& .MuiTablePagination-displayedRows': { fontSize: 13, color: '#64748b' },
                        }}
                    />
                </Paper>
            )}

            {/* ── Dialog soạn / sửa bài ── */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth
                slotProps={{ paper: { sx: { borderRadius: '20px', maxHeight: '92vh' } } }}>

                {/* Header với accent color theo type */}
                <DialogTitle sx={{ p: 0 }}>
                    <Box sx={{
                        px: 3, py: 2.5,
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex', alignItems: 'center', gap: 2,
                    }}>
                        <Box sx={{
                            width: 36, height: 36, borderRadius: '10px',
                            bgcolor: typeColor + '18', color: typeColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <CampaignRounded sx={{ fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                                {editingId ? 'Chỉnh sửa bài viết' : 'Soạn bài mới'}
                            </Typography>
                            {form.type && (
                                <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.2 }}>
                                    Danh mục: <Box component="span" sx={{ color: typeColor, fontWeight: 600 }}>{TYPE_LABEL[form.type]?.label}</Box>
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ pt: '20px !important', pb: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Title */}
                    <TextField
                        label="Tiêu đề bài viết" fullWidth size="small"
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 15, fontWeight: 700 } }}
                    />

                    {/* Meta row */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                        {/* Type selector with color preview */}
                        <TextField select size="small" label="Danh mục"
                            value={form.type}
                            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        >
                            {Object.entries(TYPE_LABEL).map(([key, info]) => (
                                <MenuItem key={key} value={key}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: info.color, flexShrink: 0 }} />
                                        {info.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Status */}
                        <TextField select size="small" label="Trạng thái"
                            value={form.status}
                            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        >
                            <MenuItem value="draft">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                                    Lưu nháp
                                </Box>
                            </MenuItem>
                            <MenuItem value="published">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} />
                                    Đăng luôn
                                </Box>
                            </MenuItem>
                        </TextField>

                        {/* Thumbnail upload */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <input ref={thumbnailInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleThumbnailUpload} />
                            <Button
                                variant="outlined" size="small" fullWidth
                                startIcon={uploadingThumb ? <CircularProgress size={14} /> : <CloudUploadRounded />}
                                disabled={uploadingThumb}
                                onClick={() => thumbnailInputRef.current?.click()}
                                sx={{
                                    borderRadius: '10px', textTransform: 'none', fontWeight: 600, height: 40,
                                    borderColor: '#e2e8f0', color: '#475569',
                                    '&:hover': { borderColor: '#086839', color: '#086839', bgcolor: '#f0fdf4' },
                                }}
                            >
                                {form.thumbnailUrl ? 'Đổi ảnh bìa' : 'Tải ảnh bìa'}
                            </Button>
                            {form.thumbnailUrl && (
                                <IconButton size="small" onClick={() => setForm(f => ({ ...f, thumbnailUrl: '' }))}
                                    sx={{ color: '#fca5a5', '&:hover': { color: '#ef4444', bgcolor: '#fee2e2' } }}>
                                    <CloseRounded sx={{ fontSize: 16 }} />
                                </IconButton>
                            )}
                        </Box>
                    </Box>

                    {/* Thumbnail preview */}
                    {form.thumbnailUrl && (
                        <Box sx={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', maxWidth: 280 }}>
                            <Box component="img" src={form.thumbnailUrl} alt="Thumbnail" sx={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                        </Box>
                    )}

                    {/* Pin toggle */}
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        px: 2, py: 1.2, borderRadius: '10px',
                        bgcolor: form.isPinned ? '#f5f3ff' : '#f8fafc',
                        border: '1px solid', borderColor: form.isPinned ? '#ddd6fe' : '#e2e8f0',
                        transition: 'all 0.2s', width: 'fit-content',
                    }}>
                        <Switch
                            checked={form.isPinned}
                            onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))}
                            size="small"
                            sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': { color: '#7c3aed' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#7c3aed' },
                            }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <PushPinRounded sx={{ fontSize: 15, color: form.isPinned ? '#7c3aed' : '#94a3b8' }} />
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: form.isPinned ? '#7c3aed' : '#64748b' }}>
                                {form.isPinned ? 'Đang ghim bài viết' : 'Ghim lên đầu'}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Editor */}
                    <NewsEditor value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} />
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9', gap: 1 }}>
                    <Button onClick={() => setDialogOpen(false)}
                        sx={{ textTransform: 'none', color: '#64748b', borderRadius: '10px' }}>
                        Hủy
                    </Button>
                    <Button variant="contained" onClick={handleSave} disabled={loading}
                        sx={{
                            bgcolor: typeColor, borderRadius: '10px', textTransform: 'none',
                            fontWeight: 700, boxShadow: 'none',
                            '&:hover': { bgcolor: typeColor, filter: 'brightness(0.88)', boxShadow: 'none' },
                        }}>
                        {editingId ? 'Cập nhật' : 'Lưu bài'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
