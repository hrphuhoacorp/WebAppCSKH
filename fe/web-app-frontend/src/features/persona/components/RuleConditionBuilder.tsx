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
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded';
import FiberNewRoundedIcon from '@mui/icons-material/FiberNewRounded';
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
        case 'business_customer':
            return { type };
        case 'total_revenue':
            return { type, minRevenue: 5000000 };
        case 'total_order_count':
            return { type, minCount: 1, maxCount: null };
        case 'days_since_last_order':
            return { type, minDays: 90, maxDays: null };
        case 'days_since_first_order':
            return { type, maxDays: 30 };
    }
}

const TYPE_LABELS: Record<PersonaCondition['type'], { label: string; icon: React.ReactNode }> = {
    category_revenue_share: { label: 'Tỉ trọng nhóm hàng', icon: <PieChartRoundedIcon sx={{ fontSize: 16 }} /> },
    order_frequency: { label: 'Tần suất đơn hàng', icon: <EventRepeatRoundedIcon sx={{ fontSize: 16 }} /> },
    lunar_date_recurrence: { label: 'Chu kỳ theo lịch âm', icon: <NightsStayRoundedIcon sx={{ fontSize: 16 }} /> },
    business_customer: { label: 'Là khách hàng doanh nghiệp', icon: <BusinessRoundedIcon sx={{ fontSize: 16 }} /> },
    total_revenue: { label: 'Tổng doanh thu lũy kế', icon: <PaidRoundedIcon sx={{ fontSize: 16 }} /> },
    total_order_count: { label: 'Tổng số đơn lũy kế', icon: <ShoppingBagRoundedIcon sx={{ fontSize: 16 }} /> },
    days_since_last_order: { label: 'Số ngày từ đơn gần nhất', icon: <HourglassBottomRoundedIcon sx={{ fontSize: 16 }} /> },
    days_since_first_order: { label: 'Số ngày từ đơn đầu tiên', icon: <FiberNewRoundedIcon sx={{ fontSize: 16 }} /> },
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

                            {cond.type === 'business_customer' && (
                                <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>
                                    Khớp khách hàng đã được đánh dấu &quot;khách hàng doanh nghiệp&quot; qua tab &quot;Nạp hóa đơn doanh nghiệp&quot;
                                    (có hóa đơn VAT khớp mã đơn hàng, cột &quot;Tên đơn vị&quot; khác rỗng). Không có tham số nào để chỉnh.
                                </Typography>
                            )}

                            {cond.type === 'total_revenue' && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <TextField size="small" type="number" label="Tổng doanh thu tối thiểu (đ)" value={cond.minRevenue}
                                        onChange={e => updateAt(i, { ...cond, minRevenue: Number(e.target.value) })}
                                        sx={{ width: 240 }} />
                                    <Typography sx={{ fontSize: 11.5, color: '#94a3b8' }}>Tính trên tổng doanh thu lũy kế toàn bộ lịch sử mua của khách (Customer.TotalRevenue).</Typography>
                                </Box>
                            )}

                            {cond.type === 'total_order_count' && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                                        <TextField size="small" type="number" label="Số đơn tối thiểu (lũy kế)" value={cond.minCount}
                                            onChange={e => updateAt(i, { ...cond, minCount: Number(e.target.value) })}
                                            sx={{ width: 200 }} />
                                        <TextField size="small" type="number" label="Số đơn tối đa (tùy chọn)" value={cond.maxCount ?? ''}
                                            onChange={e => updateAt(i, { ...cond, maxCount: e.target.value ? Number(e.target.value) : null })}
                                            helperText="Để trống = không giới hạn trên" sx={{ width: 200 }} />
                                    </Box>
                                    <Typography sx={{ fontSize: 11.5, color: '#94a3b8' }}>Vd: tối thiểu 1, tối đa 1 → khách mới mua đúng 1 lần.</Typography>
                                </Box>
                            )}

                            {cond.type === 'days_since_last_order' && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                                        <TextField size="small" type="number" label="Ít nhất (ngày) chưa mua lại" value={cond.minDays}
                                            onChange={e => updateAt(i, { ...cond, minDays: Number(e.target.value) })}
                                            sx={{ width: 220 }} />
                                        <TextField size="small" type="number" label="Tối đa (ngày, tùy chọn)" value={cond.maxDays ?? ''}
                                            onChange={e => updateAt(i, { ...cond, maxDays: e.target.value ? Number(e.target.value) : null })}
                                            helperText="Để trống = không giới hạn trên" sx={{ width: 220 }} />
                                    </Box>
                                    <Typography sx={{ fontSize: 11.5, color: '#94a3b8' }}>
                                        Khớp khách có đơn gần nhất cách hiện tại trong khoảng [tối thiểu, tối đa] ngày. Vd 90-không giới hạn → &quot;lâu không quay lại&quot;; 60-180 → &quot;nguy cơ rời bỏ&quot;.
                                    </Typography>
                                </Box>
                            )}

                            {cond.type === 'days_since_first_order' && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <TextField size="small" type="number" label="Trong vòng (ngày) kể từ đơn đầu tiên" value={cond.maxDays}
                                        onChange={e => updateAt(i, { ...cond, maxDays: Number(e.target.value) })}
                                        sx={{ width: 260 }} />
                                    <Typography sx={{ fontSize: 11.5, color: '#94a3b8' }}>Khớp khách có đơn ĐẦU TIÊN trong vòng số ngày này — dùng cho tag &quot;khách mới&quot;.</Typography>
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
