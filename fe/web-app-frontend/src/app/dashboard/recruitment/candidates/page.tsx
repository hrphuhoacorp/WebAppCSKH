'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
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
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import PeopleIcon from '@mui/icons-material/People';
import toast from 'react-hot-toast';
import PageHeader from '@/components/common/PageHeader';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/providers/AuthProviders';
import {
    recruitmentCampaignApi,
    recruitmentCandidateApi,
    recruitmentSettingsApi,
    RecruitmentCandidateDto,
    RecruitmentCandidateDetailDto,
    CandidateCreateDto,
} from '@/features/recruitment/api/recruitment.api';

const STATUS_OPTIONS = [
    { value: 'new', label: 'Mới' },
    { value: 'reviewing', label: 'Đang xét' },
    { value: 'interview', label: 'Phỏng vấn' },
    { value: 'offer', label: 'Offer' },
    { value: 'hired', label: 'Đã nhận' },
    { value: 'rejected', label: 'Loại' },
    { value: 'waiting', label: 'Chờ' },
];

const STATUS_COLOR: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary'> = {
    new: 'default',
    reviewing: 'info',
    interview: 'warning',
    offer: 'primary',
    hired: 'success',
    rejected: 'error',
    waiting: 'default',
};

const emptyForm = (): CandidateCreateDto => ({
    candidateName: '',
    phone: '',
    email: '',
    position: '',
    source: '',
    sourceOtherNote: '',
    cvLink: '',
    cvNote: '',
    status: 'new',
    waitingFor: '',
    interviewTime: '',
    interviewNote: '',
    result: '',
    offerNote: '',
    onboardDate: '',
    campaignId: undefined,
});

