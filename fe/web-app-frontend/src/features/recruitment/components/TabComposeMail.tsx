'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert, Autocomplete, Box, Button, Chip, Divider, MenuItem,
    Paper, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/providers/AuthProviders';
import {
    recruitmentCandidateApi, recruitmentSettingsApi,
    RecruitmentCandidateDto, SendMailDto,
} from '@/features/recruitment/api/recruitment.api';

const G = '#086839';
const BORDER = '#e2e8f0';
const R = '20px';

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: G } },
    '& label.Mui-focused': { color: G },
};

const MAIL_TYPES = [
    { value: 'invite', label: 'Thư mời phỏng vấn' },
    { value: 'pass', label: 'Thông báo đậu phỏng vấn' },
    { value: 'onboard', label: 'Thư mời nhận việc' },
    { value: 'fail', label: 'Thông báo không phù hợp' },
    { value: 'reschedule', label: 'Hẹn lại lịch phỏng vấn' },
    { value: 'custom', label: 'Tùy chỉnh' },
];

const METHODS = ['Trực tiếp tại văn phòng', 'Online qua Google Meet', 'Online qua Zoom', 'Qua điện thoại'];
const DONE_STATUSES_MAIL = ['Hoàn tất', 'Đã từ chối', 'Không phù hợp CV'];

function esc(s: string) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function applyTemplate(content: string, vals: Record<string, string>): string {
    return Object.entries(vals).reduce(
        (html, [k, v]) => html.replaceAll(`{{${k}}}`, esc(v)),
        content
    );
}


function buildPlainText(d: { type: string; name: string; position: string; date: string; time: string; method: string; contact: string; phone: string; location: string; offer: string; onboardDate: string; onboardTime: string; note: string }): string {
    const lines: string[] = [];
    if (d.type === 'invite') {
        lines.push(`Kính gửi ${d.name},\n`);
        lines.push(`Chúng tôi trân trọng mời bạn tham gia phỏng vấn vị trí ${d.position}.\n`);
        lines.push(`Thời gian: ${d.date} - ${d.time}`);
        lines.push(`Hình thức: ${d.method}`);
        if (d.location) lines.push(`Địa điểm: ${d.location}`);
        if (d.contact) lines.push(`Liên hệ: ${d.contact}${d.phone ? ' - ' + d.phone : ''}`);
    } else if (d.type === 'pass') {
        lines.push(`Kính gửi ${d.name},\n`);
        lines.push(`Chúc mừng bạn đã vượt qua vòng phỏng vấn vị trí ${d.position}!`);
        if (d.offer) lines.push(`Thông tin đề xuất: ${d.offer}`);
    } else if (d.type === 'onboard') {
        lines.push(`Kính gửi ${d.name},\n`);
        lines.push(`Trân trọng mời bạn chính thức nhận việc vị trí ${d.position}.`);
        if (d.onboardDate) lines.push(`Ngày bắt đầu: ${d.onboardDate}${d.onboardTime ? ' - ' + d.onboardTime : ''}`);
        if (d.location) lines.push(`Địa điểm: ${d.location}`);
        if (d.offer) lines.push(`Mức lương / đề xuất: ${d.offer}`);
        if (d.contact) lines.push(`Liên hệ: ${d.contact}${d.phone ? ' - ' + d.phone : ''}`);
    } else if (d.type === 'fail') {
        lines.push(`Kính gửi ${d.name},\n`);
        lines.push(`Rất tiếc thông báo rằng hồ sơ của bạn cho vị trí ${d.position} chưa phù hợp với yêu cầu hiện tại.`);
        lines.push(`Cảm ơn sự quan tâm của bạn. Chúc bạn thành công!`);
    } else if (d.type === 'reschedule') {
        lines.push(`Kính gửi ${d.name},\n`);
        lines.push(`Thông tin lịch phỏng vấn mới vị trí ${d.position}:`);
        lines.push(`Thời gian: ${d.date} - ${d.time}`);
        if (d.location) lines.push(`Địa điểm: ${d.location}`);
    }
    if (d.note) lines.push(`\nGhi chú: ${d.note}`);
    return lines.join('\n');
}

