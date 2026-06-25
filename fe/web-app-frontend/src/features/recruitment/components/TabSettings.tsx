'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, MenuItem, Paper, Skeleton, TextField, Tooltip, Typography, alpha, Tab, Tabs, Divider,
} from '@mui/material';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/providers/AuthProviders';
import {
    recruitmentSettingsApi, CategoryItemDto, CategoryUpsertDto,
    MailTemplateDto, MailTemplateUpsertDto, MailTemplateCreateDto,
} from '@/features/recruitment/api/recruitment.api';

const G = '#086839';
const BORDER = '#e2e8f0';
const R = '20px';

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: G } },
    '& label.Mui-focused': { color: G },
};

const MAIL_TYPES = [
    { value: 'invite', label: 'Mời phỏng vấn' },
    { value: 'result_pass', label: 'Thông báo đậu' },
    { value: 'result_fail', label: 'Thông báo trượt' },
    { value: 'custom', label: 'Tuỳ chỉnh' },
];
const CAT_TYPES = [
    { value: 'source', label: 'Nguồn ứng viên' },
    { value: 'status', label: 'Trạng thái' },
];

export default function TabSettings() {
    const canEdit = usePermission('recruitment.settings');
    const { profile } = useAuth();
    const qc = useQueryClient();

    const [sectTab, setSectTab] = useState(0);
    const [saving, setSaving] = useState(false);

    // Contact settings
    const [contactForm, setContactForm] = useState({ defaultContact: '', defaultPhone: '', defaultLocation: '', signature: '' });
    const [contactLoaded, setContactLoaded] = useState(false);

    const { data: settData, isLoading: ls } = useQuery({
        queryKey: ['recruitment-settings'],
        queryFn: () => recruitmentSettingsApi.getSettings(),
    });
    const { data: catData, isLoading: lc } = useQuery({
        queryKey: ['recruitment-categories'],
        queryFn: () => recruitmentSettingsApi.getCategories(),
    });
    const { data: tplData, isLoading: lt } = useQuery({
        queryKey: ['recruitment-mail-templates'],
        queryFn: () => recruitmentSettingsApi.getMailTemplates(),
    });

    const cats = catData?.content ?? {};
    const templates = tplData?.content ?? [];

    // Load contact form once
    React.useEffect(() => {
        if (settData?.content && !contactLoaded) {
            const s = settData.content;
            setContactForm({ defaultContact: s.defaultContact || '', defaultPhone: s.defaultPhone || '', defaultLocation: s.defaultLocation || '', signature: s.signature || '' });
            setContactLoaded(true);
        }
    }, [settData, contactLoaded]);

    async function handleSaveContact() {
        setSaving(true);
        try {
            await recruitmentSettingsApi.upsertSettings(contactForm);
            toast.success('Lưu cài đặt thành công');
            qc.invalidateQueries({ queryKey: ['recruitment-settings'] });
        } catch { toast.error('Lỗi khi lưu'); } finally { setSaving(false); }
    }

    // Category CRUD
    const [catDialog, setCatDialog] = useState(false);
    const [catEdit, setCatEdit] = useState<CategoryItemDto | null>(null);
    const [catForm, setCatForm] = useState<CategoryUpsertDto>({ type: 'source', value: '', sortOrder: 0 });

    function openCatCreate(type: string) {
        setCatEdit(null);
        setCatForm({ type, value: '', sortOrder: (cats[type]?.length ?? 0) + 1 });
        setCatDialog(true);
    }
    function openCatEdit(type: string, item: CategoryItemDto) {
        setCatEdit(item);
        setCatForm({ type, value: item.value, sortOrder: item.sortOrder });
        setCatDialog(true);
    }
    async function handleSaveCat() {
        if (!catForm.value.trim()) { toast.error('Nhập giá trị'); return; }
        setSaving(true);
        try {
            if (catEdit) { await recruitmentSettingsApi.updateCategory(catEdit.id, catForm); toast.success('Cập nhật thành công'); }
            else { await recruitmentSettingsApi.createCategory(catForm); toast.success('Thêm thành công'); }
            qc.invalidateQueries({ queryKey: ['recruitment-categories'] });
            setCatDialog(false);
        } catch { toast.error('Lỗi'); } finally { setSaving(false); }
    }
    async function handleDeleteCat(id: number) {
        if (!confirm('Xóa danh mục này?')) return;
        setSaving(true);
        try {
            await recruitmentSettingsApi.deleteCategory(id);
            toast.success('Đã xóa');
            qc.invalidateQueries({ queryKey: ['recruitment-categories'] });
        } catch { toast.error('Không thể xóa'); } finally { setSaving(false); }
    }

    // Mail template CRUD
    const [tplDialog, setTplDialog] = useState(false);
    const [tplEdit, setTplEdit] = useState<MailTemplateDto | null>(null);
    const [tplForm, setTplForm] = useState<MailTemplateCreateDto>({ templateType: 'invite', subject: '', content: '' });
    const [tplPreview, setTplPreview] = useState<MailTemplateDto | null>(null);

    function openTplCreate() {
        setTplEdit(null);
        setTplForm({ templateType: 'invite', subject: '', content: '' });
        setTplDialog(true);
    }
    function openTplEdit(t: MailTemplateDto) {
        setTplEdit(t);
        setTplForm({ templateType: t.templateType, subject: t.subject, content: t.content });
        setTplDialog(true);
    }
    async function handleSaveTpl() {
        if (!tplForm.subject.trim() || !tplForm.content.trim()) { toast.error('Nhập tiêu đề và nội dung'); return; }
        setSaving(true);
        try {
            if (tplEdit) {
                const upsert: MailTemplateUpsertDto = { subject: tplForm.subject, content: tplForm.content };
                await recruitmentSettingsApi.updateMailTemplate(tplEdit.id, upsert);
                toast.success('Cập nhật template thành công');
            } else {
                await recruitmentSettingsApi.createMailTemplate(tplForm);
                toast.success('Tạo template thành công');
            }
            qc.invalidateQueries({ queryKey: ['recruitment-mail-templates'] });
            setTplDialog(false);
        } catch { toast.error('Lỗi'); } finally { setSaving(false); }
    }

    const mailTypeLabel = (v: string) => MAIL_TYPES.find(x => x.value === v)?.label ?? v;

    return (
        <>
            <LoadingOverlay open={saving} />

            <Tabs value={sectTab} onChange={(_, v) => setSectTab(v)} sx={{
                mb: 2,
                '& .MuiTabs-indicator': { bgcolor: G, height: 2 },
                '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: 13, color: '#64748b', '&.Mui-selected': { color: G }, minHeight: 40 },
            }}>
                <Tab icon={<SettingsRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Liên hệ & chữ ký" />
                <Tab icon={<CategoryRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Danh mục" />
                <Tab icon={<MailOutlineRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Mail templates" />
            </Tabs>

            {/* ─── Contact settings ─────────────────────────── */}
            {sectTab === 0 && (
                <Paper elevation={0} sx={{ p: 3, borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', maxWidth: 640 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b', mb: 2 }}>Thông tin liên hệ mặc định</Typography>
                    {ls ? <Skeleton height={200} /> : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField label="Người liên hệ" value={contactForm.defaultContact} onChange={e => setContactForm(f => ({ ...f, defaultContact: e.target.value }))} size="small" fullWidth sx={fieldSx} />
                            <TextField label="Số điện thoại liên hệ" value={contactForm.defaultPhone} onChange={e => setContactForm(f => ({ ...f, defaultPhone: e.target.value }))} size="small" fullWidth sx={fieldSx} />
                            <TextField label="Địa điểm" value={contactForm.defaultLocation} onChange={e => setContactForm(f => ({ ...f, defaultLocation: e.target.value }))} size="small" fullWidth sx={fieldSx} />
                            <TextField label="Chữ ký (HTML)" value={contactForm.signature} onChange={e => setContactForm(f => ({ ...f, signature: e.target.value }))} size="small" fullWidth multiline rows={5}
                                sx={{ ...fieldSx, '& .MuiOutlinedInput-root': { borderRadius: '12px', fontFamily: 'monospace', fontSize: 12, '&.Mui-focused fieldset': { borderColor: G } } }} />
                            {canEdit && (
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button variant="contained" onClick={handleSaveContact} disabled={saving}
                                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px', bgcolor: G, '&:hover': { bgcolor: '#065f2d' } }}>
                                        Lưu cài đặt
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    )}
                </Paper>
            )}

            {/* ─── Categories ───────────────────────────────── */}
            {sectTab === 1 && (
                <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {CAT_TYPES.map(ct => (
                        <Paper key={ct.value} elevation={0} sx={{ flex: '1 1 280px', borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.8, borderBottom: `1px solid ${BORDER}`, gap: 1 }}>
                                <CategoryRoundedIcon sx={{ fontSize: 17, color: G }} />
                                <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b', flex: 1 }}>{ct.label}</Typography>
                                {canEdit && (
                                    <Button size="small" startIcon={<AddCircleRoundedIcon />} onClick={() => openCatCreate(ct.value)}
                                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, color: G, '&:hover': { bgcolor: alpha(G, 0.07) } }}>
                                        Thêm
                                    </Button>
                                )}
                            </Box>
                            <Box>
                                {lc ? [1, 2, 3].map(i => <Box key={i} sx={{ px: 2.5, py: 1 }}><Skeleton height={28} /></Box>) :
                                    (cats[ct.value] ?? []).length === 0 ? (
                                        <Typography sx={{ px: 2.5, py: 3, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Chưa có danh mục</Typography>
                                    ) : (cats[ct.value] ?? []).map((item, idx) => (
                                        <React.Fragment key={item.id}>
                                            {idx > 0 && <Divider sx={{ mx: 2 }} />}
                                            <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.2, '&:hover': { bgcolor: '#f8fafc' } }}>
                                                <Typography sx={{ flex: 1, fontSize: 13, color: '#1e293b' }}>{item.value}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#cbd5e1', mr: 1 }}>#{item.sortOrder}</Typography>
                                                {canEdit && (
                                                    <>
                                                        <Tooltip title="Sửa">
                                                            <IconButton size="small" onClick={() => openCatEdit(ct.value, item)} sx={{ color: G, '&:hover': { bgcolor: alpha(G, 0.08) } }}>
                                                                <EditIcon sx={{ fontSize: 15 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Xóa">
                                                            <IconButton size="small" onClick={() => handleDeleteCat(item.id)} sx={{ color: '#dc2626', '&:hover': { bgcolor: alpha('#dc2626', 0.08) } }}>
                                                                <DeleteOutlinedIcon sx={{ fontSize: 15 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </Box>
                                        </React.Fragment>
                                    ))}
                            </Box>
                        </Paper>
                    ))}
                </Box>
            )}

            {/* ─── Mail templates ───────────────────────────── */}
            {sectTab === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {canEdit && (
                        <Box>
                            <Button variant="contained" startIcon={<AddCircleRoundedIcon />} onClick={openTplCreate}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px', bgcolor: G, '&:hover': { bgcolor: '#065f2d' } }}>
                                Thêm template
                            </Button>
                        </Box>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {lt ? [1, 2].map(i => <Skeleton key={i} height={80} sx={{ borderRadius: R }} />) :
                            templates.length === 0 ? (
                                <Paper elevation={0} sx={{ p: 4, borderRadius: R, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
                                    <MailOutlineRoundedIcon sx={{ fontSize: 36, color: '#cbd5e1', mb: 1 }} />
                                    <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có mail template nào</Typography>
                                </Paper>
                            ) : templates.map(t => (
                                <Paper key={t.id} elevation={0} sx={{ borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.8, borderBottom: `1px solid ${BORDER}` }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                                                <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{mailTypeLabel(t.templateType)}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', bgcolor: '#f1f5f9', px: 0.8, py: 0.15, borderRadius: '4px' }}>{t.templateType}</Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>{t.subject}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <Tooltip title="Xem trước">
                                                <Button size="small" onClick={() => setTplPreview(t)}
                                                    sx={{ textTransform: 'none', fontSize: 12, color: '#64748b', borderRadius: '8px' }}>Xem</Button>
                                            </Tooltip>
                                            {canEdit && (
                                                <Tooltip title="Chỉnh sửa">
                                                    <IconButton size="small" onClick={() => openTplEdit(t)} sx={{ color: G, '&:hover': { bgcolor: alpha(G, 0.08) } }}>
                                                        <EditIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Box>
                                    {/* HTML preview */}
                                    <Box sx={{ px: 2.5, py: 2, maxHeight: 160, overflow: 'hidden', position: 'relative',
                                        '&::after': { content: '""', position: 'absolute', left: 0, right: 0, bottom: 0, height: 40, background: 'linear-gradient(transparent, #fff)' }
                                    }}>
                                        <div dangerouslySetInnerHTML={{ __html: t.content }} style={{ fontSize: 13, color: '#475569' }} />
                                    </Box>
                                </Paper>
                            ))}
                    </Box>
                </Box>
            )}

            {/* Category dialog */}
            <Dialog open={catDialog} onClose={() => setCatDialog(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: R } } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>{catEdit ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <TextField label="Loại" select value={catForm.type} onChange={e => setCatForm(f => ({ ...f, type: e.target.value }))} size="small" sx={fieldSx}>
                        {CAT_TYPES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                    </TextField>
                    <TextField label="Giá trị *" value={catForm.value} onChange={e => setCatForm(f => ({ ...f, value: e.target.value }))} size="small" fullWidth sx={fieldSx} />
                    <TextField label="Thứ tự" type="number" value={catForm.sortOrder} onChange={e => setCatForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} size="small" fullWidth sx={fieldSx} />
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setCatDialog(false)} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                    <Button variant="contained" onClick={handleSaveCat} disabled={saving}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: G, '&:hover': { bgcolor: '#065f2d' } }}>
                        {catEdit ? 'Cập nhật' : 'Thêm'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Template create/edit dialog */}
            <Dialog open={tplDialog} onClose={() => setTplDialog(false)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: R } } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>{tplEdit ? 'Sửa mail template' : 'Tạo mail template mới'}</DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    {!tplEdit && (
                        <TextField label="Loại template" select value={tplForm.templateType} onChange={e => setTplForm(f => ({ ...f, templateType: e.target.value }))} size="small" fullWidth sx={fieldSx}>
                            {MAIL_TYPES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                        </TextField>
                    )}
                    <TextField label="Tiêu đề email *" value={tplForm.subject} onChange={e => setTplForm(f => ({ ...f, subject: e.target.value }))} size="small" fullWidth sx={fieldSx} />
                    <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', mb: 0.5 }}>
                            Nội dung (HTML) * — dùng biến: {'{name}'}, {'{position}'}, {'{contact}'}, {'{phone}'}, {'{location}'}, {'{signature}'}
                        </Typography>
                        <TextField value={tplForm.content} onChange={e => setTplForm(f => ({ ...f, content: e.target.value }))}
                            size="small" fullWidth multiline rows={14}
                            sx={{ ...fieldSx, '& .MuiOutlinedInput-root': { borderRadius: '12px', fontFamily: 'monospace', fontSize: 12, '&.Mui-focused fieldset': { borderColor: G } } }} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setTplDialog(false)} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                    <Button variant="contained" onClick={handleSaveTpl} disabled={saving}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: G, '&:hover': { bgcolor: '#065f2d' } }}>
                        {tplEdit ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Template HTML preview dialog */}
            <Dialog open={tplPreview != null} onClose={() => setTplPreview(null)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: R } } }}>
                <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MailOutlineRoundedIcon sx={{ fontSize: 18, color: G }} />
                    {tplPreview && mailTypeLabel(tplPreview.templateType)} — Xem trước
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    {tplPreview && (
                        <>
                            <Box sx={{ px: 2.5, py: 1.2, bgcolor: '#f8fafc', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Typography sx={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Tiêu đề:</Typography>
                                <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 700 }}>{tplPreview.subject}</Typography>
                            </Box>
                            <iframe
                                srcDoc={tplPreview.content}
                                title="mail-preview"
                                style={{ width: '100%', height: 520, border: 'none', display: 'block' }}
                                sandbox="allow-same-origin"
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setTplPreview(null)} sx={{ textTransform: 'none', color: '#64748b' }}>Đóng</Button>
                    {canEdit && tplPreview && (
                        <Button variant="contained" onClick={() => { openTplEdit(tplPreview!); setTplPreview(null); }}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: G, '&:hover': { bgcolor: '#065f2d' } }}>
                            Chỉnh sửa
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
}
