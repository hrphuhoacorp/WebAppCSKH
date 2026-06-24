'use client';

import React, { useEffect, useState } from 'react';
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
    Paper,
    Skeleton,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import toast from 'react-hot-toast';
import PageHeader from '@/components/common/PageHeader';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { usePermission } from '@/hooks/usePermission';
import {
    recruitmentSettingsApi,
    RecruitmentSettingsUpsertDto,
    MailTemplateUpsertDto,
    MailTemplateDto,
} from '@/features/recruitment/api/recruitment.api';

const TEMPLATE_TYPE_LABEL: Record<string, string> = {
    invite: 'Mời phỏng vấn',
    result_pass: 'Thông báo đậu',
    result_fail: 'Thông báo trượt',
};

export default function RecruitmentSettingsPage() {
    const canSettings = usePermission('recruitment.settings');
    const qc = useQueryClient();

    const [settingsForm, setSettingsForm] = useState<RecruitmentSettingsUpsertDto>({
        defaultContact: '',
        defaultPhone: '',
        defaultLocation: '',
        signature: '',
    });
    const [savingSettings, setSavingSettings] = useState(false);

    const [editTemplate, setEditTemplate] = useState<MailTemplateDto | null>(null);
    const [tplForm, setTplForm] = useState<MailTemplateUpsertDto>({ subject: '', content: '' });
    const [savingTpl, setSavingTpl] = useState(false);

    const { data: settingsData, isLoading: loadingSettings } = useQuery({
        queryKey: ['recruitment-settings'],
        queryFn: () => recruitmentSettingsApi.getSettings(),
    });

    const { data: templatesData, isLoading: loadingTpl } = useQuery({
        queryKey: ['recruitment-mail-templates'],
        queryFn: () => recruitmentSettingsApi.getMailTemplates(),
    });

    const { data: categoriesData } = useQuery({
        queryKey: ['recruitment-categories'],
        queryFn: () => recruitmentSettingsApi.getCategories(),
    });

    useEffect(() => {
        const s = settingsData?.content;
        if (s) {
            setSettingsForm({
                defaultContact: s.defaultContact,
                defaultPhone: s.defaultPhone,
                defaultLocation: s.defaultLocation,
                signature: s.signature,
            });
        }
    }, [settingsData]);

    function setSettingsField<K extends keyof RecruitmentSettingsUpsertDto>(k: K, v: string) {
        setSettingsForm(f => ({ ...f, [k]: v }));
    }

    async function handleSaveSettings() {
        setSavingSettings(true);
        try {
            await recruitmentSettingsApi.upsertSettings(settingsForm);
            toast.success('Lưu cài đặt thành công');
            qc.invalidateQueries({ queryKey: ['recruitment-settings'] });
        } catch {
            toast.error('Lưu cài đặt thất bại');
        } finally {
            setSavingSettings(false);
        }
    }

    function openEditTemplate(tpl: MailTemplateDto) {
        setEditTemplate(tpl);
        setTplForm({ subject: tpl.subject, content: tpl.content });
    }

    async function handleSaveTemplate() {
        if (!editTemplate) return;
        setSavingTpl(true);
        try {
            await recruitmentSettingsApi.updateMailTemplate(editTemplate.id, tplForm);
            toast.success('Cập nhật template thành công');
            qc.invalidateQueries({ queryKey: ['recruitment-mail-templates'] });
            setEditTemplate(null);
        } catch {
            toast.error('Cập nhật thất bại');
        } finally {
            setSavingTpl(false);
        }
    }

    const templates = templatesData?.content ?? [];
    const categories = categoriesData?.content ?? {};

    if (!canSettings) {
        return (
            <Box>
                <PageHeader title="Cài Đặt Tuyển Dụng" subtitle="Cấu hình module tuyển dụng" icon={<SettingsIcon />} />
                <Alert severity="warning">Bạn không có quyền truy cập cài đặt tuyển dụng.</Alert>
            </Box>
        );
    }

    return (
        <Box>
            <LoadingOverlay open={savingSettings || savingTpl} />
            <PageHeader
                title="Cài Đặt Tuyển Dụng"
                subtitle="Cấu hình thông tin liên hệ và email template"
                icon={<SettingsIcon />}
            />

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {/* Contact settings */}
                <Paper
                    elevation={0}
                    sx={{ flex: 1, minWidth: 280, p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 2 }}
                >
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Thông Tin Liên Hệ Mặc Định</Typography>
                    {loadingSettings ? (
                        [1, 2, 3, 4].map(i => <Skeleton key={i} height={40} />)
                    ) : (
                        <>
                            <TextField
                                label="Người liên hệ"
                                value={settingsForm.defaultContact ?? ''}
                                onChange={e => setSettingsField('defaultContact', e.target.value)}
                                size="small"
                                fullWidth
                            />
                            <TextField
                                label="Số điện thoại"
                                value={settingsForm.defaultPhone ?? ''}
                                onChange={e => setSettingsField('defaultPhone', e.target.value)}
                                size="small"
                                fullWidth
                            />
                            <TextField
                                label="Địa điểm phỏng vấn"
                                value={settingsForm.defaultLocation ?? ''}
                                onChange={e => setSettingsField('defaultLocation', e.target.value)}
                                size="small"
                                fullWidth
                            />
                            <TextField
                                label="Chữ ký email"
                                value={settingsForm.signature ?? ''}
                                onChange={e => setSettingsField('signature', e.target.value)}
                                size="small"
                                fullWidth
                                multiline
                                rows={4}
                                placeholder="VD: Trân trọng,&#10;Phòng Nhân sự - PHF"
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button variant="contained" onClick={handleSaveSettings} disabled={savingSettings}>
                                    Lưu cài đặt
                                </Button>
                            </Box>
                        </>
                    )}
                </Paper>

                {/* Categories view */}
                <Paper
                    elevation={0}
                    sx={{ flex: 1, minWidth: 240, p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                >
                    <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 2 }}>Danh Mục</Typography>
                    {Object.entries(categories).length === 0 ? (
                        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>Đang tải...</Typography>
                    ) : (
                        Object.entries(categories).map(([type, items]) => (
                            <Box key={type} sx={{ mb: 2 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {type === 'source' ? 'Nguồn ứng viên' : type === 'status' ? 'Trạng thái' : type}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {items.map(item => (
                                        <Chip key={item.id} label={item.value} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                                    ))}
                                </Box>
                            </Box>
                        ))
                    )}
                </Paper>
            </Box>

            {/* Mail templates */}
            <Paper
                elevation={0}
                sx={{ mt: 3, p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
                <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 2 }}>Email Templates</Typography>
                {loadingTpl ? (
                    [1, 2, 3].map(i => <Skeleton key={i} height={60} sx={{ mb: 1 }} />)
                ) : templates.length === 0 ? (
                    <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>Chưa có template nào</Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {templates.map(tpl => (
                            <Box key={tpl.id} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            label={TEMPLATE_TYPE_LABEL[tpl.templateType] ?? tpl.templateType}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                        {tpl.updatedAt && (
                                            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                                                Cập nhật: {tpl.updatedAt}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Tooltip title="Sửa template">
                                        <IconButton size="small" onClick={() => openEditTemplate(tpl)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{tpl.subject}</Typography>
                                <Typography
                                    sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5, whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}
                                >
                                    {tpl.content}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </Paper>

            {/* Edit template dialog */}
            <Dialog open={editTemplate != null} onClose={() => setEditTemplate(null)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Sửa template: {editTemplate ? (TEMPLATE_TYPE_LABEL[editTemplate.templateType] ?? editTemplate.templateType) : ''}
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <Alert severity="info" sx={{ py: 0.5, fontSize: 12 }}>
                            Dùng: {'{name}'} tên ứng viên, {'{position}'} vị trí, {'{contact}'} người liên hệ, {'{phone}'} SĐT, {'{location}'} địa điểm, {'{signature}'} chữ ký
                        </Alert>
                        <TextField
                            label="Tiêu đề"
                            value={tplForm.subject}
                            onChange={e => setTplForm(f => ({ ...f, subject: e.target.value }))}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label="Nội dung"
                            value={tplForm.content}
                            onChange={e => setTplForm(f => ({ ...f, content: e.target.value }))}
                            size="small"
                            fullWidth
                            multiline
                            rows={12}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditTemplate(null)}>Hủy</Button>
                    <Button variant="contained" onClick={handleSaveTemplate} disabled={savingTpl}>
                        Lưu template
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
