'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import WorkIcon from '@mui/icons-material/Work';
import toast from 'react-hot-toast';
import PageHeader from '@/components/common/PageHeader';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { usePermission } from '@/hooks/usePermission';
import {
    recruitmentCampaignApi,
    RecruitmentCampaignDto,
    CampaignUpsertDto,
} from '@/features/recruitment/api/recruitment.api';
import { useAuth } from '@/providers/AuthProviders';

const CAMPAIGN_STATUS = [
    { value: 'open', label: 'Đang mở' },
    { value: 'paused', label: 'Tạm dừng' },
    { value: 'closed', label: 'Đã đóng' },
];

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'default'> = {
    open: 'success',
    paused: 'warning',
    closed: 'default',
};

const emptyForm = (): CampaignUpsertDto => ({
    name: '',
    position: '',
    quantityNeeded: undefined,
    startDate: '',
    endDate: '',
    postContent: '',
    requirements: '',
    note: '',
    status: 'open',
});

export default function CampaignsPage() {
    const canEdit = usePermission('recruitment.edit');
    const { profile } = useAuth();
    const qc = useQueryClient();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<RecruitmentCampaignDto | null>(null);
    const [form, setForm] = useState<CampaignUpsertDto>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['recruitment-campaigns'],
        queryFn: () => recruitmentCampaignApi.getAll(),
    });

    const campaigns = data?.content ?? [];

    function openCreate() {
        setEditTarget(null);
        setForm({ ...emptyForm(), createdBy: profile?.name ?? '' });
        setDialogOpen(true);
    }

    function openEdit(c: RecruitmentCampaignDto) {
        setEditTarget(c);
        setForm({
            name: c.name,
            position: c.position,
            quantityNeeded: c.quantityNeeded,
            startDate: c.startDate,
            endDate: c.endDate,
            postContent: c.postContent,
            requirements: c.requirements,
            note: c.note,
            status: c.status,
            createdBy: c.createdBy,
        });
        setDialogOpen(true);
    }

    function setField<K extends keyof CampaignUpsertDto>(k: K, v: CampaignUpsertDto[K]) {
        setForm(f => ({ ...f, [k]: v }));
    }

    async function handleSave() {
        if (!form.name.trim() || !form.position.trim()) {
            toast.error('Vui lòng nhập tên chiến dịch và vị trí');
            return;
        }
        setSaving(true);
        try {
            if (editTarget) {
                await recruitmentCampaignApi.update(editTarget.id, form);
                toast.success('Cập nhật chiến dịch thành công');
            } else {
                await recruitmentCampaignApi.create(form);
                toast.success('Tạo chiến dịch thành công');
            }
            qc.invalidateQueries({ queryKey: ['recruitment-campaigns'] });
            setDialogOpen(false);
        } catch {
            toast.error('Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (deleteId == null) return;
        setDeleting(true);
        try {
            await recruitmentCampaignApi.delete(deleteId);
            toast.success('Đã xóa chiến dịch');
            qc.invalidateQueries({ queryKey: ['recruitment-campaigns'] });
            setDeleteId(null);
        } catch {
            toast.error('Không thể xóa chiến dịch');
        } finally {
            setDeleting(false);
        }
    }

    return (
        <Box>
            <LoadingOverlay open={saving || deleting} />
            <PageHeader
                title="Chiến Dịch Tuyển Dụng"
                subtitle="Quản lý các đợt tuyển dụng"
                icon={<WorkIcon />}
                actions={
                    canEdit ? (
                        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} size="small">
                            Tạo chiến dịch
                        </Button>
                    ) : undefined
                }
            />

            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12.5, bgcolor: 'grey.50' } }}>
                                <TableCell>Tên chiến dịch</TableCell>
                                <TableCell>Vị trí</TableCell>
                                <TableCell align="center">SL cần</TableCell>
                                <TableCell>Thời gian</TableCell>
                                <TableCell>Trạng thái</TableCell>
                                <TableCell>Người tạo</TableCell>
                                {canEdit && <TableCell align="right">Thao tác</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                [1, 2, 3].map(i => (
                                    <TableRow key={i}>
                                        {[1, 2, 3, 4, 5, 6].map(j => (
                                            <TableCell key={j}><Skeleton /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : campaigns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                                        Chưa có chiến dịch nào
                                    </TableCell>
                                </TableRow>
                            ) : (
                                campaigns.map(c => (
                                    <TableRow key={c.id} hover>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{c.name}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 13 }}>{c.position}</TableCell>
                                        <TableCell align="center" sx={{ fontSize: 13 }}>{c.quantityNeeded ?? '-'}</TableCell>
                                        <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                                            {c.startDate && c.endDate ? `${c.startDate} - ${c.endDate}` : c.startDate || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={CAMPAIGN_STATUS.find(s => s.value === c.status)?.label ?? c.status}
                                                color={STATUS_COLOR[c.status] ?? 'default'}
                                                size="small"
                                                sx={{ fontSize: 11 }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{c.createdBy || '-'}</TableCell>
                                        {canEdit && (
                                            <TableCell align="right">
                                                <Tooltip title="Sửa">
                                                    <IconButton size="small" onClick={() => openEdit(c)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Xóa">
                                                    <IconButton size="small" color="error" onClick={() => setDeleteId(c.id)}>
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {editTarget ? 'Cập nhật chiến dịch' : 'Tạo chiến dịch mới'}
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Tên chiến dịch *"
                            value={form.name}
                            onChange={e => setField('name', e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label="Vị trí tuyển dụng *"
                            value={form.position}
                            onChange={e => setField('position', e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Số lượng cần"
                                type="number"
                                value={form.quantityNeeded ?? ''}
                                onChange={e => setField('quantityNeeded', e.target.value ? Number(e.target.value) : undefined)}
                                size="small"
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Trạng thái"
                                select
                                value={form.status ?? 'open'}
                                onChange={e => setField('status', e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                            >
                                {CAMPAIGN_STATUS.map(s => (
                                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                                ))}
                            </TextField>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Ngày bắt đầu"
                                value={form.startDate ?? ''}
                                onChange={e => setField('startDate', e.target.value)}
                                size="small"
                                placeholder="dd/mm/yyyy"
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Ngày kết thúc"
                                value={form.endDate ?? ''}
                                onChange={e => setField('endDate', e.target.value)}
                                size="small"
                                placeholder="dd/mm/yyyy"
                                sx={{ flex: 1 }}
                            />
                        </Box>
                        <TextField
                            label="Yêu cầu"
                            value={form.requirements ?? ''}
                            onChange={e => setField('requirements', e.target.value)}
                            size="small"
                            fullWidth
                            multiline
                            rows={3}
                        />
                        <TextField
                            label="Nội dung đăng tuyển"
                            value={form.postContent ?? ''}
                            onChange={e => setField('postContent', e.target.value)}
                            size="small"
                            fullWidth
                            multiline
                            rows={3}
                        />
                        <TextField
                            label="Ghi chú"
                            value={form.note ?? ''}
                            onChange={e => setField('note', e.target.value)}
                            size="small"
                            fullWidth
                            multiline
                            rows={2}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {editTarget ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={deleteId != null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <Typography>Bạn có chắc muốn xóa chiến dịch này không?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteId(null)}>Hủy</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
