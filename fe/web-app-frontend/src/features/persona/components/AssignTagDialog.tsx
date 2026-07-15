'use client';

import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Autocomplete, Box, Chip } from '@mui/material';
import { GREEN, CARD_RADIUS } from '../styles';
import { PersonaTagDto } from '../api/persona.api';

export default function AssignTagDialog({ open, customerName, tags, existingTagIds, onClose, onSubmit }: {
    open: boolean;
    customerName: string;
    tags: PersonaTagDto[];
    existingTagIds: number[];
    onClose: () => void;
    onSubmit: (tagId: number, note?: string) => Promise<void> | void;
}) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
            {open && (
                <AssignTagDialogBody
                    customerName={customerName}
                    tags={tags}
                    existingTagIds={existingTagIds}
                    onClose={onClose}
                    onSubmit={onSubmit}
                />
            )}
        </Dialog>
    );
}

// Chỉ mount khi dialog mở — state khởi tạo mới hoàn toàn mỗi lần, tránh giữ lại tag/ghi chú
// đã chọn dở của khách trước đó khi bấm Hủy rồi mở lại cho khách khác.
function AssignTagDialogBody({ customerName, tags, existingTagIds, onClose, onSubmit }: {
    customerName: string;
    tags: PersonaTagDto[];
    existingTagIds: number[];
    onClose: () => void;
    onSubmit: (tagId: number, note?: string) => Promise<void> | void;
}) {
    const [selectedTag, setSelectedTag] = useState<PersonaTagDto | null>(null);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const options = tags.filter(t => t.isActive && !existingTagIds.includes(t.id));

    async function handleSubmit() {
        if (!selectedTag) return;
        setSaving(true);
        try {
            await onSubmit(selectedTag.id, note.trim() || undefined);
            setSelectedTag(null);
            setNote('');
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Gắn tag cho {customerName}</DialogTitle>
            <DialogContent>
                <Autocomplete
                    options={options}
                    getOptionLabel={t => t.name}
                    value={selectedTag}
                    onChange={(_, v) => setSelectedTag(v)}
                    renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: option.color, flexShrink: 0 }} />
                            {option.name}
                        </Box>
                    )}
                    renderInput={params => <TextField {...params} label="Chọn tag" size="small" autoFocus sx={{ mt: 1 }} />}
                    sx={{ mb: 2 }}
                    noOptionsText="Không còn tag nào để gắn thêm"
                />
                {selectedTag && (
                    <Box sx={{ mb: 2 }}>
                        <Chip size="small" label={selectedTag.name}
                            sx={{ bgcolor: selectedTag.color, color: '#fff', fontWeight: 700 }} />
                    </Box>
                )}
                <TextField fullWidth size="small" multiline minRows={2} label="Ghi chú (tùy chọn)" value={note}
                    onChange={e => setNote(e.target.value)} />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                <Button variant="contained" disabled={saving || !selectedTag} onClick={handleSubmit}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' } }}>
                    Gắn tag
                </Button>
            </DialogActions>
        </>
    );
}