export default function CandidatesPage() {
    const canEdit = usePermission('recruitment.edit');
    const { profile } = useAuth();
    const qc = useQueryClient();

    const [filterCampaign, setFilterCampaign] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterSearch, setFilterSearch] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<RecruitmentCandidateDto | null>(null);
    const [form, setForm] = useState<CandidateCreateDto>(emptyForm());
    const [saving, setSaving] = useState(false);

    const [detailId, setDetailId] = useState<number | null>(null);
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [uploadingCv, setUploadingCv] = useState(false);

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { data: campaignsData } = useQuery({
        queryKey: ['recruitment-campaigns'],
        queryFn: () => recruitmentCampaignApi.getAll(),
    });

    const { data: categoriesData } = useQuery({
        queryKey: ['recruitment-categories'],
        queryFn: () => recruitmentSettingsApi.getCategories(),
    });

    const { data, isLoading } = useQuery({
        queryKey: ['recruitment-candidates', filterCampaign, filterStatus, filterSearch],
        queryFn: () => recruitmentCandidateApi.getAll({
            campaignId: filterCampaign ? Number(filterCampaign) : undefined,
            status: filterStatus || undefined,
            search: filterSearch || undefined,
        }),
    });

    const { data: detailData, isLoading: loadingDetail } = useQuery({
        queryKey: ['recruitment-candidate-detail', detailId],
        queryFn: () => recruitmentCandidateApi.getById(detailId!),
        enabled: detailId != null,
    });

    const campaigns = campaignsData?.content ?? [];
    const candidates = data?.content ?? [];
    const sources = categoriesData?.content?.source ?? [];
    const detail: RecruitmentCandidateDetailDto | null = detailData?.content ?? null;

    function openCreate() {
        setEditTarget(null);
        setForm({ ...emptyForm(), actedBy: profile?.name ?? '' });
        setDialogOpen(true);
    }

    function openEdit(c: RecruitmentCandidateDto) {
        setEditTarget(c);
        setForm({
            candidateName: c.candidateName,
            phone: c.phone,
            email: c.email,
            position: c.position,
            source: c.source,
            sourceOtherNote: c.sourceOtherNote,
            cvLink: c.cvLink,
            cvNote: c.cvNote,
            status: c.status,
            waitingFor: c.waitingFor,
            interviewTime: c.interviewTime,
            interviewNote: c.interviewNote,
            result: c.result,
            offerNote: c.offerNote,
            onboardDate: c.onboardDate,
            campaignId: c.campaignId,
            actedBy: profile?.name ?? '',
        });
        setDialogOpen(true);
    }

    function setField<K extends keyof CandidateCreateDto>(k: K, v: CandidateCreateDto[K]) {
        setForm(f => ({ ...f, [k]: v }));
    }

    async function handleSave() {
        if (!form.candidateName.trim()) {
            toast.error('Vui lòng nhập tên ứng viên');
            return;
        }
        setSaving(true);
        try {
            if (editTarget) {
                await recruitmentCandidateApi.update(editTarget.id, form);
                toast.success('Cập nhật ứng viên thành công');
            } else {
                await recruitmentCandidateApi.create(form);
                toast.success('Thêm ứng viên thành công');
            }
            qc.invalidateQueries({ queryKey: ['recruitment-candidates'] });
            setDialogOpen(false);
        } catch {
            toast.error('Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setSaving(false);
        }
    }

    async function handleUploadCv() {
        if (!cvFile || !detailId) return;
        setUploadingCv(true);
        try {
            await recruitmentCandidateApi.uploadCv(detailId, cvFile, profile?.name ?? undefined);
            toast.success('Tải CV thành công');
            qc.invalidateQueries({ queryKey: ['recruitment-candidate-detail', detailId] });
            qc.invalidateQueries({ queryKey: ['recruitment-candidates'] });
            setCvFile(null);
        } catch {
            toast.error('Tải CV thất bại');
        } finally {
            setUploadingCv(false);
        }
    }

    async function handleDownloadCv() {
        if (!detailId) return;
        try {
            const res = await recruitmentCandidateApi.downloadCv(detailId);
            const cd = res.headers['content-disposition'] ?? '';
            const name = cd.match(/filename="?([^"]+)"?/)?.[1] ?? 'cv';
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Không thể tải CV');
        }
    }

    async function handleDelete() {
        if (deleteId == null) return;
        setDeleting(true);
        try {
            await recruitmentCandidateApi.delete(deleteId);
            toast.success('Đã xóa ứng viên');
            qc.invalidateQueries({ queryKey: ['recruitment-candidates'] });
            setDeleteId(null);
        } catch {
            toast.error('Không thể xóa ứng viên');
        } finally {
            setDeleting(false);
        }
    }

    return (
        <Box>
            <LoadingOverlay open={saving || deleting || uploadingCv} />
            <PageHeader
                title="Ứng Viên"
                subtitle="Danh sách và theo dõi ứng viên"
                icon={<PeopleIcon />}
                actions={
                    canEdit ? (
                        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} size="small">
                            Thêm ứng viên
                        </Button>
                    ) : undefined
                }
            />

            {/* Filters */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                    label="Tìm kiếm"
                    value={filterSearch}
                    onChange={e => setFilterSearch(e.target.value)}
                    size="small"
                    sx={{ minWidth: 200 }}
                    placeholder="Tên, email, SĐT..."
                />
                <TextField
                    label="Chiến dịch"
                    select
                    value={filterCampaign}
                    onChange={e => setFilterCampaign(e.target.value)}
                    size="small"
                    sx={{ minWidth: 200 }}
                >
                    <MenuItem value="">Tất cả</MenuItem>
                    {campaigns.map(c => (
                        <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                    ))}
                </TextField>
                <TextField
                    label="Trạng thái"
                    select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    size="small"
                    sx={{ minWidth: 160 }}
                >
                    <MenuItem value="">Tất cả</MenuItem>
                    {STATUS_OPTIONS.map(s => (
                        <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                    ))}
                </TextField>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12.5, bgcolor: 'grey.50' } }}>
                                <TableCell>Ứng viên</TableCell>
                                <TableCell>Vị trí</TableCell>
                                <TableCell>Nguồn</TableCell>
                                <TableCell>Trạng thái</TableCell>
                                <TableCell>CV</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Ngày tạo</TableCell>
                                <TableCell align="right">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                [1, 2, 3, 4].map(i => (
                                    <TableRow key={i}>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                                            <TableCell key={j}><Skeleton /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : candidates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                                        Không có ứng viên nào
                                    </TableCell>
                                </TableRow>
                            ) : (
                                candidates.map(c => (
                                    <TableRow key={c.id} hover>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{c.candidateName}</Typography>
                                            {c.phone && <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{c.phone}</Typography>}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 13 }}>{c.position || '-'}</TableCell>
                                        <TableCell sx={{ fontSize: 13 }}>{c.source || '-'}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={STATUS_OPTIONS.find(s => s.value === c.status)?.label ?? c.status}
                                                color={STATUS_COLOR[c.status] ?? 'default'}
                                                size="small"
                                                sx={{ fontSize: 11 }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 12 }}>
                                            {c.cvFileName ? (
                                                <Typography sx={{ fontSize: 11, color: 'primary.main', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {c.cvFileName}
                                                </Typography>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 11 }}>
                                            {c.mailInviteSent && <Chip label="Mời" size="small" color="info" sx={{ fontSize: 10, mr: 0.5 }} />}
                                            {c.mailResultSent && <Chip label="KQ" size="small" color="success" sx={{ fontSize: 10 }} />}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{c.createdAt ?? '-'}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                            <Tooltip title="Chi tiết / Lịch sử">
                                                <IconButton size="small" onClick={() => setDetailId(c.id)}>
                                                    <HistoryIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {canEdit && (
                                                <>
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
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {editTarget ? 'Cập nhật ứng viên' : 'Thêm ứng viên mới'}
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <TextField
                                label="Tên ứng viên *"
                                value={form.candidateName}
                                onChange={e => setField('candidateName', e.target.value)}
                                size="small"
                                sx={{ flex: 1, minWidth: 200 }}
                            />
                            <TextField
                                label="Vị trí"
                                value={form.position ?? ''}
                                onChange={e => setField('position', e.target.value)}
                                size="small"
                                sx={{ flex: 1, minWidth: 200 }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <TextField
                                label="Số điện thoại"
                                value={form.phone ?? ''}
                                onChange={e => setField('phone', e.target.value)}
                                size="small"
                                sx={{ flex: 1, minWidth: 160 }}
                            />
                            <TextField
                                label="Email"
                                value={form.email ?? ''}
                                onChange={e => setField('email', e.target.value)}
                                size="small"
                                sx={{ flex: 1, minWidth: 200 }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <TextField
                                label="Chiến dịch"
                                select
                                value={form.campaignId ?? ''}
                                onChange={e => setField('campaignId', e.target.value ? Number(e.target.value) : undefined)}
                                size="small"
                                sx={{ flex: 1, minWidth: 200 }}
                            >
                                <MenuItem value="">Không gán</MenuItem>
                                {campaigns.map(c => (
                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label="Nguồn"
                                select
                                value={form.source ?? ''}
                                onChange={e => setField('source', e.target.value)}
                                size="small"
                                sx={{ flex: 1, minWidth: 160 }}
                            >
                                <MenuItem value="">Chọn nguồn</MenuItem>
                                {sources.map(s => (
                                    <MenuItem key={s.id} value={s.value}>{s.value}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label="Trạng thái"
                                select
                                value={form.status ?? 'new'}
                                onChange={e => setField('status', e.target.value)}
                                size="small"
                                sx={{ flex: 1, minWidth: 140 }}
                            >
                                {STATUS_OPTIONS.map(s => (
                                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                                ))}
                            </TextField>
                        </Box>
                        {form.source === 'Khác' && (
                            <TextField
                                label="Ghi chú nguồn"
                                value={form.sourceOtherNote ?? ''}
                                onChange={e => setField('sourceOtherNote', e.target.value)}
                                size="small"
                                fullWidth
                            />
                        )}
                        <TextField
                            label="Link CV"
                            value={form.cvLink ?? ''}
                            onChange={e => setField('cvLink', e.target.value)}
                            size="small"
                            fullWidth
                            placeholder="https://..."
                        />
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <TextField
                                label="Thời gian phỏng vấn"
                                value={form.interviewTime ?? ''}
                                onChange={e => setField('interviewTime', e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Ngày onboard"
                                value={form.onboardDate ?? ''}
                                onChange={e => setField('onboardDate', e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                                placeholder="dd/mm/yyyy"
                            />
                        </Box>
                        <TextField
                            label="Ghi chú phỏng vấn"
                            value={form.interviewNote ?? ''}
                            onChange={e => setField('interviewNote', e.target.value)}
                            size="small"
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <TextField
                            label="Kết quả / Offer"
                            value={form.result ?? ''}
                            onChange={e => setField('result', e.target.value)}
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
                        {editTarget ? 'Cập nhật' : 'Thêm mới'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detail / History Dialog */}
            <Dialog open={detailId != null} onClose={() => { setDetailId(null); setCvFile(null); }} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Chi tiết ứng viên
                </DialogTitle>
                <DialogContent dividers>
                    {loadingDetail ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {[1, 2, 3].map(i => <Skeleton key={i} height={36} />)}
                        </Box>
                    ) : detail ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Box sx={{ flex: 1, minWidth: 200 }}>
                                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Tên</Typography>
                                    <Typography sx={{ fontWeight: 700 }}>{detail.candidate.candidateName}</Typography>
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 200 }}>
                                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Trạng thái</Typography>
                                    <Chip
                                        label={STATUS_OPTIONS.find(s => s.value === detail.candidate.status)?.label ?? detail.candidate.status}
                                        color={STATUS_COLOR[detail.candidate.status] ?? 'default'}
                                        size="small"
                                    />
                                </Box>
                            </Box>

                            {/* CV upload */}
                            <Divider />
                            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>CV</Typography>
                            {detail.candidate.cvFileName && (
                                <Alert severity="info" sx={{ py: 0.5 }}>
                                    File hiện tại: {detail.candidate.cvFileName}
                                    <Button
                                        size="small"
                                        startIcon={<DownloadIcon />}
                                        sx={{ ml: 2 }}
                                        onClick={handleDownloadCv}
                                    >
                                        Tải xuống
                                    </Button>
                                </Alert>
                            )}
                            {canEdit && (
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Button
                                        component="label"
                                        variant="outlined"
                                        startIcon={<UploadFileIcon />}
                                        size="small"
                                    >
                                        Chọn file CV
                                        <input
                                            type="file"
                                            hidden
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            onChange={e => setCvFile(e.target.files?.[0] ?? null)}
                                        />
                                    </Button>
                                    {cvFile && (
                                        <>
                                            <Typography sx={{ fontSize: 12 }}>{cvFile.name}</Typography>
                                            <Button variant="contained" size="small" onClick={handleUploadCv} disabled={uploadingCv}>
                                                Tải lên
                                            </Button>
                                        </>
                                    )}
                                </Box>
                            )}

                            {/* History */}
                            <Divider />
                            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Lịch sử</Typography>
                            {detail.history.length === 0 ? (
                                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Chưa có lịch sử</Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {detail.history.map(h => (
                                        <Box key={h.id} sx={{ display: 'flex', gap: 1.5, fontSize: 13 }}>
                                            <Typography sx={{ fontSize: 12, color: 'text.secondary', minWidth: 120, flexShrink: 0 }}>{h.actedAt}</Typography>
                                            <Typography sx={{ fontWeight: 600, fontSize: 13, minWidth: 100, flexShrink: 0 }}>{h.action}</Typography>
                                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{h.note}</Typography>
                                            {h.actedBy && <Typography sx={{ fontSize: 11, color: 'text.disabled', ml: 'auto' }}>- {h.actedBy}</Typography>}
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Typography>Không tìm thấy dữ liệu</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setDetailId(null); setCvFile(null); }}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={deleteId != null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <Typography>Bạn có chắc muốn xóa ứng viên này không?</Typography>
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
