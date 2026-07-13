'use client';

import { useState } from 'react';
import {
    Box, Paper, Typography, Button, IconButton, Select, MenuItem, TextField, Autocomplete, Chip, Tooltip,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PieChartRoundedIcon from '@mui/icons-material/PieChartRounded';
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded';
import NightsStayRoundedIcon from '@mui/icons-material/NightsStayRounded';
import { useQuery } from '@tanstack/react-query';
import { personaApi, PersonaCondition, PersonaRuleConfig } from '../api/persona.api';
import { BORDER, GREEN } from '../styles';

const LUNAR_PRESETS = [
    { label: 'Mùng 1', day: 1 },
    { label: 'Rằm (15)', day: 15 },
    { label: 'Cuối tháng (30)', day: 30 },
];

function defaultCondition(type: PersonaCondition['type']): PersonaCondition {
    switch (type) {
        case 'category_revenue_share':
            return { type, categories: [], minSharePercent: 50, lookbackDays: 90 };
        case 'order_frequency':
            return { type, minOrderCount: 3, lookbackDays: 30, categories: null };
        case 'lunar_date_recurrence':
            return { type, lunarDays: [1, 15], windowDays: 2, minOccurrences: 3, lookbackMonths: 6 };
    }
}

const TYPE_LABELS: Record<PersonaCondition['type'], { label: string; icon: React.ReactNode }> = {
    category_revenue_share: { label: 'Tỉ trọng nhóm hàng', icon: <PieChartRoundedIcon sx={{ fontSize: 16 }} /> },
    order_frequency: { label: 'Tần suất đơn hàng', icon: <EventRepeatRoundedIcon sx={{ fontSize: 16 }} /> },
    lunar_date_recurrence: { label: 'Chu kỳ theo lịch âm', icon: <NightsStayRoundedIcon sx={{ fontSize: 16 }} /> },
};

export default function RuleConditionBuilder({ initialConfig, onChange }: {
    initialConfig: PersonaRuleConfig | null;
    onChange: (config: PersonaRuleConfig | null) => void;
}) {
    const [conditions, setConditions] = useState<PersonaCondition[]>(() => initialConfig?.conditions ?? []);
    const { data: categoryOptions = [] } = useQuery({ queryKey: ['persona-categories'], queryFn: () => personaApi.getDistinctCategories() });

    function commit(next: PersonaCondition[]) {
        setConditions(next);
        onChange(next.length === 0 ? null : { combinator: 'AND', conditions: next });
    }

    function addCondition() {
        commit([...conditions, defaultCondition('category_revenue_share')]);
    }

    function updateAt(index: number, updated: PersonaCondition) {
        commit(conditions.map((c, i) => (i === index ? updated : c)));
    }

    function removeAt(index: number) {
        commit(conditions.filter((_, i) => i !== index));
    }

    return (
        <Box>
            {conditions.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: '#94a3b8', mb: 1.5 }}>
                    Tag này chỉ gắn thủ công — chưa có luật tự động
                </Typography>
            ) : (
                conditions.map((cond, i) => (
                    <Box key={i}>
                        {i > 0 && (
                            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: GREEN, textAlign: 'center', my: 0.5 }}>VÀ</Typography>
                        )}
                        <Paper elevation={0} sx={{ p: 1.5, borderRadius: '12px', border: `1px solid ${BORDER}`, mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <Select
                                    size="small"
                                    value={cond.type}
                                    onChange={e => updateAt(i, defaultCondition(e.target.value as PersonaCondition['type']))}
                                    sx={{ fontSize: 13, minWidth: 200 }}
                                >
                                    {(Object.keys(TYPE_LABELS) as PersonaCondition['type'][]).map(t => (
                                        <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{TYPE_LABELS[t].icon} {TYPE_LABELS[t].label}</Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                                <Box sx={{ flex: 1 }} />
                                <Tooltip title="Xóa điều kiện" arrow>
                                    <IconButton size="small" onClick={() => removeAt(i)} sx={{ color: '#dc2626' }}>
                                        <DeleteOutlineRoundedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>

                            {cond.type === 'category_revenue_share' && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <Autocomplete
                                        multiple
                                        size="small"
                                        options={categoryOptions}
                                        value={cond.categories}
                                        onChange={(_, v) => updateAt(i, { ...cond, categories: v })}
                                        renderInput={params => <TextField {...params} label="Nhóm hàng (chọn 1 hoặc nhiều)" />}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                                        <TextField size="small" type="number" label="Tỉ lệ tối thiểu (%)" value={cond.minSharePercent}
                                            onChange={e => updateAt(i, { ...cond, minSharePercent: Number(e.target.value) })}
                                            sx={{ width: 180 }} />
                                        <TextField size="small" type="number" label="Số ngày nhìn lại" value={cond.lookbackDays ?? ''}
                                            onChange={e => updateAt(i, { ...cond, lookbackDays: e.target.value ? Number(e.target.value) : null })}
                                            helperText="Để trống = toàn bộ lịch sử" sx={{ width: 200 }} />
                                    </Box>
                                </Box>
                            )}

                            {cond.type === 'order_frequency' && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                                        <TextField size="small" type="number" label="Số đơn tối thiểu" value={cond.minOrderCount}
                                            onChange={e => updateAt(i, { ...cond, minOrderCount: Number(e.target.value) })}
                                            sx={{ width: 160 }} />
                                        <TextField size="small" type="number" label="Trong vòng (ngày)" value={cond.lookbackDays}
                                            onChange={e => updateAt(i, { ...cond, lookbackDays: Number(e.target.value) })}
                                            sx={{ width: 160 }} />
                                    </Box>
                                    <Autocomplete
                                        multiple
                                        size="small"
                                        options={categoryOptions}
                                        value={cond.categories ?? []}
                                        onChange={(_, v) => updateAt(i, { ...cond, categories: v.length ? v : null })}
                                        renderInput={params => <TextField {...params} label="Chỉ đếm đơn có nhóm hàng (tùy chọn)" />}
                                    />
                                </Box>
                            )}

                            {cond.type === 'lunar_date_recurrence' && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <Box>
                                        <Typography sx={{ fontSize: 12, color: '#64748b', mb: 0.5 }}>Ngày âm lịch mục tiêu</Typography>
                                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                            {LUNAR_PRESETS.map(p => {
                                                const active = cond.lunarDays.includes(p.day);
                                                return (
                                                    <Chip key={p.day} label={p.label} size="small" clickable
                                                        onClick={() => updateAt(i, {
                                                            ...cond,
                                                            lunarDays: active ? cond.lunarDays.filter(d => d !== p.day) : [...cond.lunarDays, p.day],
                                                        })}
                                                        sx={{
                                                            fontWeight: 700,
                                                            bgcolor: active ? GREEN : '#f1f5f9',
                                                            color: active ? '#fff' : '#475569',
                                                            '&:hover': { bgcolor: active ? '#065f2d' : '#e2e8f0' },
                                                        }} />
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                        <TextField size="small" type="number" label="Sai số cho phép (ngày)" value={cond.windowDays}
                                            onChange={e => updateAt(i, { ...cond, windowDays: Number(e.target.value) })}
                                            sx={{ width: 180 }} />
                                        <TextField size="small" type="number" label="Số lần tối thiểu" value={cond.minOccurrences}
                                            onChange={e => updateAt(i, { ...cond, minOccurrences: Number(e.target.value) })}
                                            sx={{ width: 160 }} />
                                        <TextField size="small" type="number" label="Trong vòng (tháng)" value={cond.lookbackMonths}
                                            onChange={e => updateAt(i, { ...cond, lookbackMonths: Number(e.target.value) })}
                                            sx={{ width: 160 }} />
                                    </Box>
                                </Box>
                            )}
                        </Paper>
                    </Box>
                ))
            )}

            <Button size="small" startIcon={<AddRoundedIcon />} onClick={addCondition}
                sx={{ textTransform: 'none', fontWeight: 700, color: GREEN, mt: 0.5 }}>
                Thêm điều kiện
            </Button>
        </Box>
    );
}