function composeSubject(type: string, position: string): string {
    const pos = position || 'VỊ TRÍ';
    if (type === 'invite') return `Thư mời phỏng vấn vị trí ${pos}`;
    if (type === 'pass') return `Thông báo kết quả phỏng vấn vị trí ${pos} - Đậu`;
    if (type === 'onboard') return `Thư mời nhận việc vị trí ${pos}`;
    if (type === 'fail') return `Thông báo kết quả phỏng vấn vị trí ${pos}`;
    if (type === 'reschedule') return `Thay đổi lịch phỏng vấn vị trí ${pos}`;
    return `Thông tin tuyển dụng vị trí ${pos}`;
}

export interface ComposePrefill {
    candidate: RecruitmentCandidateDto;
    mailType: string;
}

export interface TabComposeMailProps {
    prefill?: ComposePrefill | null;
    onClearPrefill?: () => void;
}

export default function TabComposeMail({ prefill, onClearPrefill }: TabComposeMailProps) {
    const canEdit = usePermission('recruitment.edit');
    const { profile } = useAuth();
    const qc = useQueryClient();

    const [selected, setSelected] = useState<RecruitmentCandidateDto | null>(null);
    const [mailType, setMailType] = useState('invite');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [method, setMethod] = useState(METHODS[0]);
    const [contact, setContact] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [offer, setOffer] = useState('');
    const [onboardDate, setOnboardDate] = useState('');
    const [onboardTime, setOnboardTime] = useState('');
    const [note, setNote] = useState('');
    const [subject, setSubject] = useState('');
    const [customBody, setCustomBody] = useState('');
    const [useCustomBody, setUseCustomBody] = useState(false);
    const [sending, setSending] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const attachInputRef = useRef<HTMLInputElement>(null);

    const { data: cData } = useQuery({
        queryKey: ['recruitment-candidates'],
        queryFn: () => recruitmentCandidateApi.getAll({}),
    });
    const { data: sData } = useQuery({
        queryKey: ['recruitment-settings'],
        queryFn: () => recruitmentSettingsApi.getSettings(),
    });
    const { data: tplData } = useQuery({
        queryKey: ['recruitment-mail-templates'],
        queryFn: () => recruitmentSettingsApi.getMailTemplates(),
    });

    const candidates = (cData?.content ?? []).filter(c => !DONE_STATUSES_MAIL.includes(c.status));
    const settings = sData?.content;
    const templates = tplData?.content ?? [];

    // Apply prefill from kanban card
    useEffect(() => {
        if (!prefill) return;
        setSelected(prefill.candidate);
        setMailType(prefill.mailType);
        setSubject(subjectFromTemplate(prefill.mailType, prefill.candidate.position || '', prefill.candidate.candidateName || ''));
        if (settings) {
            setContact(settings.defaultContact || '');
            setPhone(settings.defaultPhone || '');
            setLocation(settings.defaultLocation || '');
        }
        // Auto-bind interview date/time and onboard date
        if (prefill.candidate.interviewTime) {
            const parts = prefill.candidate.interviewTime.split(' ');
            setDate(parts[0] || '');
            setTime(parts[1] || '');
        }
        if (prefill.candidate.onboardDate) setOnboardDate(prefill.candidate.onboardDate);
        setUseCustomBody(false);
        onClearPrefill?.();
    }, [prefill]);

    // Auto-fill defaults from settings
    useEffect(() => {
        if (settings && !contact) setContact(settings.defaultContact || '');
        if (settings && !phone) setPhone(settings.defaultPhone || '');
        if (settings && !location) setLocation(settings.defaultLocation || '');
    }, [settings]);

    function subjectFromTemplate(type: string, pos: string, name: string): string {
        const tpl = templates.find(x => x.templateType === type);
        if (tpl?.subject) return tpl.subject.replaceAll('{{position}}', pos).replaceAll('{{name}}', name);
        return composeSubject(type, pos);
    }

    function handleCandidateChange(c: RecruitmentCandidateDto | null) {
        setSelected(c);
        if (c) {
            setSubject(subjectFromTemplate(mailType, c.position || '', c.candidateName || ''));
            if (c.interviewTime) {
                const parts = c.interviewTime.split(' ');
                setDate(parts[0] || '');
                setTime(parts[1] || '');
            }
            if (c.onboardDate) setOnboardDate(c.onboardDate);
        }
    }

    function handleTypeChange(t: string) {
        setMailType(t);
        if (selected) setSubject(subjectFromTemplate(t, selected.position || '', selected.candidateName || ''));
    }

    const composeData = {
        type: mailType, name: selected?.candidateName || '',
        position: selected?.position || '', date, time, method, contact, phone, location,
        offer, onboardDate, onboardTime, note,
    };

    const logoUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/images/Logo/PHF_FALOGO.png`
        : '';
    const logoWhiteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/images/Logo/PHF_LOGOWhite.png`
        : '';

    const signatureHtml = settings?.signature || '';

    const templateVals: Record<string, string> = {
        name: selected?.candidateName || '', position: selected?.position || '',
        date, time, method, contact, phone, location, offer, onboardDate, onboardTime, note,
        logoUrl, logoWhiteUrl,
    };
    const activeTemplate = templates.find(t => t.templateType === mailType);
    const previewHtml = activeTemplate
        ? applyTemplate(activeTemplate.content.replaceAll('{{signature}}', signatureHtml), templateVals)
        : `<p style="padding:24px;color:#94a3b8;font-size:13px;text-align:center;">Chưa có template cho loại thư này.<br/>Vào <strong>Cài đặt → Mail Template</strong> để tạo.</p>`;
    const finalBody = useCustomBody ? customBody : previewHtml;

    function handleClearForm() {
        setSelected(null); setMailType('invite');
        setDate(''); setTime(''); setMethod(METHODS[0]);
        setContact(settings?.defaultContact || ''); setPhone(settings?.defaultPhone || '');
        setLocation(settings?.defaultLocation || ''); setOffer(''); setOnboardDate(''); setOnboardTime(''); setNote('');
        setSubject(''); setCustomBody(''); setUseCustomBody(false);
        setAttachments([]);
    }

    function handleOpenGmail() {
        if (!selected?.email) { toast.error('Ứng viên chưa có email'); return; }
        const plain = buildPlainText(composeData);
        const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selected.email)}&su=${encodeURIComponent(subject || composeSubject(mailType, selected.position || ''))}&body=${encodeURIComponent(plain)}`;
        window.open(url, '_blank');
    }

    function handlePrint() {
        const win = window.open('', '_blank', 'width=800,height=600');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>Thư tuyển dụng</title>
<style>body{font-family:Arial,sans-serif;max-width:640px;margin:40px auto;padding:20px}@media print{body{margin:0}}</style>
</head><body>${finalBody}<script>window.onload=function(){window.print()}<\/script></body></html>`);
        win.document.close();
    }

    function handleCopyContent() {
        const plain = buildPlainText(composeData);
        navigator.clipboard.writeText(plain).then(() => toast.success('Đã copy nội dung'));
    }

    async function handleMarkSent() {
        if (!selected) { toast.error('Chọn ứng viên'); return; }
        setSending(true);
        try {
            let newStatus = selected.status;
            if (mailType === 'invite' && selected.status === 'Đã hẹn PV - chưa mail') newStatus = 'Đã gửi mail mời PV';
            else if (mailType === 'fail') newStatus = 'Đã từ chối';
            else if (mailType === 'pass' && selected.status === 'Pass - chưa gửi thỏa thuận') newStatus = 'Đã gửi thỏa thuận';
            if (newStatus !== selected.status) {
                await recruitmentCandidateApi.update(selected.id, {
                    candidateName: selected.candidateName, phone: selected.phone, email: selected.email,
                    position: selected.position, source: selected.source, cvLink: selected.cvLink,
                    interviewTime: selected.interviewTime, result: selected.result, onboardDate: selected.onboardDate,
                    status: newStatus, actedBy: profile?.name ?? '',
                });
                qc.invalidateQueries({ queryKey: ['recruitment-candidates'] });
            }
            toast.success('Đã đánh dấu gửi mail và cập nhật trạng thái');
        } catch { toast.error('Cập nhật thất bại'); } finally { setSending(false); }
    }

    async function handleSendApi() {
        if (!selected) { toast.error('Chọn ứng viên'); return; }
        if (!selected.email) { toast.error('Ứng viên chưa có email'); return; }
        if (!subject.trim()) { toast.error('Nhập tiêu đề email'); return; }
        setSending(true);
        try {
            const res = await recruitmentCandidateApi.sendMail(selected.id, {
                subject, htmlBody: finalBody, mailType, actedBy: profile?.name ?? undefined, attachments,
            });
            toast.success(res.message || 'Đã gửi email thành công');
            qc.invalidateQueries({ queryKey: ['recruitment-candidates'] });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Gửi email thất bại');
        } finally { setSending(false); }
    }

    if (!canEdit) {
        return <Box sx={{ p: 3 }}><Alert severity="warning" sx={{ borderRadius: '12px' }}>Bạn không có quyền gửi email tuyển dụng.</Alert></Box>;
    }

    return (
        <>
            <LoadingOverlay open={sending} fullScreen />
            <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {/* Left: compose form */}
                <Paper elevation={0} sx={{
                    flex: '1 1 340px', p: 2.5, borderRadius: R, border: `1px solid ${BORDER}`,
                    bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                    display: 'flex', flexDirection: 'column', gap: 1.8,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(G, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MailOutlineRoundedIcon sx={{ fontSize: 20, color: G }} />
                        </Box>
                        <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>Soạn thư tuyển dụng</Typography>
                    </Box>

                    <Autocomplete
                        options={candidates}
                        getOptionLabel={c => `${c.candidateName}${c.email ? ` (${c.email})` : ''}`}
                        value={selected}
                        onChange={(_, v) => handleCandidateChange(v)}
                        renderInput={p => <TextField {...p} label="Ứng viên *" size="small" sx={fieldSx} />}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />

                    {selected && !selected.email && (
                        <Alert severity="warning" sx={{ py: 0.5, borderRadius: '10px' }}>Ứng viên chưa có email — chỉ dùng Gmail / In.</Alert>
                    )}

                    <TextField select label="Loại thư *" value={mailType} onChange={e => handleTypeChange(e.target.value)} size="small" fullWidth sx={fieldSx}>
                        {MAIL_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                    </TextField>

                    <TextField label="Tiêu đề email" value={subject} onChange={e => setSubject(e.target.value)} size="small" fullWidth sx={fieldSx} />

                    {(mailType === 'invite' || mailType === 'reschedule') && (
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <TextField label="Ngày PV" value={date} onChange={e => setDate(e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} placeholder="dd/mm/yyyy" />
                            <TextField label="Giờ PV" value={time} onChange={e => setTime(e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} placeholder="09:00" />
                        </Box>
                    )}

                    {(mailType === 'invite' || mailType === 'reschedule') && (
                        <TextField select label="Hình thức" value={method} onChange={e => setMethod(e.target.value)} size="small" fullWidth sx={fieldSx}>
                            {METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </TextField>
                    )}

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <TextField label="Người liên hệ" value={contact} onChange={e => setContact(e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} />
                        <TextField label="SĐT liên hệ" value={phone} onChange={e => setPhone(e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} />
                    </Box>

                    {(mailType === 'invite' || mailType === 'reschedule') && (
                        <TextField label="Địa điểm / Link meet" value={location} onChange={e => setLocation(e.target.value)} size="small" fullWidth sx={fieldSx} />
                    )}

                    {mailType === 'pass' && (
                        <>
                            <TextField label="Thỏa thuận / Mức lương đề xuất" value={offer} onChange={e => setOffer(e.target.value)} size="small" fullWidth sx={fieldSx} />
                            <TextField label="Ngày onboard dự kiến" value={onboardDate} onChange={e => setOnboardDate(e.target.value)} size="small" fullWidth sx={fieldSx} placeholder="dd/mm/yyyy" />
                        </>
                    )}

                    {mailType === 'onboard' && (
                        <>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <TextField label="Ngày nhận việc" value={onboardDate} onChange={e => setOnboardDate(e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} placeholder="dd/mm/yyyy" />
                                <TextField label="Giờ có mặt" value={onboardTime} onChange={e => setOnboardTime(e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} placeholder="08:00" />
                            </Box>
                            <TextField label="Mức lương / Đề xuất" value={offer} onChange={e => setOffer(e.target.value)} size="small" fullWidth sx={fieldSx} />
                            <TextField label="Địa điểm nhận việc" value={location} onChange={e => setLocation(e.target.value)} size="small" fullWidth sx={fieldSx} />
                        </>
                    )}

                    <TextField label="Ghi chú thêm (sẽ hiện trong thư)" value={note} onChange={e => setNote(e.target.value)} size="small" fullWidth multiline rows={2} sx={fieldSx} />

                    {/* File attachments */}
                    <Box>
                        <input ref={attachInputRef} type="file" multiple hidden onChange={e => {
                            const files = Array.from(e.target.files ?? []);
                            setAttachments(prev => [...prev, ...files]);
                            e.target.value = '';
                        }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Button size="small" variant="outlined" startIcon={<AttachFileRoundedIcon />}
                                onClick={() => attachInputRef.current?.click()}
                                sx={{ textTransform: 'none', borderRadius: '8px', borderColor: BORDER, color: '#64748b', fontSize: 11, fontWeight: 700 }}>
                                Đính kèm file
                            </Button>
                            {attachments.map((f, i) => (
                                <Chip key={i} label={f.name} size="small"
                                    deleteIcon={<CloseRoundedIcon sx={{ fontSize: 14 }} />}
                                    onDelete={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                                    sx={{ fontSize: 11, borderRadius: '6px', height: 22, maxWidth: 160 }} />
                            ))}
                        </Box>
                    </Box>

                    <Divider />

                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Tooltip title="Copy nội dung dạng text">
                            <Button variant="outlined" size="small" startIcon={<ContentCopyRoundedIcon />} onClick={handleCopyContent}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: BORDER, color: '#475569', fontSize: 12 }}>
                                Copy
                            </Button>
                        </Tooltip>
                        <Tooltip title="Mở Gmail để gửi thủ công">
                            <Button variant="outlined" size="small" startIcon={<OpenInNewRoundedIcon />} onClick={handleOpenGmail}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: '#3b82f6', color: '#3b82f6', fontSize: 12 }}>
                                Gmail
                            </Button>
                        </Tooltip>
                        <Tooltip title="In thư / Lưu PDF">
                            <Button variant="outlined" size="small" startIcon={<PrintRoundedIcon />} onClick={handlePrint}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: '#7c3aed', color: '#7c3aed', fontSize: 12 }}>
                                In / PDF
                            </Button>
                        </Tooltip>
                        <Tooltip title="Đánh dấu đã gửi và cập nhật trạng thái ứng viên">
                            <Button variant="outlined" size="small" startIcon={<CheckCircleRoundedIcon />} onClick={handleMarkSent}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: '#16a34a', color: '#16a34a', fontSize: 12 }}>
                                Đã gửi
                            </Button>
                        </Tooltip>
                        <Button variant="outlined" size="small" startIcon={<RefreshRoundedIcon />} onClick={handleClearForm}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: BORDER, color: '#94a3b8', fontSize: 12 }}>
                            Làm mới
                        </Button>
                        <Button variant="contained" size="small" startIcon={<SendRoundedIcon />} onClick={handleSendApi}
                            disabled={sending || !selected || !selected.email}
                            sx={{ ml: 'auto', textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: G, '&:hover': { bgcolor: '#065f2d' }, fontSize: 12 }}>
                            Gửi qua hệ thống
                        </Button>
                    </Box>
                </Paper>

                {/* Right: preview */}
                <Box sx={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: 2 }}>

                    {/* Candidate info */}
                    {selected && (
                        <Paper elevation={0} sx={{ p: 2, borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                            <Typography sx={{ fontWeight: 800, fontSize: 12, mb: 1, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ứng viên</Typography>
                            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{selected.candidateName}</Typography>
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>{selected.email || 'Chưa có email'}{selected.phone ? ` · ${selected.phone}` : ''}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.8, flexWrap: 'wrap' }}>
                                <Chip label={selected.status} size="small" sx={{ fontSize: 10, borderRadius: '6px', height: 20 }} />
                                {selected.position && <Chip label={selected.position} size="small" variant="outlined" sx={{ fontSize: 10, borderRadius: '6px', height: 20 }} />}
                            </Box>
                        </Paper>
                    )}

                    {/* HTML preview */}
                    <Paper elevation={0} sx={{ flex: 1, borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Xem trước nội dung thư</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Chip label={useCustomBody ? 'Tùy chỉnh' : 'Tự động'} size="small" clickable onClick={() => { if (!useCustomBody) setCustomBody(finalBody); setUseCustomBody(!useCustomBody); }}
                                    sx={{ fontSize: 10, borderRadius: '6px', height: 20, bgcolor: useCustomBody ? '#fef3c7' : '#dcfce7', color: useCustomBody ? '#b45309' : '#166534', fontWeight: 700 }} />
                            </Box>
                        </Box>
                        {useCustomBody ? (
                            <TextField
                                value={customBody}
                                onChange={e => setCustomBody(e.target.value)}
                                multiline rows={18} fullWidth size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': { borderRadius: 0, fontFamily: 'monospace', fontSize: 12, '& fieldset': { border: 'none' } },
                                }}
                                placeholder="Nhập HTML tùy chỉnh..."
                            />
                        ) : (
                            <Box sx={{ p: 2, maxHeight: 450, overflowY: 'auto', fontSize: 13,
                                '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#e2e8f0', borderRadius: 2 },
                            }}
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                        )}
                    </Paper>
                </Box>
            </Box>
        </>
    );
}
