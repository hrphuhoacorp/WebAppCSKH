'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    MenuItem,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';
import SendIcon from '@mui/icons-material/Send';
import toast from 'react-hot-toast';
import PageHeader from '@/components/common/PageHeader';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/providers/AuthProviders';
import {
    recruitmentCandidateApi,
    recruitmentSettingsApi,
    RecruitmentCandidateDto,
    SendMailDto,
} from '@/features/recruitment/api/recruitment.api';
import TipTapEditor from '@/features/recruitment/components/TipTapEditer';

const MAIL_TYPE_LABEL: Record<string, string> = {
    invite: 'Mời phỏng vấn',
    result_pass: 'Thông báo đậu',
    result_fail: 'Thông báo trượt',
    custom: 'Tuỳ chỉnh',
};

export default function ComposeMailPage() {
    const canEdit = usePermission('recruitment.edit');
    const { profile } = useAuth();

    const [selectedCandidate, setSelectedCandidate] = useState<RecruitmentCandidateDto | null>(null);
    const [templateId, setTemplateId] = useState<number | ''>('');
    const [mailType, setMailType] = useState('custom');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    const { data: candidatesData } = useQuery({
        queryKey: ['recruitment-candidates'],
        queryFn: () => recruitmentCandidateApi.getAll({}),
    });

    const { data: templatesData } = useQuery({
        queryKey: ['recruitment-mail-templates'],
        queryFn: () => recruitmentSettingsApi.getMailTemplates(),
    });

    const { data: settingsData } = useQuery({
        queryKey: ['recruitment-settings'],
        queryFn: () => recruitmentSettingsApi.getSettings(),
    });

    const candidates = candidatesData?.content ?? [];
    const templates = templatesData?.content ?? [];
    const settings = settingsData?.content;

    function applyTemplate(id: number | '') {
        setTemplateId(id);
        if (!id) return;
        const tpl = templates.find(t => t.id === id);
        if (!tpl) return;
        setMailType(tpl.templateType);

        let s = tpl.subject;
        let b = tpl.content;

        // 1. Thay thế thông tin ứng viên
        if (selectedCandidate) {
            const name = selectedCandidate.candidateName;
            const pos = selectedCandidate.position || '';
            s = s.replace(/\{name\}/g, name).replace(/\{position\}/g, pos);
            b = b.replace(/\{name\}/g, name).replace(/\{position\}/g, pos);
        }

        // 2. THAY THẾ CHỮ KÝ TRƯỚC (QUAN TRỌNG)
        if (settings) {
            // Đưa toàn bộ mã HTML chữ ký vào nội dung mail trước
            b = b.replace(/\{signature\}/g, settings.signature || '');

            // 3. SAU ĐÓ MỚI THAY THẾ CÁC BIẾN LIÊN HỆ
            // Lúc này các chữ {phone}, {location} nằm TRONG chữ ký sẽ bị quét trúng và thay thế
            b = b.replace(/\{contact\}/g, settings.defaultContact || '')
                .replace(/\{phone\}/g, settings.defaultPhone || '')
                .replace(/\{location\}/g, settings.defaultLocation || '');
        }

        setSubject(s);
        setBody(b);
    }

    async function handleSend() {
        if (!selectedCandidate) { toast.error('Chọn ứng viên'); return; }
        if (!selectedCandidate.email) { toast.error('Ứng viên chưa có email'); return; }
        if (!subject.trim()) { toast.error('Nhập tiêu đề email'); return; }
        if (!body.trim()) { toast.error('Nhập nội dung email'); return; }

        setSending(true);
        try {
            const dto: SendMailDto = {
                subject,
                htmlBody: body,
                mailType,
                actedBy: profile?.name ?? undefined,
            };
            const res = await recruitmentCandidateApi.sendMail(selectedCandidate.id, dto);
            toast.success(res.message || 'Đã gửi email thành công');
            setSubject('');
            setBody('');
            setTemplateId('');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Gửi email thất bại');
        } finally {
            setSending(false);
        }
    }

    if (!canEdit) {
        return (
            <Box>
                <PageHeader title="Soạn Thảo Email" subtitle="Gửi email đến ứng viên" icon={<MailIcon />} />
                <Alert severity="warning">Bạn không có quyền gửi email tuyển dụng.</Alert>
            </Box>
        );
    }

    return (
        <Box>
            <LoadingOverlay open={sending} />
            <PageHeader
                title="Soạn Thảo Email"
                subtitle="Gửi email mời phỏng vấn hoặc thông báo kết quả cho ứng viên"
                icon={<MailIcon />}
            />

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {/* Main form */}
                <Paper
                    elevation={0}
                    sx={{ flex: 2, minWidth: 320, p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 2 }}
                >
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Soạn Email</Typography>

                    <Autocomplete
                        options={candidates}
                        getOptionLabel={c => `${c.candidateName}${c.email ? ` (${c.email})` : ''}`}
                        value={selectedCandidate}
                        onChange={(_, v) => setSelectedCandidate(v)}
                        renderInput={params => (
                            <TextField {...params} label="Chọn ứng viên *" size="small" />
                        )}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                    />

                    {selectedCandidate && !selectedCandidate.email && (
                        <Alert severity="warning" sx={{ py: 0.5 }}>
                            Ứng viên này chưa có email. Vui lòng cập nhật trước khi gửi.
                        </Alert>
                    )}

                    <TextField
                        label="Template"
                        select
                        value={templateId}
                        onChange={e => applyTemplate(e.target.value === '' ? '' : Number(e.target.value))}
                        size="small"
                        fullWidth
                    >
                        <MenuItem value="">Không dùng template</MenuItem>
                        {templates.map(t => (
                            <MenuItem key={t.id} value={t.id}>
                                {MAIL_TYPE_LABEL[t.templateType] ?? t.templateType}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label="Tiêu đề *"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        size="small"
                        fullWidth
                    />

                    <Typography sx={{ fontSize: 13, fontWeight: 600, mb: -1 }}>Nội dung email *</Typography>

                    <TipTapEditor
                        value={body}
                        onChange={setBody}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button
                            variant="contained"
                            startIcon={<SendIcon />}
                            onClick={handleSend}
                            disabled={sending || !selectedCandidate}
                        >
                            Gửi email
                        </Button>
                    </Box>
                </Paper>

                {/* Side info */}
                <Box sx={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Candidate info */}
                    {selectedCandidate && (
                        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1 }}>Thông tin ứng viên</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{selectedCandidate.candidateName}</Typography>
                                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{selectedCandidate.email || 'Chưa có email'}</Typography>
                                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{selectedCandidate.phone || ''}</Typography>
                                <Box sx={{ mt: 0.5 }}>
                                    <Chip label={selectedCandidate.status} size="small" />
                                    {selectedCandidate.mailInviteSent && <Chip label="Moi da gui" size="small" color="info" sx={{ ml: 0.5, fontSize: 10 }} />}
                                    {selectedCandidate.mailResultSent && <Chip label="KQ da gui" size="small" color="success" sx={{ ml: 0.5, fontSize: 10 }} />}
                                </Box>
                            </Box>
                        </Paper>
                    )}

                    {/* Variables hint */}
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1 }}>Biến trong template</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {[
                                ['{name}', 'Tên ứng viên'],
                                ['{position}', 'Vị trí tuyển dụng'],
                                ['{contact}', 'Người liên hệ'],
                                ['{phone}', 'SĐT liên hệ'],
                                ['{location}', 'Địa điểm'],
                                ['{signature}', 'Chữ ký'],
                            ].map(([v, desc]) => (
                                <Box key={v} sx={{ display: 'flex', gap: 1 }}>
                                    <Typography sx={{ fontSize: 11, fontFamily: 'monospace', bgcolor: 'grey.100', px: 0.5, borderRadius: 0.5 }}>{v}</Typography>
                                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{desc}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>

                    {/* Settings reminder */}
                    {settings && (
                        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1 }}>Thông tin liên hệ mặc định</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {settings.defaultContact && <Typography sx={{ fontSize: 12 }}>Liên hệ: {settings.defaultContact}</Typography>}
                                {settings.defaultPhone && <Typography sx={{ fontSize: 12 }}>SĐT: {settings.defaultPhone}</Typography>}
                                {settings.defaultLocation && <Typography sx={{ fontSize: 12 }}>Địa điểm: {settings.defaultLocation}</Typography>}
                            </Box>
                        </Paper>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
