'use client';

import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, IconButton, MenuItem, Paper, Skeleton, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, alpha,
    InputAdornment, Tab, Tabs, LinearProgress,
} from '@mui/material';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import HistoryIcon from '@mui/icons-material/History';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import LinkIcon from '@mui/icons-material/Link';
import ViewKanbanRoundedIcon from '@mui/icons-material/ViewKanbanRounded';
import TableRowsRoundedIcon from '@mui/icons-material/TableRowsRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/providers/AuthProviders';
import {
    recruitmentCandidateApi, recruitmentCampaignApi, recruitmentSettingsApi,
    RecruitmentCandidateDto, CandidateCreateDto,
} from '@/features/recruitment/api/recruitment.api';

const G = '#086839';
const BORDER = '#e2e8f0';
const R = '20px';

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: G } },
    '& label.Mui-focused': { color: G },
};

const CANDIDATE_STATUSES = [
    "CV mới / NV Đã gửi",
    "Chờ TBP kiểm tra CV",
    "Không phù hợp CV",
    "Chờ Nhân viên liên hệ hẹn PV",
    "Chờ TBP cho lịch PV",
    "Đã hẹn PV - chưa mail",
    "Đã gửi mail mời PV",
    "Không tới phỏng vấn",
    "Hẹn lại PV",
    "Đã PV - chờ TBP báo KQ",
    "Fail - chưa mail",
    "Pass - chưa gửi thỏa thuận",
    "Đã gửi thỏa thuận",
    "Hoàn tất",
];

const DONE_STATUSES = ["Hoàn tất", "Không phù hợp CV"];
const FAIL_STATUSES = ["Fail - chưa mail", "Không phù hợp CV"];
const PASS_STATUSES = ["Pass - chưa gửi thỏa thuận", "Đã gửi thỏa thuận", "Hoàn tất"];
const WAIT_TBP = ["CV mới / NV Đã gửi", "Chờ TBP kiểm tra CV", "Chờ TBP cho lịch PV", "Đã PV - chờ TBP báo KQ"];
const WAIT_STAFF = ["Chờ Nhân viên liên hệ hẹn PV", "Đã hẹn PV - chưa mail", "Không tới phỏng vấn", "Hẹn lại PV"];
const NO_MAIL_STATUSES = ["Đã hẹn PV - chưa mail", "Fail - chưa mail", "Pass - chưa gửi thỏa thuận"];

const KANBAN_COLUMNS = [
    { id: 'new', title: 'CV mới / Chờ TBP', sub: 'NV gửi CV, TBP cần kiểm tra', statuses: ["CV mới / NV Đã gửi", "Chờ TBP kiểm tra CV"], color: '#2563eb', bg: '#eff6ff' },
    { id: 'contact', title: 'Chờ liên hệ PV', sub: 'CV phù hợp, cần hẹn PV', statuses: ["Chờ Nhân viên liên hệ hẹn PV", "Chờ TBP cho lịch PV"], color: '#f97316', bg: '#fff7ed' },
    { id: 'scheduled', title: 'Đã hẹn / Chờ PV', sub: 'Theo dõi lịch PV, mail mời', statuses: ["Đã hẹn PV - chưa mail", "Đã gửi mail mời PV", "Không tới phỏng vấn", "Hẹn lại PV"], color: '#7c3aed', bg: '#f5f3ff' },
    { id: 'result', title: 'Đã PV / Chờ kết quả', sub: 'PV xong, TBP báo pass/fail', statuses: ["Đã PV - chờ TBP báo KQ"], color: '#0891b2', bg: '#ecfeff' },
    { id: 'final', title: 'Kết quả / Hoàn tất', sub: 'Mail fail/pass, thỏa thuận', statuses: ["Fail - chưa mail", "Pass - chưa gửi thỏa thuận", "Đã gửi thỏa thuận", "Hoàn tất", "Không phù hợp CV"], color: '#16a34a', bg: '#f0fdf4' },
];

const STATUS_CHIP_COLOR: Record<string, { bg: string; color: string }> = {
    "CV mới / NV Đã gửi": { bg: '#dbeafe', color: '#1d4ed8' },
    "Chờ TBP kiểm tra CV": { bg: '#ede9fe', color: '#6d28d9' },
    "Không phù hợp CV": { bg: '#fee2e2', color: '#b91c1c' },
    "Chờ Nhân viên liên hệ hẹn PV": { bg: '#fff7ed', color: '#c2410c' },
    "Chờ TBP cho lịch PV": { bg: '#fef3c7', color: '#b45309' },
    "Đã hẹn PV - chưa mail": { bg: '#f3e8ff', color: '#7c3aed' },
    "Đã gửi mail mời PV": { bg: '#cffafe', color: '#0e7490' },
    "Không tới phỏng vấn": { bg: '#fce7f3', color: '#be185d' },
    "Hẹn lại PV": { bg: '#fef9c3', color: '#a16207' },
    "Đã PV - chờ TBP báo KQ": { bg: '#e0f2fe', color: '#0369a1' },
    "Fail - chưa mail": { bg: '#fee2e2', color: '#dc2626' },
    "Pass - chưa gửi thỏa thuận": { bg: '#dcfce7', color: '#166534' },
    "Đã gửi thỏa thuận": { bg: '#d1fae5', color: '#065f46' },
    "Hoàn tất": { bg: '#f0fdf4', color: '#15803d' },
};

function statusChip(status: string) {
    const c = STATUS_CHIP_COLOR[status] ?? { bg: '#f1f5f9', color: '#475569' };
    return <Chip label={status} size="small" sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, fontSize: 10, borderRadius: '6px', maxWidth: 200, height: 20 }} />;
}

