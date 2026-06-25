'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, MenuItem, Paper, Skeleton, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, alpha,
    InputAdornment,
} from '@mui/material';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import WorkIcon from '@mui/icons-material/Work';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/providers/AuthProviders';
import {
    recruitmentCampaignApi,
    RecruitmentCampaignDto,
    CampaignUpsertDto,
} from '@/features/recruitment/api/recruitment.api';

const G = '#086839';
const BORDER = '#e2e8f0';
const R = '20px';

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: G } },
    '& label.Mui-focused': { color: G },
};

const STATUSES = [
    { value: 'open', label: 'Đang mở', color: '#dcfce7', text: '#15803d' },
    { value: 'paused', label: 'Tạm dừng', color: '#fef3c7', text: '#b45309' },
    { value: 'closed', label: 'Đã đóng', color: '#f1f5f9', text: '#475569' },
];

const empty = (): CampaignUpsertDto => ({
    name: '', position: '', quantityNeeded: undefined,
    startDate: '', endDate: '', postContent: '', requirements: '', note: '', status: 'open',
});

export default function TabCampaigns() {
    const canEdit = usePermission('recruitment.edit');
    const { profile } = useAuth();
    const qc = useQueryClient();

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<RecruitmentCampaignDto | null>(null);
    const [form, setForm] = useState<CampaignUpsertDto>(empty());
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['recruitment-campaigns'],
        queryFn: () => recruitmentCampaignApi.getAll(),
    });

    const all = data?.content ?? [];
    const rows = all.filter(c => {
        const q = search.toLowerCase();
        const matchSearch = !q || c.name.toLowerCase().includes(q) || c.position.toLowerCase().includes(q);
        const matchStatus = !filterStatus || c.status === filterStatus;
        return matchSearch && matchStatus;
    });

    function openCreate() {
        setEditTarget(null);
        setForm({ ...empty(), createdBy: profile?.name ?? '' });
        setDialogOpen(true);
    }
    function openEdit(c: RecruitmentCampaignDto) {
        setEditTarget(c);
        setForm({ name: c.name, position: c.position, quantityNeeded: c.quantityNeeded, startDate: c.startDate, endDate: c.endDate, postContent: c.postContent, requirements: c.requirements, note: c.note, status: c.status, createdBy: c.createdBy });
        setDialogOpen(true);
    }
    function set<K extends keyof CampaignUpsertDto>(k: K, v: CampaignUpsertDto[K]) {
        setForm(f => ({ ...f, [k]: v }));
    }

    async function handleSave() {
        if (!form.name.trim() || !form.position.trim()) { toast.error('Nhập tên chiến dịch và vị trí'); return; }
        setSaving(true);
        try {
            if (editTarget) { await recruitmentCampaignApi.update(editTarget.id, form); toast.success('Cập nhật thành công'); }
            else { await recruitmentCampaignApi.create(form); toast.success('Tạo chiến dịch thành công'); }
            qc.invalidateQueries({ queryKey: ['recruitment-campaigns'] });
            setDialogOpen(false);
        } catch { toast.error('Có lỗi xảy ra'); } finally { setSaving(false); }
    }

    async function handleDelete() {
        if (deleteId == null) return;
        setDeleting(true);
        try {
            await recruitmentCampaignApi.delete(deleteId);
            toast.success('Đã xóa chiến dịch');
            qc.invalidateQueries({ queryKey: ['recruitment-campaigns'] });
            setDeleteId(null);
        } catch { toast.error('Không thể xóa'); } finally { setDeleting(false); }
    }

    const statusDef = (val: string) => STATUSES.find(s => s.value === val) ?? STATUSES[2];

    return (
        <>
            <LoadingOverlay open={saving || deleting} />

            {/* Filter bar */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: R, mb: 2, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                        size="small" placeholder="Tìm tên chiến dịch, vị trí..." value={search}
                        onChange={e => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 220, ...fieldSx }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} /></InputAdornment> } }}
                    />
                    <TextField select size="small" label="Trạng thái" value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)} sx={{ minWidth: 160, ...fieldSx }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                    </TextField>
                    {canEdit && (
                        <Button variant="contained" startIcon={<AddCircleRoundedIcon />} onClick={openCreate}
                            sx={{ ml: 'auto', borderRadius: '12px', textTransform: 'none', fontWeight: 700, bgcolor: G, '&:hover': { bgcolor: '#065f2d' } }}>
                            Tạo chiến dịch
                        </Button>
                    )}
                </Box>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{
                flex: 1, minHeight: 0, borderRadius: R, border: `1px solid ${BORDER}`,
                overflow: 'auto', bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                '&::-webkit-scrollbar': { width: 6, height: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 },
            }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            {['Tên chiến dịch', 'Vị trí', 'Số lượng', 'Thời gian', 'Trạng thái', 'Người tạo', canEdit ? 'Thao tác' : ''].filter(Boolean).map(h => (
                                <TableCell key={h} sx={{ bgcolor: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.6px', py: 1.75, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? [1, 2, 3].map(i => (
                            <TableRow key={i}>{[1, 2, 3, 4, 5, 6].map(j => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                        )) : rows.length === 0 ? (
                            <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <WorkIcon sx={{ fontSize: 28, color: '#94a3b8' }} />
                                    </Box>
                                    <Typography sx={{ fontWeight: 700, color: '#64748b', fontSize: 15 }}>Chưa có chiến dịch nào</Typography>
                                </Box>
                            </TableCell></TableRow>
                        ) : rows.map(c => {
                            const sd = statusDef(c.status);
                            return (
                                <TableRow key={c.id} sx={{ '&:hover': { bgcolor: '#f0fdf4 !important' }, transition: 'background-color 0.15s' }}>
                                    <TableCell sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b', maxWidth: 220 }}>{c.name}</TableCell>
                                    <TableCell sx={{ fontSize: 13, color: '#475569' }}>{c.position}</TableCell>
                                    <TableCell sx={{ fontSize: 13, color: '#475569', textAlign: 'center' }}>{c.quantityNeeded ?? '-'}</TableCell>
                                    <TableCell sx={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                                        {c.startDate && c.endDate ? `${c.startDate} - ${c.endDate}` : c.startDate || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={sd.label} size="small" sx={{ bgcolor: sd.color, color: sd.text, fontWeight: 700, fontSize: 11, borderRadius: '6px' }} />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12, color: '#94a3b8' }}>{c.createdBy || '-'}</TableCell>
                                    {canEdit && (
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            <Tooltip title="Sửa">
                                                <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: G, '&:hover': { bgcolor: alpha(G, 0.08) } }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Xóa">
                                                <IconButton size="small" onClick={() => setDeleteId(c.id)} sx={{ color: '#dc2626', '&:hover': { bgcolor: alpha('#dc2626', 0.08) } }}>
                                                    <DeleteOutlinedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create/Edit dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: R } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 17, pb: 1 }}>
                    {editTarget ? 'Cập nhật chiến dịch' : 'Tạo chiến dịch mới'}
                </DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <TextField label="Tên chiến dịch *" value={form.name} onChange={e => set('name', e.target.value)} size="small" fullWidth sx={fieldSx} />
                    <TextField label="Vị trí tuyển dụng *" value={form.position} onChange={e => set('position', e.target.value)} size="small" fullWidth sx={fieldSx} />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField label="Số lượng cần" type="number" value={form.quantityNeeded ?? ''} onChange={e => set('quantityNeeded', e.target.value ? Number(e.target.value) : undefined)} size="small" sx={{ flex: 1, ...fieldSx }} />
                        <TextField label="Trạng thái" select value={form.status ?? 'open'} onChange={e => set('status', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }}>
                            {STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                        </TextField>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField label="Ngày bắt đầu" value={form.startDate ?? ''} onChange={e => set('startDate', e.target.value)} size="small" placeholder="dd/mm/yyyy" sx={{ flex: 1, ...fieldSx }} />
                        <TextField label="Ngày kết thúc" value={form.endDate ?? ''} onChange={e => set('endDate', e.target.value)} size="small" placeholder="dd/mm/yyyy" sx={{ flex: 1, ...fieldSx }} />
                    </Box>
                    <TextField label="Yêu cầu" value={form.requirements ?? ''} onChange={e => set('requirements', e.target.value)} size="small" fullWidth multiline rows={3} sx={fieldSx} />
                    <TextField label="Nội dung đăng tuyển" value={form.postContent ?? ''} onChange={e => set('postContent', e.target.value)} size="small" fullWidth multiline rows={3} sx={fieldSx} />
                    <TextField label="Ghi chú" value={form.note ?? ''} onChange={e => set('note', e.target.value)} size="small" fullWidth multiline rows={2} sx={fieldSx} />
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: G, '&:hover': { bgcolor: '#065f2d' } }}>
                        {editTarget ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={deleteId != null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: R } } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>Xác nhận xóa</DialogTitle>
                <DialogContent><Typography sx={{ color: '#475569' }}>Bạn có chắc muốn xóa chiến dịch này?</Typography></DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setDeleteId(null)} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Xóa</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
