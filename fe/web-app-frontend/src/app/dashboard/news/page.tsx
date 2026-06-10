'use client';

import { useEffect, useRef, useState } from 'react';
import {
    Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, IconButton, MenuItem, Pagination, Paper, Stack,
    Switch, TablePagination, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import {
    AddRounded, EditRounded, DeleteRounded,
    PushPinRounded, VisibilityRounded, SendRounded, UnpublishedRounded,
    CloudUploadRounded, CloseRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import PageHeader from '@/components/common/PageHeader';
import { CampaignRounded } from '@mui/icons-material';
import { newsApi } from '@/features/news/api/news.api';
import NewsEditor from '@/features/news/components/NewsEditor';

type NewsItem = {
    id: number;
    title: string;
    content: string;
    thumbnailUrl?: string;
    type?: string;
    status?: string;
    viewCount: number;
    isPinned: boolean;
    createdByName?: string;
    createdAt?: string;
    updatedAt?: string;
};

const TYPE_OPTIONS = [
    { value: 'announcement', label: 'Thông báo' },
    { value: 'event', label: 'Sự kiện' },
    { value: 'info', label: 'Thông tin' },
    { value: 'policy', label: 'Chính sách' },
    { value: 'hr', label: 'Nhân sự' },
    { value: 'training', label: 'Đào tạo' },
    { value: 'achievement', label: 'Vinh danh' },
];

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
    const pageSize = 5;
    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({
        title: '',
        content: '',
        thumbnailUrl: '',
        type: 'announcement',
        status: 'draft',
        isPinned: false,
    });

    const fetchNews = async () => {
        try {
            setLoading(true);
            const res = await newsApi.getPaged({
                search: search || undefined,
                status: filterStatus || undefined,
                type: filterType || undefined,
                pageSize,
                page: page+1
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

    // Fetch khi page hoặc filter thay đổi
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
            toast.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
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
        } catch {
            toast.error('Xóa thất bại');
        }
    };

    const handleTogglePin = async (id: number) => {
        try {
            await newsApi.togglePin(id);
            fetchNews();
        } catch {
            toast.error('Thao tác thất bại');
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
        } catch {
            toast.error('Thao tác thất bại');
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

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#f0f7f3', backgroundImage: `radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)` }}>
            <LoadingOverlay open={loading} text="Đang xử lý..." />

            <PageHeader
                title="Quản Lý Tin Nội Bộ"
                subtitle="Soạn thảo và quản lý thông báo, tin tức nội bộ"
                icon={<CampaignRounded />}
                gradient="linear-gradient(135deg, #086839 0%, #16a34a 100%)"
                shadowColor="rgba(8,104,57,0.28)"
                actions={
                    <Button
                        variant="contained"
                        startIcon={<AddRounded />}
                        onClick={openCreate}
                        sx={{ bgcolor: '#086839', borderRadius: '12px', fontWeight: 700, textTransform: 'none', boxShadow: '0 1px 6px rgba(8,104,57,0.18)', '&:hover': { bgcolor: '#064e2b' } }}
                    >
                        Soạn bài mới
                    </Button>
                }
            />

            {/* Filter */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', mb: 3, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 2 }}>
                    <TextField size="small" label="Tìm kiếm" value={search} onChange={e => setSearch(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                    <TextField select size="small" label="Loại" value={filterType} onChange={e => setFilterType(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {TYPE_OPTIONS.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Trạng thái" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="draft">Nháp</MenuItem>
                        <MenuItem value="published">Đã đăng</MenuItem>
                    </TextField>
                </Box>
            </Paper>

            {/* Danh sách bài */}
            <Stack spacing={2}>
                {newsList.map(item => (
                    <Paper key={item.id} elevation={0} sx={{
                        p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#fff',
                        borderLeft: item.isPinned ? '4px solid #086839' : '4px solid transparent',
                        '&:hover': { boxShadow: '0 4px 20px rgba(8,104,57,0.08)' }, transition: 'all 0.2s',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" spacing={1} sx={{ mb: 0.8, flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                    {item.isPinned && <Chip label="📌 Ghim" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, height: 20 }} />}
                                    <Chip
                                        label={TYPE_OPTIONS.find(t => t.value === item.type)?.label ?? item.type}
                                        size="small"
                                        sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: 11, height: 20 }}
                                    />
                                    <Chip
                                        label={item.status === 'published' ? 'Đã đăng' : 'Nháp'}
                                        size="small"
                                        sx={{
                                            bgcolor: item.status === 'published' ? '#dcfce7' : '#fef3c7',
                                            color: item.status === 'published' ? '#15803d' : '#b45309',
                                            fontWeight: 700, fontSize: 11, height: 20,
                                        }}
                                    />
                                </Stack>
                                <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0f172a', mb: 0.5 }}>
                                    {item.title}
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                                    {item.createdByName} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''} • 👁 {item.viewCount}
                                </Typography>
                            </Box>

                            {/* Actions */}
                            <Stack direction="row" spacing={0.5}>
                                <Tooltip title={item.isPinned ? 'Bỏ ghim' : 'Ghim bài'}>
                                    <IconButton size="small" onClick={() => handleTogglePin(item.id)}
                                        sx={{ color: item.isPinned ? '#086839' : '#94a3b8', '&:hover': { bgcolor: alpha('#086839', 0.08) } }}>
                                        <PushPinRounded sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={item.status === 'published' ? 'Hủy đăng' : 'Đăng bài'}>
                                    <IconButton size="small" onClick={() => handlePublish(item.id, item.status ?? '')}
                                        sx={{ color: item.status === 'published' ? '#f59e0b' : '#086839', '&:hover': { bgcolor: alpha('#086839', 0.08) } }}>
                                        {item.status === 'published' ? <UnpublishedRounded sx={{ fontSize: 18 }} /> : <SendRounded sx={{ fontSize: 18 }} />}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Chỉnh sửa">
                                    <IconButton size="small" onClick={() => openEdit(item)}
                                        sx={{ color: '#2563eb', '&:hover': { bgcolor: alpha('#2563eb', 0.08) } }}>
                                        <EditRounded sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa">
                                    <IconButton size="small" onClick={() => handleDelete(item.id)}
                                        sx={{ color: '#ef4444', '&:hover': { bgcolor: alpha('#ef4444', 0.08) } }}>
                                        <DeleteRounded sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                           
                        </Box>
                    </Paper>
                ))}
                <Box sx={{
                    bgcolor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    mt: 2,
                    overflow: 'hidden',
                }}>
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        rowsPerPage={pageSize}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPageOptions={[]} // ẩn dropdown đổi số dòng nếu không cần
                        labelRowsPerPage="Số dòng:"
                        sx={{
                            '& .MuiTablePagination-toolbar': { minHeight: 48 },
                            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                fontSize: 13,
                                color: '#64748b',
                            },
                        }}
                    />
                </Box>
                {!newsList.length && !loading && (
                    <Box sx={{ textAlign: 'center', py: 10, color: '#94a3b8' }}>
                        <Typography sx={{ fontSize: 48, mb: 1 }}>📭</Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Chưa có bài viết nào</Typography>
                    </Box>
                )}
            </Stack>

            {/* Dialog soạn bài */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth
                slotProps={{ paper: { sx: { borderRadius: '20px', maxHeight: '90vh' } } }}>
                <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', pb: 2 }}>
                    {editingId ? 'Chỉnh sửa bài viết' : 'Soạn bài mới'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <TextField
                        label="Tiêu đề" fullWidth size="small"
                        value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: 16, fontWeight: 700 } }}
                    />
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                        <TextField select size="small" label="Loại" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                            {TYPE_OPTIONS.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" label="Trạng thái" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                            <MenuItem value="draft">Lưu nháp</MenuItem>
                            <MenuItem value="published">Đăng luôn</MenuItem>
                        </TextField>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <input
                                ref={thumbnailInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                hidden
                                onChange={handleThumbnailUpload}
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={uploadingThumb ? <CircularProgress size={16} /> : <CloudUploadRounded />}
                                disabled={uploadingThumb}
                                onClick={() => thumbnailInputRef.current?.click()}
                                sx={{
                                    borderRadius: '12px',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    borderColor: '#e2e8f0',
                                    color: '#475569',
                                    height: 40,
                                    flex: 1,
                                    '&:hover': { borderColor: '#086839', color: '#086839' },
                                }}
                            >
                                {form.thumbnailUrl ? 'Đổi ảnh bìa' : 'Tải ảnh bìa'}
                            </Button>
                            {form.thumbnailUrl && (
                                <IconButton
                                    size="small"
                                    onClick={() => setForm(f => ({ ...f, thumbnailUrl: '' }))}
                                    sx={{ color: '#ef4444' }}
                                >
                                    <CloseRounded sx={{ fontSize: 18 }} />
                                </IconButton>
                            )}
                        </Box>
                    </Box>
                    {form.thumbnailUrl && (
                        <Box sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', maxWidth: 300 }}>
                            <Box
                                component="img"
                                src={form.thumbnailUrl}
                                alt="Thumbnail preview"
                                sx={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                            />
                        </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Switch checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))}
                            sx={{ '& .MuiSwitch-thumb': { bgcolor: form.isPinned ? '#086839' : undefined } }} />
                        <Typography sx={{ fontSize: 13, color: '#475569' }}>Ghim bài viết lên đầu</Typography>
                    </Box>
                    <NewsEditor value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} />
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9' }}>
                    <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                    <Button variant="contained" onClick={handleSave} disabled={loading}
                        sx={{ bgcolor: '#086839', borderRadius: '10px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#064e2b' } }}>
                        {editingId ? 'Cập nhật' : 'Lưu bài'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}