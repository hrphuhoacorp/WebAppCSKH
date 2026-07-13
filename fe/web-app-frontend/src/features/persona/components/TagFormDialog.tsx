'use client';

import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, Typography } from '@mui/material';
import { GREEN, CARD_RADIUS } from '../styles';
import { PersonaTagDto } from '../api/persona.api';

const COLOR_PRESETS = ['#086839', '#0ea5e9', '#f59e0b', '#dc2626', '#8b5cf6', '#ec4899', '#10b981', '#6366f1'];

export interface TagFormValues {
    name: string;
    description: string;
    color: string;
    isActive: boolean;
    displayOrder: number;
}

export default function TagFormDialog({ open, tag, onClose, onSubmit }: {
    open: boolean;
    tag: PersonaTagDto | null;
    onClose: () => void;
    onSubmit: (values: TagFormValues) => Promise<void> | void;
}) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
            {open && <TagFormBody tag={tag} onClose={onClose} onSubmit={onSubmit} />}
        </Dialog>
    );
}

// Chỉ mount khi dialog mở — state khởi tạo trực tiếp từ props (lazy init), không cần
// useEffect để đồng bộ lại mỗi khi đổi giữa "tạo mới"/"sửa tag khác".
function TagFormBody({ tag, onClose, onSubmit }: {
    tag: PersonaTagDto | null;
    onClose: () => void;
    onSubmit: (values: TagFormValues) => Promise<void> | void;
}) {
    const [values, setValues] = useState<TagFormValues>(() => ({
        name: tag?.name ?? '',
        description: tag?.description ?? '',
        color: tag?.color ?? COLOR_PRESETS[0],
        isActive: tag?.isActive ?? true,
        displayOrder: tag?.displayOrder ?? 0,
    }));
    const [saving, setSaving] = useState(false);

    async function handleSubmit() {
        if (!values.name.trim()) return;
        setSaving(true);
        try {
            await onSubmit(values);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>{tag ? 'Sửa tag' : 'Tạo tag mới'}</DialogTitle>
            <DialogContent>
                <TextField autoFocus fullWidth size="small" label="Tên chân dung" value={values.name}
                    onChange={e => setValues(v => ({ ...v, name: e.target.value }))}
                    sx={{ mt: 1, mb: 2 }} />
                <TextField fullWidth size="small" multiline minRows={2} label="Mô tả (tùy chọn)" value={values.description}
                    onChange={e => setValues(v => ({ ...v, description: e.target.value }))}
                    sx={{ mb: 2 }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#64748b', mb: 1 }}>Màu</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {COLOR_PRESETS.map(c => (
                        <Box key={c} onClick={() => setValues(v => ({ ...v, color: c }))}
                            sx={{
                                width: 28, height: 28, borderRadius: '8px', bgcolor: c, cursor: 'pointer',
                                border: values.color === c ? '2px solid #0f172a' : '2px solid transparent',
                                boxShadow: values.color === c ? '0 0 0 2px #fff inset' : 'none',
                            }} />
                    ))}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                <Button variant="contained" disabled={saving || !values.name.trim()} onClick={handleSubmit}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' } }}>
                    {tag ? 'Lưu' : 'Tạo'}
                </Button>
            </DialogActions>
        </>
    );
}