function autoMailType(status: string): string {
    if (FAIL_STATUSES.includes(status)) return 'fail';
    if (PASS_STATUSES.includes(status)) return 'pass';
    if (["Không tới phỏng vấn", "Hẹn lại PV"].includes(status)) return 'reschedule';
    return 'invite';
}

function isOverdue(c: RecruitmentCandidateDto): boolean {
    if (DONE_STATUSES.includes(c.status)) return false;
    if (!c.interviewTime) return false;
    const d = new Date(c.interviewTime.split('/').reverse().join('-'));
    return !isNaN(d.getTime()) && d < new Date();
}

function isDueToday(c: RecruitmentCandidateDto): boolean {
    if (!c.interviewTime) return false;
    const d = new Date(c.interviewTime.split('/').reverse().join('-'));
    if (isNaN(d.getTime())) return false;
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

const emptyCreate = (): CandidateCreateDto => ({
    candidateName: '', phone: '', email: '', position: '', source: '', sourceOtherNote: '',
    cvLink: '', cvNote: '', status: 'CV mới / NV Đã gửi', waitingFor: '', interviewTime: '',
    interviewNote: '', result: '', offerNote: '', onboardDate: '',
});

const ACTION_HISTORY_LABELS: Record<string, string> = {
    created: 'Tạo mới', updated: 'Cập nhật', status_changed: 'Đổi trạng thái',
    cv_uploaded: 'Upload CV', mail_sent: 'Gửi email',
};

export interface TabCandidatesProps {
    onOpenCompose?: (c: RecruitmentCandidateDto, mailType: string) => void;
}

export default function TabCandidates({ onOpenCompose }: TabCandidatesProps) {
    const canEdit = usePermission('recruitment.edit');
    const { profile } = useAuth();
    const qc = useQueryClient();

    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCampaign, setFilterCampaign] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [workPreset, setWorkPreset] = useState('all');
    const [quickChip, setQuickChip] = useState('all');

    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState<CandidateCreateDto>(emptyCreate());
    const [cvMode, setCvMode] = useState<'link' | 'file'>('file');
    const [cvFile, setCvFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [saving, setSaving] = useState(false);
    const [quickUpdating, setQuickUpdating] = useState(false);

    const [detailId, setDetailId] = useState<number | null>(null);
    const [detailTab, setDetailTab] = useState(0);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState<CandidateCreateDto>(emptyCreate());
    const [uploading, setUploading] = useState(false);
    const uploadRef = useRef<HTMLInputElement>(null);

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { data: cdata, isLoading: lc } = useQuery({
        queryKey: ['recruitment-candidates'],
        queryFn: () => recruitmentCandidateApi.getAll({}),
    });
    const { data: campData } = useQuery({
        queryKey: ['recruitment-campaigns'],
        queryFn: () => recruitmentCampaignApi.getAll(),
    });
    const { data: catData } = useQuery({
        queryKey: ['recruitment-categories'],
        queryFn: () => recruitmentSettingsApi.getCategories(),
    });
    const { data: detailData, isLoading: ld } = useQuery({
        queryKey: ['recruitment-candidate-detail', detailId],
        queryFn: () => recruitmentCandidateApi.getById(detailId!),
        enabled: detailId != null,
    });

    const all = cdata?.content ?? [];
    const campaigns = campData?.content ?? [];
    const cats = catData?.content ?? {};
    const sources: string[] = cats['source']?.map((x: { value: string }) => x.value) ?? [];

    const filtered = all.filter(c => {
        const q = search.toLowerCase();
        if (q && !c.candidateName.toLowerCase().includes(q) && !(c.email || '').toLowerCase().includes(q) && !(c.phone || '').toLowerCase().includes(q)) return false;
        if (filterStatus && c.status !== filterStatus) return false;
        if (filterCampaign && String(c.campaignId) !== filterCampaign) return false;
        if (filterSource && c.source !== filterSource) return false;
        // workPreset only applies when not in a specific chip view
        if (quickChip === 'all') {
            if (workPreset === 'unfinished' && DONE_STATUSES.includes(c.status)) return false;
            if (workPreset === 'today' && !isDueToday(c)) return false;
            if (workPreset === 'overdue' && !isOverdue(c)) return false;
            if (workPreset === 'noSchedule' && c.interviewTime) return false;
        }
        return true;
    });

    function setF<K extends keyof CandidateCreateDto>(k: K, v: CandidateCreateDto[K]) { setForm(p => ({ ...p, [k]: v })); }
    function setEF<K extends keyof CandidateCreateDto>(k: K, v: CandidateCreateDto[K]) { setEditForm(p => ({ ...p, [k]: v })); }

    async function handleCreate() {
        if (!form.candidateName.trim()) { toast.error('Nhập tên ứng viên'); return; }
        setSaving(true);
        try {
            const dto: CandidateCreateDto = { ...form, actedBy: profile?.name ?? '' };
            const res = await recruitmentCandidateApi.create(dto);
            const newId = res.content.id;
            if (cvMode === 'file' && cvFile) {
                await recruitmentCandidateApi.uploadCv(newId, cvFile, profile?.name ?? '');
            }
            toast.success('Tạo ứng viên thành công');
            qc.invalidateQueries({ queryKey: ['recruitment-candidates'] });
            setCreateOpen(false);
            setForm(emptyCreate());
            setCvFile(null);
        } catch { toast.error('Có lỗi xảy ra'); } finally { setSaving(false); }
    }

    function openDetail(c: RecruitmentCandidateDto) {
        setDetailId(c.id);
        setEditForm({ campaignId: c.campaignId, candidateName: c.candidateName, phone: c.phone, email: c.email, position: c.position, source: c.source, sourceOtherNote: c.sourceOtherNote, cvLink: c.cvLink, cvNote: c.cvNote, status: c.status, waitingFor: c.waitingFor, interviewTime: c.interviewTime, interviewNote: c.interviewNote, result: c.result, offerNote: c.offerNote, onboardDate: c.onboardDate });
        setDetailTab(0);
        setEditMode(false);
    }

    async function handleUpdate() {
        if (!editForm.candidateName?.trim()) { toast.error('Nhập tên ứng viên'); return; }
        setSaving(true);
        try {
            await recruitmentCandidateApi.update(detailId!, { ...editForm, actedBy: profile?.name ?? '' });
            toast.success('Cập nhật thành công');
            qc.invalidateQueries({ queryKey: ['recruitment-candidates'] });
            qc.invalidateQueries({ queryKey: ['recruitment-candidate-detail', detailId] });
            setEditMode(false);
        } catch { toast.error('Có lỗi xảy ra'); } finally { setSaving(false); }
    }

    async function quickUpdate(c: RecruitmentCandidateDto, status: string) {
        setQuickUpdating(true);
        try {
            await recruitmentCandidateApi.update(c.id, { candidateName: c.candidateName, status, actedBy: profile?.name ?? '' });
            qc.invalidateQueries({ queryKey: ['recruitment-candidates'] });
            qc.invalidateQueries({ queryKey: ['recruitment-candidate-detail', c.id] });
        } catch { toast.error('Cập nhật thất bại'); } finally { setQuickUpdating(false); }
    }

    async function handleUploadCvDetail(file: File) {
        if (!detailId) return;
        setUploading(true);
        try {
            await recruitmentCandidateApi.uploadCv(detailId, file, profile?.name ?? '');
            toast.success('Upload CV thành công');
            qc.invalidateQueries({ queryKey: ['recruitment-candidate-detail', detailId] });
            qc.invalidateQueries({ queryKey: ['recruitment-candidates'] });
        } catch { toast.error('Upload thất bại'); } finally { setUploading(false); }
    }

    async function handleDownloadCv() {
        if (!detailId) return;
        const candidate = detailData?.content?.candidate;
        if (!candidate?.cvFilePath) { toast.error('Không có file CV'); return; }
        try {
            const res = await recruitmentCandidateApi.downloadCv(detailId);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a'); a.href = url; a.download = candidate.cvFileName || 'cv.pdf'; a.click();
            window.URL.revokeObjectURL(url);
        } catch { toast.error('Tải CV thất bại'); }
    }

    async function handleDelete() {
        if (deleteId == null) return;
        setDeleting(true);
        try {
            await recruitmentCandidateApi.delete(deleteId);
            toast.success('Đã xóa ứng viên');
            qc.invalidateQueries({ queryKey: ['recruitment-candidates'] });
            setDeleteId(null);
        } catch { toast.error('Không thể xóa'); } finally { setDeleting(false); }
    }

    const detail = detailData?.content;
    const history = detail?.history ?? [];

    // Card quick-action buttons per status
    function getCardButtons(c: RecruitmentCandidateDto) {
        if (!canEdit) return [];
        const btns: { label: string; color?: string; onClick: () => void }[] = [];
        const s = c.status;
        if (s === "CV mới / NV Đã gửi") {
            btns.push({ label: "Gửi TBP", onClick: () => quickUpdate(c, "Chờ TBP kiểm tra CV") });
        } else if (s === "Chờ TBP kiểm tra CV") {
            btns.push({ label: "Phù hợp ✓", color: '#16a34a', onClick: () => quickUpdate(c, "Chờ Nhân viên liên hệ hẹn PV") });
            btns.push({ label: "Không phù hợp", color: '#dc2626', onClick: () => quickUpdate(c, "Không phù hợp CV") });
        } else if (s === "Chờ Nhân viên liên hệ hẹn PV" || s === "Chờ TBP cho lịch PV") {
            btns.push({ label: "Đã hẹn PV", onClick: () => quickUpdate(c, "Đã hẹn PV - chưa mail") });
        } else if (s === "Đã hẹn PV - chưa mail") {
            btns.push({ label: "Soạn mail mời", color: G, onClick: () => onOpenCompose?.(c, 'invite') });
            btns.push({ label: "Đã mail ✓", onClick: () => quickUpdate(c, "Đã gửi mail mời PV") });
            btns.push({ label: "Không tới", color: '#b45309', onClick: () => quickUpdate(c, "Không tới phỏng vấn") });
            btns.push({ label: "Hẹn lại", onClick: () => quickUpdate(c, "Hẹn lại PV") });
        } else if (s === "Đã gửi mail mời PV" || s === "Hẹn lại PV") {
            btns.push({ label: "Đã PV ✓", color: '#0369a1', onClick: () => quickUpdate(c, "Đã PV - chờ TBP báo KQ") });
            btns.push({ label: "Không tới", color: '#b45309', onClick: () => quickUpdate(c, "Không tới phỏng vấn") });
            btns.push({ label: "Soạn mail", color: G, onClick: () => onOpenCompose?.(c, 'reschedule') });
        } else if (s === "Không tới phỏng vấn") {
            btns.push({ label: "Soạn mail", color: G, onClick: () => onOpenCompose?.(c, 'reschedule') });
            btns.push({ label: "Hẹn lại", onClick: () => quickUpdate(c, "Hẹn lại PV") });
        } else if (s === "Đã PV - chờ TBP báo KQ") {
            btns.push({ label: "Pass ✓", color: '#16a34a', onClick: () => quickUpdate(c, "Pass - chưa gửi thỏa thuận") });
            btns.push({ label: "Fail", color: '#dc2626', onClick: () => quickUpdate(c, "Fail - chưa mail") });
        } else if (s === "Fail - chưa mail") {
            btns.push({ label: "Soạn mail fail", color: '#dc2626', onClick: () => onOpenCompose?.(c, 'fail') });
            btns.push({ label: "Đã mail fail ✓", onClick: () => quickUpdate(c, "Hoàn tất") });
        } else if (s === "Pass - chưa gửi thỏa thuận") {
            btns.push({ label: "Soạn mail pass", color: G, onClick: () => onOpenCompose?.(c, 'pass') });
            btns.push({ label: "Đã gửi thỏa thuận ✓", onClick: () => quickUpdate(c, "Đã gửi thỏa thuận") });
        } else if (s === "Đã gửi thỏa thuận") {
            btns.push({ label: "Hoàn tất ✓", color: '#16a34a', onClick: () => quickUpdate(c, "Hoàn tất") });
        }
        return btns;
    }

    // Kanban card component
    function KanbanCard({ c }: { c: RecruitmentCandidateDto }) {
        const camp = campaigns.find(x => x.id === c.campaignId);
        const sc = STATUS_CHIP_COLOR[c.status] ?? { bg: '#f1f5f9', color: '#475569' };
        const overdue = isOverdue(c);
        const cardBtns = getCardButtons(c);
        return (
            <Paper elevation={0} sx={{
                mb: 1, p: 1.5, borderRadius: '12px',
                border: `1px solid ${overdue ? '#fecaca' : BORDER}`,
                bgcolor: overdue ? '#fff5f5' : '#fff',
                cursor: 'pointer', transition: 'all 0.15s',
                '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.10)', transform: 'translateY(-1px)' },
            }}>
                <Box onClick={() => openDetail(c)}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b', lineHeight: 1.3, flex: 1 }}>{c.candidateName}</Typography>
                        {overdue && <Chip label="Quá hạn" size="small" sx={{ fontSize: 9, bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700, borderRadius: '5px', height: 18, ml: 0.5, flexShrink: 0 }} />}
                    </Box>
                    {c.position && <Typography sx={{ fontSize: 11, color: '#64748b', mb: 0.5 }}>{c.position}</Typography>}
                    {c.interviewTime && <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>PV: {c.interviewTime}</Typography>}
                    {camp && <Typography sx={{ fontSize: 10, color: '#94a3b8', mt: 0.3, fontStyle: 'italic' }}>{camp.name}</Typography>}
                    <Box sx={{ mt: 0.8 }}>
                        <Chip label={c.status} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: 9, borderRadius: '5px', height: 18 }} />
                    </Box>
                </Box>
                {cardBtns.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                        {cardBtns.map((btn, i) => (
                            <Button key={i} size="small" variant="outlined" onClick={btn.onClick}
                                sx={{
                                    fontSize: 10, px: 0.8, py: 0.2, minWidth: 0, height: 22,
                                    textTransform: 'none', fontWeight: 700, borderRadius: '6px',
                                    borderColor: btn.color ?? '#cbd5e1',
                                    color: btn.color ?? '#475569',
                                    '&:hover': { bgcolor: alpha(btn.color ?? '#475569', 0.08) },
                                }}>
                                {btn.label}
                            </Button>
                        ))}
                    </Box>
                )}
            </Paper>
        );
    }

    const QUICK_CHIPS = [
        { id: 'all', label: `Tất cả (${filtered.length})` },
        { id: 'tbp', label: `Chờ TBP (${filtered.filter(c => WAIT_TBP.includes(c.status)).length})` },
        { id: 'nv', label: `Chờ NV (${filtered.filter(c => WAIT_STAFF.includes(c.status)).length})` },
        { id: 'nomail', label: `Chưa mail (${filtered.filter(c => NO_MAIL_STATUSES.includes(c.status)).length})` },
        { id: 'overdue', label: `Quá hạn (${filtered.filter(c => isOverdue(c)).length})` },
        { id: 'done', label: `Đã xong (${filtered.filter(c => DONE_STATUSES.includes(c.status)).length})` },
    ];

    const displayRows = quickChip === 'all' ? filtered
        : quickChip === 'tbp' ? filtered.filter(c => WAIT_TBP.includes(c.status))
        : quickChip === 'nv' ? filtered.filter(c => WAIT_STAFF.includes(c.status))
        : quickChip === 'nomail' ? filtered.filter(c => NO_MAIL_STATUSES.includes(c.status))
        : quickChip === 'overdue' ? filtered.filter(c => isOverdue(c))
        : filtered.filter(c => DONE_STATUSES.includes(c.status));

    return (
        <>
            <LoadingOverlay open={saving || deleting || uploading || quickUpdating} />

            {/* Filter bar */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: R, mb: 1.5, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
                    <TextField size="small" placeholder="Tìm tên, email, SĐT..." value={search}
                        onChange={e => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 180, ...fieldSx }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} /></InputAdornment> } }}
                    />
                    <TextField select size="small" label="Trạng thái" value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)} sx={{ minWidth: 200, ...fieldSx }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {CANDIDATE_STATUSES.map(s => <MenuItem key={s} value={s}><Typography sx={{ fontSize: 12 }}>{s}</Typography></MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Chiến dịch" value={filterCampaign}
                        onChange={e => setFilterCampaign(e.target.value)} sx={{ minWidth: 150, ...fieldSx }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {campaigns.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Nguồn" value={filterSource}
                        onChange={e => setFilterSource(e.target.value)} sx={{ minWidth: 130, ...fieldSx }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {sources.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Bộ lọc" value={workPreset}
                        onChange={e => setWorkPreset(e.target.value)} sx={{ minWidth: 150, ...fieldSx }}>
                        <MenuItem value="all">Tất cả</MenuItem>
                        <MenuItem value="unfinished">Chưa xong</MenuItem>
                        <MenuItem value="today">Hôm nay</MenuItem>
                        <MenuItem value="overdue">Quá hạn</MenuItem>
                        <MenuItem value="noSchedule">Chưa có lịch</MenuItem>
                    </TextField>
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                        <Tooltip title="Kanban">
                            <IconButton size="small" onClick={() => setViewMode('kanban')}
                                sx={{ bgcolor: viewMode === 'kanban' ? alpha(G, 0.12) : 'transparent', color: viewMode === 'kanban' ? G : '#94a3b8', borderRadius: '8px' }}>
                                <ViewKanbanRoundedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Bảng">
                            <IconButton size="small" onClick={() => setViewMode('table')}
                                sx={{ bgcolor: viewMode === 'table' ? alpha(G, 0.12) : 'transparent', color: viewMode === 'table' ? G : '#94a3b8', borderRadius: '8px' }}>
                                <TableRowsRoundedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    {canEdit && (
                        <Button variant="contained" startIcon={<AddCircleRoundedIcon />}
                            onClick={() => { setForm(emptyCreate()); setCvFile(null); setCvMode('file'); setCreateOpen(true); }}
                            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, bgcolor: G, '&:hover': { bgcolor: '#065f2d' }, whiteSpace: 'nowrap' }}>
                            Thêm ứng viên
                        </Button>
                    )}
                </Box>

                {/* Quick chips */}
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                    {QUICK_CHIPS.map(chip => (
                        <Chip key={chip.id} label={chip.label} size="small" clickable
                            onClick={() => setQuickChip(chip.id)}
                            sx={{
                                fontWeight: 700, fontSize: 11, borderRadius: '8px',
                                bgcolor: quickChip === chip.id ? G : '#f1f5f9',
                                color: quickChip === chip.id ? '#fff' : '#475569',
                                '&:hover': { bgcolor: quickChip === chip.id ? '#065f2d' : '#e2e8f0' },
                            }} />
                    ))}
                </Box>
            </Paper>

            {/* Today's PV ticker */}
            {(() => {
                const todayPV = all.filter(c => isDueToday(c));
                if (todayPV.length === 0) return null;
                return (
                    <Box sx={{
                        mb: 1.5, borderRadius: '14px', overflow: 'hidden',
                        bgcolor: '#086839', boxShadow: '0 2px 12px rgba(8,104,57,0.18)',
                        display: 'flex', alignItems: 'center', height: 38,
                    }}>
                        <Box sx={{
                            flexShrink: 0, px: 2, height: '100%',
                            display: 'flex', alignItems: 'center',
                            bgcolor: '#065f2d', color: '#fff',
                            fontSize: 12, fontWeight: 800, letterSpacing: 1.1,
                            textTransform: 'uppercase', gap: 0.8, whiteSpace: 'nowrap',
                        }}>
                            📅 PV hôm nay ({todayPV.length})
                        </Box>
                        <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                            <Box sx={{
                                display: 'flex', gap: 5, px: 2,
                                animation: `ticker-pv ${Math.max(18, todayPV.length * 8)}s linear infinite`,
                                whiteSpace: 'nowrap',
                                '@keyframes ticker-pv': {
                                    '0%': { transform: 'translateX(100%)' },
                                    '100%': { transform: 'translateX(-100%)' },
                                },
                            }}>
                                {todayPV.map(c => (
                                    <Box key={c.id} component="span" sx={{ color: '#fff', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box component="span" sx={{ fontWeight: 800 }}>{c.candidateName}</Box>
                                        {c.position && <Box component="span" sx={{ opacity: 0.75, fontSize: 11 }}>{c.position}</Box>}
                                        {c.interviewTime && <Box component="span" sx={{ fontFamily: 'monospace', color: '#86efac', fontSize: 12 }}>{c.interviewTime}</Box>}
                                        <Box component="span" sx={{ opacity: 0.35, mx: 1 }}>❱❱</Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                );
            })()}

            {/* Kanban or Table */}
            {viewMode === 'kanban' ? (
                <Box sx={{
                    flex: 1, minHeight: 0, overflow: 'auto',
                    '&::-webkit-scrollbar': { width: 6, height: 6 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 },
                }}>
                    {lc ? (
                        <Box sx={{ display: 'flex', gap: 2, p: 1 }}>
                            {KANBAN_COLUMNS.map(col => (
                                <Box key={col.id} sx={{ minWidth: 260, flex: '0 0 260px' }}>
                                    <Skeleton height={40} sx={{ borderRadius: '10px', mb: 1 }} />
                                    {[1, 2, 3].map(i => <Skeleton key={i} height={80} sx={{ borderRadius: '10px', mb: 1 }} />)}
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', gap: 2, pb: 2, alignItems: 'flex-start', minWidth: 'max-content' }}>
                            {KANBAN_COLUMNS.map(col => {
                                const cards = displayRows.filter(c => col.statuses.includes(c.status));
                                return (
                                    <Box key={col.id} sx={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                        <Paper elevation={0} sx={{
                                            borderRadius: '14px', border: `1px solid ${BORDER}`,
                                            overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                            maxHeight: 'calc(100vh - 280px)',
                                        }}>
                                            {/* Column header */}
                                            <Box sx={{ p: 1.5, bgcolor: col.bg, borderBottom: `3px solid ${col.color}` }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: col.color }}>{col.title}</Typography>
                                                    <Chip label={cards.length} size="small" sx={{ bgcolor: col.color, color: '#fff', fontWeight: 800, fontSize: 11, height: 20, borderRadius: '6px' }} />
                                                </Box>
                                                <Typography sx={{ fontSize: 10, color: '#94a3b8', mt: 0.3 }}>{col.sub}</Typography>
                                            </Box>
                                            {/* Cards */}
                                            <Box sx={{
                                                flex: 1, overflowY: 'auto', p: 1,
                                                bgcolor: '#fafafa',
                                                '&::-webkit-scrollbar': { width: 4 },
                                                '&::-webkit-scrollbar-thumb': { bgcolor: '#e2e8f0', borderRadius: 2 },
                                            }}>
                                                {cards.length === 0 ? (
                                                    <Box sx={{ textAlign: 'center', py: 3 }}>
                                                        <Typography sx={{ fontSize: 11, color: '#cbd5e1' }}>Không có ứng viên</Typography>
                                                    </Box>
                                                ) : cards.map(c => <KanbanCard key={c.id} c={c} />)}
                                            </Box>
                                        </Paper>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </Box>
            ) : (
                <TableContainer component={Paper} elevation={0} sx={{
                    flex: 1, minHeight: 0, borderRadius: R, border: `1px solid ${BORDER}`,
                    overflow: 'auto', bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                    '&::-webkit-scrollbar': { width: 6, height: 6 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 },
                }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                {['Ứng viên', 'Vị trí', 'Nguồn', 'Trạng thái', 'Chiến dịch', 'Lịch PV', 'CV', 'Thao tác'].map(h => (
                                    <TableCell key={h} sx={{ bgcolor: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.6px', py: 1.75, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lc ? [1, 2, 3].map(i => (
                                <TableRow key={i}>{[1, 2, 3, 4, 5, 6, 7, 8].map(j => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                            )) : displayRows.length === 0 ? (
                                <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 8 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <PersonIcon sx={{ fontSize: 28, color: '#94a3b8' }} />
                                        </Box>
                                        <Typography sx={{ fontWeight: 700, color: '#64748b', fontSize: 15 }}>Không tìm thấy ứng viên nào</Typography>
                                    </Box>
                                </TableCell></TableRow>
                            ) : displayRows.map(c => {
                                const sc = STATUS_CHIP_COLOR[c.status] ?? { bg: '#f1f5f9', color: '#475569' };
                                const camp = campaigns.find(x => x.id === c.campaignId);
                                const overdue = isOverdue(c);
                                return (
                                    <TableRow key={c.id} onClick={() => openDetail(c)}
                                        sx={{ cursor: 'pointer', bgcolor: overdue ? '#fff5f5' : undefined, '&:hover': { bgcolor: '#f0fdf4 !important' }, transition: 'background-color 0.15s' }}>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{c.candidateName}</Typography>
                                            {c.email && <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>{c.email}</Typography>}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 13, color: '#475569' }}>{c.position || '-'}</TableCell>
                                        <TableCell sx={{ fontSize: 12, color: '#64748b' }}>{c.source || '-'}</TableCell>
                                        <TableCell>
                                            <Chip label={c.status} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: 10, borderRadius: '6px', maxWidth: 180 }} />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 12, color: '#64748b', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{camp?.name || '-'}</TableCell>
                                        <TableCell sx={{ fontSize: 12, color: overdue ? '#dc2626' : '#64748b', fontWeight: overdue ? 700 : 400 }}>{c.interviewTime || '-'}</TableCell>
                                        <TableCell>
                                            {c.cvFilePath ? <Tooltip title={c.cvFileName || 'CV file'}><InsertDriveFileIcon sx={{ fontSize: 18, color: G }} /></Tooltip>
                                                : c.cvLink ? <Tooltip title={c.cvLink}><LinkIcon sx={{ fontSize: 18, color: '#3b82f6' }} /></Tooltip>
                                                : <Typography sx={{ fontSize: 12, color: '#cbd5e1' }}>—</Typography>}
                                        </TableCell>
                                        <TableCell onClick={e => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                                            {onOpenCompose && <Tooltip title="Soạn mail">
                                                <IconButton size="small" onClick={() => onOpenCompose(c, autoMailType(c.status))} sx={{ color: G, '&:hover': { bgcolor: alpha(G, 0.08) } }}>
                                                    <MailOutlineRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>}
                                            {canEdit && <Tooltip title="Xóa">
                                                <IconButton size="small" onClick={() => setDeleteId(c.id)} sx={{ color: '#dc2626', '&:hover': { bgcolor: alpha('#dc2626', 0.08) } }}>
                                                    <DeleteOutlinedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Create dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: R } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 17, pb: 1 }}>Thêm ứng viên mới</DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <TextField label="Tên ứng viên *" value={form.candidateName} onChange={e => setF('candidateName', e.target.value)} size="small" fullWidth sx={fieldSx} />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField label="Điện thoại" value={form.phone ?? ''} onChange={e => setF('phone', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} />
                        <TextField label="Email" value={form.email ?? ''} onChange={e => setF('email', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField label="Vị trí" value={form.position ?? ''} onChange={e => setF('position', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} />
                        <TextField label="Chiến dịch" select value={form.campaignId ?? ''} onChange={e => setF('campaignId', e.target.value ? Number(e.target.value) : undefined)} size="small" sx={{ flex: 1, ...fieldSx }}>
                            <MenuItem value="">Không chọn</MenuItem>
                            {campaigns.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </TextField>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Nguồn" value={form.source ?? ''} onChange={e => setF('source', e.target.value)}
                            size="small" sx={{ flex: 1, ...fieldSx }}
                            slotProps={{ htmlInput: { list: 'create-sources-list' } }} placeholder="Nhập hoặc chọn nguồn"
                        />
                        <datalist id="create-sources-list">
                            {sources.map(s => <option key={s} value={s} />)}
                        </datalist>
                        <TextField label="Trạng thái ban đầu" select value={form.status ?? 'CV mới / NV Đã gửi'} onChange={e => setF('status', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }}>
                            {CANDIDATE_STATUSES.slice(0, 3).map(s => <MenuItem key={s} value={s}><Typography sx={{ fontSize: 12 }}>{s}</Typography></MenuItem>)}
                        </TextField>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField label="Thời gian PV" value={form.interviewTime ?? ''} onChange={e => setF('interviewTime', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} placeholder="dd/mm/yyyy HH:mm" />
                        <TextField label="Ngày onboard" value={form.onboardDate ?? ''} onChange={e => setF('onboardDate', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} placeholder="dd/mm/yyyy" />
                    </Box>
                    {/* CV section */}
                    <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1, color: '#475569' }}>CV ứng viên</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                            <Button size="small" variant={cvMode === 'file' ? 'contained' : 'outlined'} startIcon={<UploadFileRoundedIcon />} onClick={() => setCvMode('file')}
                                sx={{ textTransform: 'none', borderRadius: '10px', fontSize: 12, fontWeight: 700, ...(cvMode === 'file' ? { bgcolor: G, '&:hover': { bgcolor: '#065f2d' } } : { borderColor: BORDER, color: '#64748b' }) }}>
                                Upload file
                            </Button>
                            <Button size="small" variant={cvMode === 'link' ? 'contained' : 'outlined'} startIcon={<LinkIcon />} onClick={() => setCvMode('link')}
                                sx={{ textTransform: 'none', borderRadius: '10px', fontSize: 12, fontWeight: 700, ...(cvMode === 'link' ? { bgcolor: G, '&:hover': { bgcolor: '#065f2d' } } : { borderColor: BORDER, color: '#64748b' }) }}>
                                Link CV
                            </Button>
                        </Box>
                        {cvMode === 'file' ? (
                            <Box>
                                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={e => setCvFile(e.target.files?.[0] ?? null)} />
                                <Button variant="outlined" size="small" onClick={() => fileRef.current?.click()}
                                    sx={{ textTransform: 'none', borderRadius: '10px', borderColor: BORDER, color: '#64748b', fontSize: 12 }}>
                                    {cvFile ? cvFile.name : 'Chọn file (PDF, DOC, DOCX)'}
                                </Button>
                                {cvFile && <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.5 }}>{(cvFile.size / 1024).toFixed(0)} KB</Typography>}
                            </Box>
                        ) : (
                            <TextField label="Link CV (Google Drive, LinkedIn, ...)" value={form.cvLink ?? ''} onChange={e => setF('cvLink', e.target.value)} size="small" fullWidth sx={fieldSx} />
                        )}
                    </Box>
                    <TextField label="Ghi chú CV" value={form.cvNote ?? ''} onChange={e => setF('cvNote', e.target.value)} size="small" fullWidth multiline rows={2} sx={fieldSx} />
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: G, '&:hover': { bgcolor: '#065f2d' } }}>
                        Tạo mới
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detail/Edit dialog */}
            <Dialog open={detailId != null} onClose={() => { setDetailId(null); setEditMode(false); }} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: R } } }}>
                {ld ? (
                    <DialogContent><Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><Skeleton width="100%" height={300} /></Box></DialogContent>
                ) : detail ? (
                    <>
                        <DialogTitle sx={{ pb: 0, fontWeight: 800, fontSize: 17 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.candidate.candidateName}</Typography>
                                    {statusChip(detail.candidate.status)}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                    {onOpenCompose && (
                                        <Button size="small" startIcon={<MailOutlineRoundedIcon />}
                                            onClick={() => { onOpenCompose(detail.candidate, autoMailType(detail.candidate.status)); setDetailId(null); }}
                                            sx={{ textTransform: 'none', fontWeight: 700, color: G, fontSize: 12 }}>Soạn mail</Button>
                                    )}
                                    {canEdit && !editMode && (
                                        <Button size="small" startIcon={<EditIcon />} onClick={() => setEditMode(true)}
                                            sx={{ textTransform: 'none', fontWeight: 700, color: '#64748b' }}>Sửa</Button>
                                    )}
                                </Box>
                            </Box>
                        </DialogTitle>
                        <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{
                            px: 3, borderBottom: `1px solid ${BORDER}`,
                            '& .MuiTabs-indicator': { bgcolor: G }, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: 13, color: '#64748b', '&.Mui-selected': { color: G } },
                        }}>
                            <Tab icon={<PersonIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Thông tin" />
                            <Tab icon={<InsertDriveFileIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="CV" />
                            <Tab icon={<HistoryIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Lịch sử (${history.length})`} />
                        </Tabs>
                        <DialogContent sx={{ pt: 2, minHeight: 300 }}>
                            {detailTab === 0 && (
                                editMode ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <TextField label="Tên ứng viên *" value={editForm.candidateName} onChange={e => setEF('candidateName', e.target.value)} size="small" fullWidth sx={fieldSx} />
                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <TextField label="Điện thoại" value={editForm.phone ?? ''} onChange={e => setEF('phone', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} />
                                            <TextField label="Email" value={editForm.email ?? ''} onChange={e => setEF('email', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} />
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <TextField label="Vị trí" value={editForm.position ?? ''} onChange={e => setEF('position', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} />
                                            <TextField label="Nguồn" select value={editForm.source ?? ''} onChange={e => setEF('source', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }}>
                                                <MenuItem value="">Không chọn</MenuItem>
                                                {sources.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                            </TextField>
                                        </Box>
                                        <TextField label="Trạng thái" select value={editForm.status ?? ''} onChange={e => setEF('status', e.target.value)} size="small" fullWidth sx={fieldSx}>
                                            {CANDIDATE_STATUSES.map(s => <MenuItem key={s} value={s}><Typography sx={{ fontSize: 12 }}>{s}</Typography></MenuItem>)}
                                        </TextField>
                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <TextField label="Thời gian PV" value={editForm.interviewTime ?? ''} onChange={e => setEF('interviewTime', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} placeholder="dd/mm/yyyy" />
                                            <TextField label="Ngày onboard" value={editForm.onboardDate ?? ''} onChange={e => setEF('onboardDate', e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} placeholder="dd/mm/yyyy" />
                                        </Box>
                                        <TextField label="Ghi chú phỏng vấn" value={editForm.interviewNote ?? ''} onChange={e => setEF('interviewNote', e.target.value)} size="small" fullWidth multiline rows={2} sx={fieldSx} />
                                        <TextField label="Kết quả / Offer note" value={editForm.offerNote ?? ''} onChange={e => setEF('offerNote', e.target.value)} size="small" fullWidth multiline rows={2} sx={fieldSx} />
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                        {([
                                            ['Tên', detail.candidate.candidateName],
                                            ['Email', detail.candidate.email || '—'],
                                            ['Điện thoại', detail.candidate.phone || '—'],
                                            ['Vị trí', detail.candidate.position || '—'],
                                            ['Nguồn', detail.candidate.source || '—'],
                                            ['Ngày onboard', detail.candidate.onboardDate || '—'],
                                            ['Thời gian PV', detail.candidate.interviewTime || '—'],
                                            ['Ngày tạo', detail.candidate.createdAt || '—'],
                                        ] as [string, string][]).map(([k, v]) => (
                                            <Box key={k}>
                                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{k}</Typography>
                                                <Typography sx={{ fontSize: 13, color: '#1e293b' }}>{v}</Typography>
                                            </Box>
                                        ))}
                                        {detail.candidate.interviewNote && (
                                            <Box sx={{ gridColumn: '1 / -1' }}>
                                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Ghi chú phỏng vấn</Typography>
                                                <Typography sx={{ fontSize: 13, color: '#475569' }}>{detail.candidate.interviewNote}</Typography>
                                            </Box>
                                        )}
                                        {detail.candidate.offerNote && (
                                            <Box sx={{ gridColumn: '1 / -1' }}>
                                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Ghi chú offer</Typography>
                                                <Typography sx={{ fontSize: 13, color: '#475569' }}>{detail.candidate.offerNote}</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                )
                            )}
                            {detailTab === 1 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                    {uploading && <LinearProgress sx={{ borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: G } }} />}
                                    <input ref={uploadRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadCvDetail(f); }} />
                                    {detail.candidate.cvFilePath && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: '12px', bgcolor: '#f0fdf4', border: `1px solid ${alpha(G, 0.2)}` }}>
                                            <InsertDriveFileIcon sx={{ fontSize: 28, color: G }} />
                                            <Box sx={{ flex: 1 }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{detail.candidate.cvFileName || 'CV file'}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>File đã upload</Typography>
                                            </Box>
                                            <Tooltip title="Tải xuống">
                                                <IconButton size="small" onClick={handleDownloadCv} sx={{ color: G }}><DownloadRoundedIcon /></IconButton>
                                            </Tooltip>
                                        </Box>
                                    )}
                                    {detail.candidate.cvLink && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: '12px', bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                            <LinkIcon sx={{ fontSize: 22, color: '#3b82f6' }} />
                                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Link CV</Typography>
                                                <Typography sx={{ fontSize: 12, color: '#3b82f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.candidate.cvLink}</Typography>
                                            </Box>
                                            <Button size="small" href={detail.candidate.cvLink} target="_blank" sx={{ textTransform: 'none', color: '#3b82f6', fontWeight: 700 }}>Mở</Button>
                                        </Box>
                                    )}
                                    {canEdit && (
                                        <Button variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => uploadRef.current?.click()}
                                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px', borderColor: G, color: G, '&:hover': { bgcolor: alpha(G, 0.06) } }}>
                                            {detail.candidate.cvFilePath ? 'Thay thế CV' : 'Upload CV mới'}
                                        </Button>
                                    )}
                                    {detail.candidate.cvNote && (
                                        <Box>
                                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.5 }}>Ghi chú CV</Typography>
                                            <Typography sx={{ fontSize: 13, color: '#475569' }}>{detail.candidate.cvNote}</Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}
                            {detailTab === 2 && (
                                <Box>
                                    {history.length === 0 ? (
                                        <Typography sx={{ textAlign: 'center', py: 6, color: '#94a3b8', fontSize: 13 }}>Chưa có lịch sử</Typography>
                                    ) : history.map((h, i) => (
                                        <Box key={h.id} sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: G, mt: 0.8, flexShrink: 0, border: `2px solid ${alpha(G, 0.3)}` }} />
                                                {i < history.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: '#e2e8f0', mt: 0.5 }} />}
                                            </Box>
                                            <Box sx={{ pb: 2, flex: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{ACTION_HISTORY_LABELS[h.action] ?? h.action}</Typography>
                                                    <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>· {h.actedBy}</Typography>
                                                </Box>
                                                {h.note && <Typography sx={{ fontSize: 12, color: '#64748b' }}>{h.note}</Typography>}
                                                <Typography sx={{ fontSize: 11, color: '#cbd5e1', mt: 0.3 }}>{h.actedAt}</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, py: 2 }}>
                            <Button onClick={() => { setDetailId(null); setEditMode(false); }} sx={{ textTransform: 'none', color: '#64748b' }}>Đóng</Button>
                            {editMode && (
                                <>
                                    <Button onClick={() => setEditMode(false)} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                                    <Button variant="contained" onClick={handleUpdate} disabled={saving}
                                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: G, '&:hover': { bgcolor: '#065f2d' } }}>Lưu</Button>
                                </>
                            )}
                        </DialogActions>
                    </>
                ) : null}
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={deleteId != null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: R } } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>Xác nhận xóa</DialogTitle>
                <DialogContent><Typography sx={{ color: '#475569' }}>Bạn có chắc muốn xóa ứng viên này?</Typography></DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setDeleteId(null)} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Xóa</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
