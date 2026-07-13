'use client';

import { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem,
    InputLabel, FormControl, Chip, Box, Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { personaApi, PersonaCareScheduleDto, PersonaOccasionType } from '../api/persona.api';
import { CARD_RADIUS, GREEN } from '../styles';

const OCCASION_OPTIONS: { value: PersonaOccasionType; label: string }[] = [
    { value: 'lunar_recurring', label: 'Lặp lại theo lịch âm' },
    { value: 'solar_recurring', label: 'Lặp lại theo lịch dương' },
    { value: 'customer_birthday', label: 'Sinh nhật khách hàng' },
];

const LUNAR_PRESETS = [{ label: 'Mùng 1', day: 1 }, { label: 'Rằm (15)', day: 15 }, { label: 'Cuối tháng (30)', day: 30 }];

export interface ScheduleFormValues {
    tagId: number | null;
    name: string;
    occasionType: PersonaOccasionType;
    lunarDay: number | null;
    lunarMonth: number | null;
    solarMonth: number | null;
    solarDay: number | null;
    leadDays: number;
    isActive: boolean;
}

export default function ScheduleFormDialog({ open, schedule, onClose, onSubmit }: {
    open: boolean;
    schedule: PersonaCareScheduleDto | null;
    onClose: () => void;
    onSubmit: (values: ScheduleFormValues) => Promise<void> | void;
}) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
            {open && <ScheduleFormBody schedule={schedule} onClose={onClose} onSubmit={onSubmit} />}
        </Dialog>
    );
}

function ScheduleFormBody({ schedule, onClose, onSubmit }: {
    schedule: PersonaCareScheduleDto | null;
    onClose: () => void;
    onSubmit: (values: ScheduleFormValues) => Promise<void> | void;
}) {
    const [values, setValues] = useState<ScheduleFormValues>(() => ({
        tagId: schedule?.tagId ?? null,
        name: schedule?.name ?? '',
        occasionType: schedule?.occasionType ?? 'lunar_recurring',
        lunarDay: schedule?.lunarDay ?? 1,
        lunarMonth: schedule?.lunarMonth ?? null,
        solarMonth: schedule?.solarMonth ?? 3,
        solarDay: schedule?.solarDay ?? 8,
        leadDays: schedule?.leadDays ?? 3,
        isActive: schedule?.isActive ?? true,
    }));
    const [saving, setSaving] = useState(false);

    const { data: tags = [] } = useQuery({ queryKey: ['persona-tags'], queryFn: personaApi.getTags });

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
            <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>{schedule ? 'Sửa cấu hình nhắc lịch' : 'Tạo cấu hình nhắc lịch'}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField autoFocus size="small" fullWidth label="Tên dịp" value={values.name}
                    onChange={e => setValues(v => ({ ...v, name: e.target.value }))} />

                <FormControl size="small" fullWidth>
                    <InputLabel>Loại dịp</InputLabel>
                    <Select label="Loại dịp" value={values.occasionType}
                        onChange={e => setValues(v => ({ ...v, occasionType: e.target.value as PersonaOccasionType }))}>
                        {OCCASION_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                </FormControl>

                {values.occasionType === 'lunar_recurring' && (
                    <Box>
                        <Typography sx={{ fontSize: 12, color: '#64748b', mb: 0.5 }}>Ngày âm lịch</Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, mb: 1 }}>
                            {LUNAR_PRESETS.map(p => (
                                <Chip key={p.day} label={p.label} size="small" clickable
                                    onClick={() => setValues(v => ({ ...v, lunarDay: p.day }))}
                                    sx={{
                                        fontWeight: 700,
                                        bgcolor: values.lunarDay === p.day ? GREEN : '#f1f5f9',
                                        color: values.lunarDay === p.day ? '#fff' : '#475569',
                                    }} />
                            ))}
                        </Box>
                        <TextField size="small" type="number" label="Tháng âm lịch (để trống = mọi tháng)" value={values.lunarMonth ?? ''}
                            onChange={e => setValues(v => ({ ...v, lunarMonth: e.target.value ? Number(e.target.value) : null }))}
                            fullWidth />
                    </Box>
                )}

                {values.occasionType === 'solar_recurring' && (
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <TextField size="small" type="number" label="Tháng" value={values.solarMonth ?? ''}
                            onChange={e => setValues(v => ({ ...v, solarMonth: Number(e.target.value) }))} sx={{ width: 120 }} />
                        <TextField size="small" type="number" label="Ngày" value={values.solarDay ?? ''}
                            onChange={e => setValues(v => ({ ...v, solarDay: Number(e.target.value) }))} sx={{ width: 120 }} />
                    </Box>
                )}

                <FormControl size="small" fullWidth>
                    <InputLabel>Áp dụng cho tag (tùy chọn)</InputLabel>
                    <Select label="Áp dụng cho tag (tùy chọn)" value={values.tagId ?? ''}
                        onChange={e => setValues(v => ({ ...v, tagId: e.target.value ? Number(e.target.value) : null }))}>
                        <MenuItem value="">Toàn bộ khách hàng</MenuItem>
                        {tags.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                    </Select>
                </FormControl>

                <TextField size="small" type="number" label="Nhắc trước (ngày)" value={values.leadDays}
                    onChange={e => setValues(v => ({ ...v, leadDays: Number(e.target.value) }))} fullWidth />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                <Button variant="contained" disabled={saving || !values.name.trim()} onClick={handleSubmit}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' } }}>
                    {schedule ? 'Lưu' : 'Tạo'}
                </Button>
            </DialogActions>
        </>
    );
}
