'use client';

import { useState } from "react";
import {
    Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton,
    MenuItem, Slider, Switch, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { Move, RefreshCw, Trash2, X, Eraser, MousePointerClick, AlignLeft, AlignCenter, AlignRight, Plus, GripVertical } from "lucide-react";
import { PromoCard, PromoPrintSettings } from "../types";
import {
    PromoCardLayout, PromoElementKey, ElementBox, PromoTemplateKind, FieldConfig, PriceSlotConfig,
    BadgePreset, DEFAULT_LAYOUT, PROMO_ELEMENT_LABELS, FLOW_KEYS, PRICE_SLOT_KEYS, ResolvedKind, BUILTIN_KIND_IDS,
    NEW_KIND_DEFAULT_FIELD_CONFIG, resolveFieldConfigForKind, resolveLayoutForKind, buildSampleCard,
    mmToPct, pctToMm,
} from "../promoLayout";

function moveItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
    const next = [...arr];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
}
import { PromoTemplateKindUpsertPayload } from "../api/promoTemplateLayout.api";
import { GREEN, CARD_RADIUS } from "../styles";
import PromoCardPrint from "./PromoCardPrint";

const MM_TO_PX = 96 / 25.4;
const EDITOR_MAX_WIDTH_PX = 560;
const CARD_WIDTH_MM = 210;
const CARD_HEIGHT_MM = 99;
const round1 = (n: number) => Math.round(n * 10) / 10;

const SAMPLE_CARD_BY_KIND: Record<string, PromoCard> = {
    'hotdeal-1': { id: 'sample-layout-editor', name: 'Táo Envy New Zealand', kindId: 'hotdeal-1', price1: 180000, price1Unit: 'kg', price2: 149000, price2Unit: 'kg', date: 'Áp dụng từ 10h-22h Ngày 21/5' },
    'hotdeal-2': { id: 'sample-layout-editor', name: 'Táo Envy New Zealand', kindId: 'hotdeal-2', price1: 180000, price1Unit: 'kg', price2: 149000, price2Unit: 'kg', price3: 129000, price3Unit: 'kg', note: 'Khi mua từ 2kg', date: 'Áp dụng từ 10h-22h Ngày 21/5' },
    'sale-1': { id: 'sample-layout-editor', name: 'Táo Envy New Zealand', kindId: 'sale-1', price1: 180000, price1Unit: 'kg', price2: 149000, price2Unit: 'kg', date: 'Áp dụng từ 10h-22h Ngày 21/5' },
    'sale-2': { id: 'sample-layout-editor', name: 'Táo Envy New Zealand', kindId: 'sale-2', price1: 180000, price1Unit: 'kg', price2: 149000, price2Unit: 'kg', price3: 129000, price3Unit: 'kg', note: 'Khi mua từ 2kg', date: 'Áp dụng từ 10h-22h Ngày 21/5' },
};

function slugify(text: string): string {
    return text
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'loai-moi';
}

function uniqueSlug(base: string, existingIds: string[]): string {
    if (!existingIds.includes(base)) return base;
    let i = 2;
    while (existingIds.includes(`${base}-${i}`)) i++;
    return `${base}-${i}`;
}

const PRICE_STYLE_LABEL: Record<PriceSlotConfig['style'], string> = {
    strike: 'Gạch ngang',
    highlight: 'Nổi bật đỏ',
    plain: 'Thường',
};

interface Props {
    open: boolean;
    onClose: () => void;
    settings: PromoPrintSettings;
    mode: 'template' | 'card';
    availableKinds: { id: string; label: string }[];
    kindsMap: Record<string, ResolvedKind>;
    onSaveTemplateKind: (kind: PromoTemplateKind, payload: PromoTemplateKindUpsertPayload) => Promise<void> | void;
    defaultKind?: PromoTemplateKind;
    card?: PromoCard;
    onSaveCardOverride?: (override: PromoCardLayout | undefined) => void;
    onDeleteKind?: (kindId: string) => Promise<void> | void;
}

export default function PromoLayoutEditor({
    open, onClose, settings, mode, availableKinds, kindsMap, onSaveTemplateKind,
    defaultKind, card, onSaveCardOverride, onDeleteKind,
}: Props) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const kind: PromoTemplateKind = mode === 'card' && card ? card.kindId : (defaultKind ?? 'hotdeal-2');
    const [selectedKind, setSelectedKind] = useState<PromoTemplateKind>(kind);
    const effectiveKind = mode === 'template' ? selectedKind : kind;

    const [pendingKinds, setPendingKinds] = useState<{ id: string; label: string }[]>([]);
    const [creatingKind, setCreatingKind] = useState(false);
    const [newKindName, setNewKindName] = useState('');
    const kindOptions = [...availableKinds, ...pendingKinds.filter(p => !availableKinds.some(a => a.id === p.id))];

    const [layout, setLayout] = useState<PromoCardLayout>(() => {
        if (mode === 'card' && card?.layoutOverride) return card.layoutOverride;
        return resolveLayoutForKind(effectiveKind, kindsMap);
    });
    const [fieldConfig, setFieldConfig] = useState<FieldConfig>(() => resolveFieldConfigForKind(effectiveKind, kindsMap));
    const [saveScope, setSaveScope] = useState<'card' | 'kind'>('card');
    const [saving, setSaving] = useState(false);
    const [deletingKind, setDeletingKind] = useState(false);
    const [selectedKey, setSelectedKey] = useState<PromoElementKey | null>(null);
    const [dragElemIdx, setDragElemIdx] = useState<number | null>(null);
    const [dragElemOverIdx, setDragElemOverIdx] = useState<number | null>(null);
    const [leftTab, setLeftTab] = useState(0);

    // Badge preset states
    const [creatingBadgePreset, setCreatingBadgePreset] = useState(false);
    const [badgePresetName, setBadgePresetName] = useState('');

    const isBuiltinKind = (BUILTIN_KIND_IDS as readonly string[]).includes(selectedKind);

    const handleKindChange = (nextKind: PromoTemplateKind) => {
        setSelectedKind(nextKind);
        setLayout(resolveLayoutForKind(nextKind, kindsMap));
        setFieldConfig(resolveFieldConfigForKind(nextKind, kindsMap));
        setSelectedKey(null);
    };

    const handleCreateKind = () => {
        if (!newKindName.trim()) return;
        const existingIds = kindOptions.map(k => k.id);
        const id = uniqueSlug(slugify(newKindName.trim()), existingIds);
        setPendingKinds(prev => [...prev, { id, label: newKindName.trim() }]);
        setSelectedKind(id);
        setLayout(DEFAULT_LAYOUT);
        setFieldConfig({ ...NEW_KIND_DEFAULT_FIELD_CONFIG, priceSlots: { ...NEW_KIND_DEFAULT_FIELD_CONFIG.priceSlots } });
        setSelectedKey(null);
        setCreatingKind(false);
        setNewKindName('');
    };

    const handleDeleteKind = async () => {
        if (isBuiltinKind || !onDeleteKind || deletingKind) return;
        setDeletingKind(true);
        try {
            await onDeleteKind(selectedKind);
            const fallback = kindOptions.find(k => k.id !== selectedKind);
            if (fallback) handleKindChange(fallback.id);
            else onClose();
        } finally {
            setDeletingKind(false);
        }
    };

    const kindLabel = (id: string) => kindOptions.find(k => k.id === id)?.label ?? id;

    const applyBadgePreset = (preset: BadgePreset) => {
        setFieldConfig(prev => ({
            ...prev,
            badge: preset.shape,
            badgeLabel: preset.label,
            badgeBorderColor: preset.borderColor,
            badgeFillColor: preset.fillColor,
            badgeTextColor: preset.textColor,
        }));
    };

    const deleteBadgePreset = (id: string) => {
        setFieldConfig(prev => ({
            ...prev,
            badgePresets: (prev.badgePresets ?? []).filter(p => p.id !== id),
        }));
    };

    const handleSaveBadgePreset = () => {
        if (!badgePresetName.trim() || fieldConfig.badge === 'none') return;
        const newPreset: BadgePreset = {
            id: Date.now().toString(),
            name: badgePresetName.trim(),
            shape: fieldConfig.badge as 'hotdeal' | 'sale',
            label: fieldConfig.badgeLabel,
            borderColor: fieldConfig.badgeBorderColor,
            fillColor: fieldConfig.badgeFillColor,
            textColor: fieldConfig.badgeTextColor,
        };
        setFieldConfig(prev => ({
            ...prev,
            badgePresets: [...(prev.badgePresets ?? []), newPreset],
        }));
        setBadgePresetName('');
        setCreatingBadgePreset(false);
    };

    const previewCard = mode === 'card' && card
        ? card
        : { ...buildSampleCard(effectiveKind, fieldConfig), ...(SAMPLE_CARD_BY_KIND[effectiveKind] ?? {}) };

    const naturalWidthPx = CARD_WIDTH_MM * MM_TO_PX;
    const naturalHeightPx = CARD_HEIGHT_MM * MM_TO_PX;
    const displayScale = Math.min(1, EDITOR_MAX_WIDTH_PX / naturalWidthPx);

    const handleElementDrag = (key: PromoElementKey, box: Pick<ElementBox, 'xPct' | 'yPct' | 'align'>) => {
        setLayout(prev => ({ ...prev, [key]: { ...prev[key], ...box } }));
    };
    const handleElementResize = (key: PromoElementKey, box: Pick<ElementBox, 'widthPct' | 'heightPct' | 'auto'>) => {
        setLayout(prev => ({ ...prev, [key]: { ...prev[key], ...box } }));
    };
    const handleResetDefault = () => setLayout(DEFAULT_LAYOUT);

    const togglePriceSlot = (key: typeof PRICE_SLOT_KEYS[number], enabled: boolean) => {
        setFieldConfig(prev => {
            const priceSlots = { ...prev.priceSlots };
            if (enabled) {
                const defaultSizeTier = key === 'price1' || key === 'price2' ? 'lg' : 'sm';
                priceSlots[key] = priceSlots[key] ?? { label: PROMO_ELEMENT_LABELS[key], style: 'highlight', sizeTier: defaultSizeTier };
            } else {
                delete priceSlots[key];
            }
            return { ...prev, priceSlots };
        });
    };
    const updatePriceSlot = (key: typeof PRICE_SLOT_KEYS[number], patch: Partial<PriceSlotConfig>) => {
        setFieldConfig(prev => ({
            ...prev,
            priceSlots: { ...prev.priceSlots, [key]: { ...prev.priceSlots[key]!, ...patch } },
        }));
    };

    const updateSelectedBox = (patch: Partial<ElementBox>) => {
        if (!selectedKey) return;
        setLayout(prev => ({ ...prev, [selectedKey]: { ...prev[selectedKey], ...patch } }));
    };
    const selectedBox = selectedKey ? layout[selectedKey] : null;
    const isStripeSelected = selectedKey === 'stripe';
    const isFlowSelected = !!selectedKey && FLOW_KEYS.includes(selectedKey);
    const isPriceSlot = !!selectedKey && PRICE_SLOT_KEYS.includes(selectedKey as typeof PRICE_SLOT_KEYS[number]);
    const selectedSlotConfig = isPriceSlot && selectedKey
        ? fieldConfig.priceSlots[selectedKey as typeof PRICE_SLOT_KEYS[number]]
        : null;
    const currentFontSizeMm: number | undefined = isPriceSlot
        ? selectedSlotConfig?.fontSizeMm
        : selectedBox?.fontSizeMm;
    const selectedLabel = selectedKey
        ? (fieldConfig.priceSlots[selectedKey as typeof PRICE_SLOT_KEYS[number]]?.label ?? PROMO_ELEMENT_LABELS[selectedKey])
        : '';

    const handleXChange = (mm: number) => updateSelectedBox({ xPct: mmToPct(mm, 'x') });
    const handleYChange = (mm: number) => updateSelectedBox({ yPct: mmToPct(mm, 'y') });
    const handleWidthChange = (mm: number) => updateSelectedBox({ widthPct: mmToPct(mm, 'x'), auto: false });
    const handleHeightChange = (mm: number) => updateSelectedBox({ heightPct: mmToPct(mm, 'y'), auto: false });
    const handleAutoToggle = (auto: boolean) => updateSelectedBox({ auto });
    const handleAlignChange = (align: 'left' | 'center' | 'right') => updateSelectedBox({ align });
    const handleFontSizeChange = (mm: number | undefined) => {
        if (!selectedKey) return;
        if (isPriceSlot) {
            updatePriceSlot(selectedKey as typeof PRICE_SLOT_KEYS[number], { fontSizeMm: mm });
        } else {
            updateSelectedBox({ fontSizeMm: mm });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (mode === 'card' && saveScope === 'card' && onSaveCardOverride) {
                onSaveCardOverride(layout);
            } else {
                await onSaveTemplateKind(effectiveKind, {
                    displayName: kindLabel(effectiveKind),
                    badge: fieldConfig.badge,
                    fieldConfig,
                    layout,
                });
            }
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleClearOverride = () => {
        onSaveCardOverride?.(undefined);
        onClose();
    };

    // ── Reusable mini-components defined inside render ──────────────────────
    const SL = ({ children }: { children: React.ReactNode }) => (
        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1 }}>
            {children}
        </Typography>
    );

    const ColorPicker = ({ label, value, defaultValue, onChange }: {
        label: string; value?: string; defaultValue: string; onChange: (v: string | undefined) => void;
    }) => (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>{label}</Typography>
                {!value && (
                    <Typography sx={{ fontSize: 9.5, color: '#94a3b8', bgcolor: '#f1f5f9', px: 0.75, py: 0.15, borderRadius: '4px', lineHeight: 1.6 }}>
                        mặc định
                    </Typography>
                )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input type="color" value={value ?? defaultValue} onChange={(e) => onChange(e.target.value)}
                    style={{ width: 34, height: 30, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 2, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 11, color: value ? '#94a3b8' : '#cbd5e1', fontFamily: 'monospace', flex: 1 }}>
                    {value ?? defaultValue}
                </Typography>
                {value && (
                    <Button size="small" onClick={() => onChange(undefined)}
                        sx={{ minWidth: 0, p: '2px 6px', fontSize: 10, color: '#cbd5e1', textTransform: 'none', '&:hover': { color: '#64748b' } }}>
                        đặt lại
                    </Button>
                )}
            </Box>
        </Box>
    );

    const tabSx = { minHeight: 36, fontSize: 11.5, fontWeight: 700, textTransform: 'none' as const, py: 0.5 };

    return (
        <>
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            fullScreen={fullScreen}
            slotProps={{ paper: { sx: { borderRadius: fullScreen ? 0 : CARD_RADIUS, maxHeight: fullScreen ? '100%' : '92vh', height: '92vh' } } }}
        >
            {/* ── Header ── */}
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, px: 3, borderBottom: '1px solid #f1f5f9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Move size={16} color={GREEN} />
                    <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>
                        {mode === 'template' ? 'Cấu hình mẫu theo loại bảng giá' : `Tuỳ chỉnh layout — ${card?.name ?? ''}`}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small"><X size={18} /></IconButton>
            </DialogTitle>

            {/* ── Body: 2 columns ── */}
            <DialogContent sx={{ display: 'flex', p: 0, overflow: 'hidden', flex: 1 }}>

                {/* ─ Cột trái — chỉ hiện ở template mode ─ */}
                {mode === 'template' && (
                    <Box sx={{ width: 360, flexShrink: 0, borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* Kind selector — pinned, không scroll */}
                        <Box sx={{ px: 2, pt: 1.75, pb: 1.5, borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                                <TextField
                                    select size="small" sx={{ flex: 1 }}
                                    value={selectedKind}
                                    onChange={(e) => handleKindChange(e.target.value)}
                                >
                                    {kindOptions.map(k => (
                                        <MenuItem key={k.id} value={k.id}>{k.label}</MenuItem>
                                    ))}
                                </TextField>
                                {!isBuiltinKind && onDeleteKind && (
                                    <IconButton
                                        size="small" disabled={deletingKind}
                                        onClick={handleDeleteKind}
                                        title="Xóa loại bảng giá này"
                                        sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fff1f2' }, flexShrink: 0 }}
                                    >
                                        <Trash2 size={15} />
                                    </IconButton>
                                )}
                            </Box>
                            <Button onClick={() => setCreatingKind(true)} startIcon={<Plus size={12} />} size="small"
                                sx={{ textTransform: 'none', fontWeight: 700, color: GREEN, px: 0, mt: 0.75, fontSize: 11.5 }}>
                                Tạo loại mới
                            </Button>
                        </Box>

                        {/* Tabs — pinned */}
                        <Tabs
                            value={leftTab}
                            onChange={(_, v) => setLeftTab(v)}
                            variant="fullWidth"
                            sx={{
                                minHeight: 36, borderBottom: '1px solid #f1f5f9', flexShrink: 0,
                                '& .MuiTab-root.Mui-selected': { color: GREEN },
                                '& .MuiTab-root': { color: '#64748b' },
                                '& .MuiTabs-indicator': { bgcolor: GREEN, height: 2 },
                            }}
                        >
                            <Tab label="Dữ liệu" sx={tabSx} />
                            <Tab label="Nhãn góc" sx={tabSx} />
                            <Tab label="Thứ tự" sx={tabSx} />
                        </Tabs>

                        {/* Tab content — scrollable */}
                        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>

                            {/* ── Tab 0: Trường dữ liệu ── */}
                            {leftTab === 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                    {PRICE_SLOT_KEYS.map((key) => {
                                        const slot = fieldConfig.priceSlots[key];
                                        return (
                                            <Box key={key} sx={{
                                                border: '1px solid', borderRadius: '8px', p: 1.25,
                                                borderColor: slot ? '#e2e8f0' : '#f1f5f9',
                                                bgcolor: slot ? '#fff' : '#fafafa',
                                            }}>
                                                <FormControlLabel sx={{ ml: 0, mb: slot ? 0.75 : 0 }}
                                                    control={<Checkbox size="small" checked={!!slot} onChange={(e) => togglePriceSlot(key, e.target.checked)} />}
                                                    label={<Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{PROMO_ELEMENT_LABELS[key]}</Typography>}
                                                />
                                                {slot && (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                                        <TextField label="Nhãn" size="small" value={slot.label}
                                                            onChange={(e) => updatePriceSlot(key, { label: e.target.value })} />
                                                        <Box sx={{ display: 'flex', gap: 0.75 }}>
                                                            <TextField select label="Kiểu" size="small" fullWidth value={slot.style}
                                                                onChange={(e) => updatePriceSlot(key, { style: e.target.value as PriceSlotConfig['style'] })}>
                                                                {(Object.keys(PRICE_STYLE_LABEL) as PriceSlotConfig['style'][]).map(s => (
                                                                    <MenuItem key={s} value={s}>{PRICE_STYLE_LABEL[s]}</MenuItem>
                                                                ))}
                                                            </TextField>
                                                            <TextField select label="Cỡ" size="small" fullWidth value={slot.sizeTier}
                                                                onChange={(e) => updatePriceSlot(key, { sizeTier: e.target.value as PriceSlotConfig['sizeTier'] })}>
                                                                <MenuItem value="lg">Lớn</MenuItem>
                                                                <MenuItem value="md">Vừa</MenuItem>
                                                                <MenuItem value="sm">Nhỏ</MenuItem>
                                                            </TextField>
                                                        </Box>
                                                        {slot.fontSizeMm !== undefined && (
                                                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                                                                <TextField
                                                                    label="Cỡ chữ (mm)" type="number" size="small" sx={{ flex: 1 }}
                                                                    value={slot.fontSizeMm}
                                                                    onChange={(e) => updatePriceSlot(key, { fontSizeMm: Number(e.target.value) || undefined })}
                                                                    slotProps={{ htmlInput: { min: 3, max: 60, step: 0.5 } }}
                                                                />
                                                                <Button size="small" onClick={() => updatePriceSlot(key, { fontSizeMm: undefined })}
                                                                    sx={{ fontSize: 10, color: '#94a3b8', textTransform: 'none', p: '2px 6px', flexShrink: 0 }}>
                                                                    reset
                                                                </Button>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                )}
                                            </Box>
                                        );
                                    })}

                                    <Box sx={{ display: 'flex', gap: 2, pt: 0.25 }}>
                                        <FormControlLabel sx={{ ml: 0 }}
                                            control={<Checkbox size="small" checked={fieldConfig.noteEnabled} onChange={(e) => setFieldConfig(prev => ({ ...prev, noteEnabled: e.target.checked }))} />}
                                            label={<Typography sx={{ fontSize: 12, fontWeight: 700 }}>Ghi chú</Typography>}
                                        />
                                        <FormControlLabel sx={{ ml: 0 }}
                                            control={<Checkbox size="small" checked={fieldConfig.dateEnabled} onChange={(e) => setFieldConfig(prev => ({ ...prev, dateEnabled: e.target.checked }))} />}
                                            label={<Typography sx={{ fontSize: 12, fontWeight: 700 }}>Ngày áp dụng</Typography>}
                                        />
                                    </Box>
                                </Box>
                            )}

                            {/* ── Tab 1: Nhãn góc ── */}
                            {leftTab === 1 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                    {/* Kiểu nhãn: 3 pills ngang */}
                                    <Box>
                                        <SL>Kiểu nhãn</SL>
                                        <Box sx={{ display: 'flex', gap: 0.75 }}>
                                            {([
                                                { value: 'hotdeal', label: '★ Hot Deal' },
                                                { value: 'sale', label: '✦ Sale' },
                                                { value: 'none', label: '✕ Không có' },
                                            ] as const).map((b) => {
                                                const selected = fieldConfig.badge === b.value;
                                                return (
                                                    <Box key={b.value}
                                                        onClick={() => setFieldConfig(prev => ({ ...prev, badge: b.value }))}
                                                        sx={{
                                                            flex: 1, textAlign: 'center', py: 0.875, px: 0.5,
                                                            borderRadius: '8px', cursor: 'pointer', userSelect: 'none',
                                                            border: '1px solid', fontSize: 11.5, fontWeight: 700,
                                                            borderColor: selected ? GREEN : '#e2e8f0',
                                                            bgcolor: selected ? 'rgba(8,104,57,0.07)' : '#fff',
                                                            color: selected ? GREEN : '#64748b',
                                                            transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        {b.label}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </Box>

                                    {fieldConfig.badge !== 'none' && (
                                        <>
                                            {/* Màu sắc */}
                                            <Box>
                                                <SL>Màu sắc</SL>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                    <ColorPicker
                                                        label={fieldConfig.badge === 'hotdeal' ? 'Màu viền' : 'Màu ngôi sao'}
                                                        value={fieldConfig.badgeBorderColor}
                                                        defaultValue="#e60008"
                                                        onChange={(v) => setFieldConfig(prev => ({ ...prev, badgeBorderColor: v }))}
                                                    />
                                                    {fieldConfig.badge === 'hotdeal' && (
                                                        <ColorPicker
                                                            label="Màu nền"
                                                            value={fieldConfig.badgeFillColor}
                                                            defaultValue="#ffe21f"
                                                            onChange={(v) => setFieldConfig(prev => ({ ...prev, badgeFillColor: v }))}
                                                        />
                                                    )}
                                                    <ColorPicker
                                                        label="Màu chữ"
                                                        value={fieldConfig.badgeTextColor}
                                                        defaultValue={fieldConfig.badge === 'hotdeal' ? '#e60008' : '#ffffff'}
                                                        onChange={(v) => setFieldConfig(prev => ({ ...prev, badgeTextColor: v }))}
                                                    />
                                                </Box>
                                            </Box>

                                            {/* Nội dung chữ */}
                                            <Box>
                                                <SL>Nội dung chữ</SL>
                                                <TextField
                                                    label="Chữ nhãn" size="small" fullWidth multiline maxRows={3}
                                                    placeholder={fieldConfig.badge === 'hotdeal' ? 'HOT\nDEAL' : 'SALE'}
                                                    value={fieldConfig.badgeLabel ?? ''}
                                                    onChange={(e) => setFieldConfig(prev => ({ ...prev, badgeLabel: e.target.value || undefined }))}
                                                    helperText="Shift+Enter để xuống dòng"
                                                    slotProps={{ input: { style: { fontFamily: 'monospace', fontSize: 13 } } }}
                                                />
                                            </Box>

                                            {/* Nhãn đã lưu */}
                                            {(fieldConfig.badgePresets ?? []).length > 0 && (
                                                <Box>
                                                    <SL>Nhãn đã lưu</SL>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                                        {(fieldConfig.badgePresets ?? []).map(p => (
                                                            <Box key={p.id}
                                                                onClick={() => applyBadgePreset(p)}
                                                                sx={{
                                                                    display: 'flex', alignItems: 'center', gap: 0.75,
                                                                    px: 1.25, py: 0.5, border: '1px solid #e2e8f0',
                                                                    borderRadius: '20px', cursor: 'pointer', bgcolor: '#fff',
                                                                    transition: 'all 0.15s',
                                                                    '&:hover': { borderColor: GREEN, bgcolor: 'rgba(8,104,57,0.04)' },
                                                                }}
                                                            >
                                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, bgcolor: p.borderColor ?? '#e60008' }} />
                                                                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#1e293b' }}>{p.name}</Typography>
                                                                <IconButton size="small"
                                                                    onClick={(e) => { e.stopPropagation(); deleteBadgePreset(p.id); }}
                                                                    sx={{ p: 0, color: '#cbd5e1', '&:hover': { color: '#ef4444' } }}
                                                                >
                                                                    <X size={10} />
                                                                </IconButton>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                </Box>
                                            )}

                                            {/* Lưu thành nhãn */}
                                            {creatingBadgePreset ? (
                                                <Box sx={{ display: 'flex', gap: 0.75 }}>
                                                    <TextField label="Tên nhãn" size="small" autoFocus sx={{ flex: 1 }}
                                                        value={badgePresetName}
                                                        onChange={(e) => setBadgePresetName(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveBadgePreset()}
                                                    />
                                                    <Button onClick={handleSaveBadgePreset} variant="contained" size="small"
                                                        sx={{ bgcolor: GREEN, textTransform: 'none', fontWeight: 700, boxShadow: 'none', flexShrink: 0 }}>
                                                        Lưu
                                                    </Button>
                                                    <Button onClick={() => { setCreatingBadgePreset(false); setBadgePresetName(''); }} size="small"
                                                        sx={{ textTransform: 'none', color: '#64748b', minWidth: 0, px: 1, flexShrink: 0 }}>
                                                        ✕
                                                    </Button>
                                                </Box>
                                            ) : (
                                                <Button onClick={() => setCreatingBadgePreset(true)} startIcon={<Plus size={12} />} size="small"
                                                    sx={{ textTransform: 'none', fontWeight: 700, color: GREEN, fontSize: 11.5, alignSelf: 'flex-start', px: 0 }}>
                                                    Lưu thành nhãn
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </Box>
                            )}

                            {/* ── Tab 2: Thứ tự hiển thị ── */}
                            {leftTab === 2 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    <Typography sx={{ fontSize: 11, color: '#94a3b8', mb: 0.5 }}>
                                        Kéo để thay đổi thứ tự xuất hiện trên thẻ.
                                    </Typography>
                                    {(fieldConfig.elementOrder ?? FLOW_KEYS).map((key, idx) => {
                                        const isPrice = PRICE_SLOT_KEYS.includes(key as typeof PRICE_SLOT_KEYS[number]);
                                        const isActive = isPrice
                                            ? !!fieldConfig.priceSlots[key as typeof PRICE_SLOT_KEYS[number]]
                                            : key === 'note' ? fieldConfig.noteEnabled
                                            : key === 'date' ? fieldConfig.dateEnabled
                                            : true;
                                        const label = isPrice
                                            ? (fieldConfig.priceSlots[key as typeof PRICE_SLOT_KEYS[number]]?.label ?? PROMO_ELEMENT_LABELS[key])
                                            : PROMO_ELEMENT_LABELS[key];
                                        const isDragging = dragElemIdx === idx;
                                        const isDragOver = dragElemOverIdx === idx && dragElemIdx !== idx;
                                        return (
                                            <Box
                                                key={key} draggable
                                                onDragStart={() => setDragElemIdx(idx)}
                                                onDragOver={(e) => { e.preventDefault(); setDragElemOverIdx(idx); }}
                                                onDrop={() => {
                                                    if (dragElemIdx !== null && dragElemIdx !== idx) {
                                                        setFieldConfig(prev => ({
                                                            ...prev,
                                                            elementOrder: moveItem(prev.elementOrder ?? FLOW_KEYS, dragElemIdx, idx),
                                                        }));
                                                    }
                                                    setDragElemIdx(null); setDragElemOverIdx(null);
                                                }}
                                                onDragEnd={() => { setDragElemIdx(null); setDragElemOverIdx(null); }}
                                                sx={{
                                                    display: 'flex', alignItems: 'center', gap: 1,
                                                    px: 1, py: 0.75, borderRadius: '8px', border: '1px solid',
                                                    borderColor: isDragOver ? GREEN : isActive ? '#e2e8f0' : '#f1f5f9',
                                                    bgcolor: isDragOver ? 'rgba(8,104,57,0.06)' : isActive ? '#fff' : '#f8fafc',
                                                    opacity: isDragging ? 0.35 : isActive ? 1 : 0.5,
                                                    cursor: 'grab', userSelect: 'none',
                                                    transition: 'border-color 0.1s, background 0.1s',
                                                }}
                                            >
                                                <Box sx={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                                    <GripVertical size={14} />
                                                </Box>
                                                <Typography sx={{ fontSize: 12, fontWeight: 700, flex: 1, color: isActive ? '#1e293b' : '#94a3b8' }}>
                                                    {idx + 1}. {label}
                                                    {!isActive && <Typography component="span" sx={{ fontSize: 10, color: '#94a3b8', ml: 0.75 }}>(tắt)</Typography>}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}

                {/* ─ Cột phải: preview + position panel ─ */}
                <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5, p: 3 }}>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8', alignSelf: 'flex-start' }}>
                        Bấm vào nhãn góc để đổi màu/kiểu — bấm phần tử khác để chỉnh vị trí, cỡ chữ.
                    </Typography>

                    {/* Card preview */}
                    <Box sx={{
                        width: naturalWidthPx * displayScale, height: naturalHeightPx * displayScale,
                        overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '8px',
                        bgcolor: '#f8fafc', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', flexShrink: 0,
                    }}>
                        <Box sx={{ width: naturalWidthPx, height: naturalHeightPx, transform: `scale(${displayScale})`, transformOrigin: 'top left' }}>
                            <PromoCardPrint
                                card={previewCard} settings={settings}
                                fieldConfig={fieldConfig} layout={layout}
                                onElementDrag={handleElementDrag} onElementResize={handleElementResize}
                                onElementSelect={setSelectedKey} selectedKey={selectedKey}
                            />
                        </Box>
                    </Box>

                    {/* Position + style panel */}
                    <Box sx={{ width: '100%', maxWidth: naturalWidthPx * displayScale, border: '1px solid #e2e8f0', borderRadius: '10px', p: 2, bgcolor: '#fff' }}>
                        {!selectedKey || !selectedBox ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#94a3b8', py: 1 }}>
                                <MousePointerClick size={18} />
                                <Typography sx={{ fontSize: 12.5 }}>Bấm vào 1 phần tử trên thẻ để xem/chỉnh số liệu</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography sx={{ fontWeight: 800, fontSize: 13, color: GREEN }}>{selectedLabel}</Typography>

                                {/* Vị trí */}
                                <Box>
                                    <SL>Vị trí</SL>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {!isFlowSelected && (
                                            <TextField label="X (mm)" type="number" size="small" sx={{ width: 105 }}
                                                value={round1(pctToMm(selectedBox.xPct, 'x'))}
                                                onChange={(e) => handleXChange(Number(e.target.value))} />
                                        )}
                                        {!isStripeSelected && (
                                            <TextField label={isFlowSelected ? "Cách trên (mm)" : "Y (mm)"} type="number" size="small" sx={{ width: 130 }}
                                                value={round1(pctToMm(selectedBox.yPct, 'y'))}
                                                onChange={(e) => handleYChange(Number(e.target.value))} />
                                        )}
                                        <TextField label="Rộng (mm)" type="number" size="small" sx={{ width: 120 }}
                                            disabled={isFlowSelected && selectedBox.auto}
                                            value={isFlowSelected && selectedBox.auto ? '' : round1(pctToMm(selectedBox.widthPct, 'x'))}
                                            placeholder={isFlowSelected && selectedBox.auto ? 'Tự động' : undefined}
                                            onChange={(e) => handleWidthChange(Number(e.target.value))} />
                                        {!isStripeSelected && !isFlowSelected && (
                                            <TextField label="Cao (mm)" type="number" size="small" sx={{ width: 105 }}
                                                value={round1(pctToMm(selectedBox.heightPct, 'y'))}
                                                onChange={(e) => handleHeightChange(Number(e.target.value))} />
                                        )}
                                        {isFlowSelected && (
                                            <FormControlLabel sx={{ ml: 0 }}
                                                control={<Switch size="small" checked={selectedBox.auto} onChange={(e) => handleAutoToggle(e.target.checked)} />}
                                                label={<Typography sx={{ fontSize: 12 }}>Tự động theo nội dung</Typography>}
                                            />
                                        )}
                                    </Box>
                                </Box>

                                {/* Căn lề */}
                                {isFlowSelected && (
                                    <Box>
                                        <SL>Căn lề</SL>
                                        <ToggleButtonGroup value={selectedBox.align ?? 'center'} exclusive size="small"
                                            onChange={(_, v) => v && handleAlignChange(v)}>
                                            <ToggleButton value="left" sx={{ textTransform: 'none', px: 2 }}><AlignLeft size={15} /></ToggleButton>
                                            <ToggleButton value="center" sx={{ textTransform: 'none', px: 2 }}><AlignCenter size={15} /></ToggleButton>
                                            <ToggleButton value="right" sx={{ textTransform: 'none', px: 2 }}><AlignRight size={15} /></ToggleButton>
                                        </ToggleButtonGroup>
                                    </Box>
                                )}

                                {/* Cỡ chữ — chỉ cho phần tử CHỮ (flow elements) */}
                                {isFlowSelected && (
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                            <SL>Cỡ chữ</SL>
                                            <FormControlLabel
                                                sx={{ ml: 0, mr: 0 }}
                                                control={
                                                    <Switch
                                                        size="small"
                                                        checked={currentFontSizeMm !== undefined}
                                                        onChange={(e) => handleFontSizeChange(e.target.checked ? (isPriceSlot ? 18 : 12) : undefined)}
                                                    />
                                                }
                                                label={
                                                    <Typography sx={{ fontSize: 11, color: '#64748b' }}>
                                                        {currentFontSizeMm !== undefined ? `${currentFontSizeMm}mm` : 'Tự động'}
                                                    </Typography>
                                                }
                                                labelPlacement="start"
                                            />
                                        </Box>
                                        {currentFontSizeMm !== undefined && (
                                            <Box sx={{ px: 0.5 }}>
                                                <Slider
                                                    value={currentFontSizeMm}
                                                    min={3} max={45} step={0.5}
                                                    valueLabelDisplay="auto"
                                                    valueLabelFormat={(v) => `${v}mm`}
                                                    onChange={(_, v) => handleFontSizeChange(v as number)}
                                                    sx={{
                                                        color: GREEN,
                                                        '& .MuiSlider-thumb': { width: 14, height: 14 },
                                                        '& .MuiSlider-valueLabel': { fontSize: 11 },
                                                    }}
                                                />
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -1 }}>
                                                    <Typography sx={{ fontSize: 10, color: '#cbd5e1' }}>3mm</Typography>
                                                    <Typography sx={{ fontSize: 10, color: '#cbd5e1' }}>45mm</Typography>
                                                </Box>
                                            </Box>
                                        )}
                                        <Typography sx={{ fontSize: 10.5, color: '#94a3b8', mt: 0.5 }}>
                                            {isPriceSlot ? 'Override "Cỡ" của ô giá này' : 'Override cỡ chữ phần tử này'}
                                        </Typography>
                                    </Box>
                                )}

                                {/* ── Badge controls — hiện khi bấm vào nhãn góc trên thẻ ── */}
                                {selectedKey === 'badge' && (
                                    <>
                                        <Box sx={{ borderTop: '1px solid #f1f5f9', pt: 2 }}>
                                            <SL>Kiểu nhãn</SL>
                                            <Box sx={{ display: 'flex', gap: 0.75 }}>
                                                {([
                                                    { value: 'hotdeal', label: '★ Hot Deal' },
                                                    { value: 'sale', label: '✦ Sale' },
                                                    { value: 'none', label: '✕ Không có' },
                                                ] as const).map(b => (
                                                    <Box key={b.value}
                                                        onClick={() => setFieldConfig(prev => ({ ...prev, badge: b.value }))}
                                                        sx={{
                                                            flex: 1, textAlign: 'center', py: 0.75, borderRadius: '8px',
                                                            cursor: 'pointer', userSelect: 'none', fontSize: 11.5, fontWeight: 700,
                                                            border: '1px solid',
                                                            borderColor: fieldConfig.badge === b.value ? GREEN : '#e2e8f0',
                                                            bgcolor: fieldConfig.badge === b.value ? 'rgba(8,104,57,0.07)' : '#fff',
                                                            color: fieldConfig.badge === b.value ? GREEN : '#64748b',
                                                            transition: 'all 0.15s',
                                                        }}>
                                                        {b.label}
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Box>

                                        {fieldConfig.badge !== 'none' && (
                                            <>
                                                <Box>
                                                    <SL>Chữ nhãn</SL>
                                                    <TextField size="small" fullWidth multiline maxRows={2}
                                                        placeholder={fieldConfig.badge === 'hotdeal' ? 'HOT\nDEAL' : 'SALE'}
                                                        value={fieldConfig.badgeLabel ?? ''}
                                                        onChange={(e) => setFieldConfig(prev => ({ ...prev, badgeLabel: e.target.value || undefined }))}
                                                        slotProps={{ input: { style: { fontFamily: 'monospace', fontSize: 12 } } }}
                                                    />
                                                </Box>

                                                <Box>
                                                    <SL>Màu sắc</SL>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                                        <ColorPicker
                                                            label={fieldConfig.badge === 'hotdeal' ? 'Màu viền' : 'Màu ngôi sao'}
                                                            value={fieldConfig.badgeBorderColor}
                                                            defaultValue="#e60008"
                                                            onChange={(v) => setFieldConfig(prev => ({ ...prev, badgeBorderColor: v }))}
                                                        />
                                                        {fieldConfig.badge === 'hotdeal' && (
                                                            <ColorPicker
                                                                label="Màu nền"
                                                                value={fieldConfig.badgeFillColor}
                                                                defaultValue="#ffe21f"
                                                                onChange={(v) => setFieldConfig(prev => ({ ...prev, badgeFillColor: v }))}
                                                            />
                                                        )}
                                                        <ColorPicker
                                                            label="Màu chữ"
                                                            value={fieldConfig.badgeTextColor}
                                                            defaultValue={fieldConfig.badge === 'hotdeal' ? '#e60008' : '#ffffff'}
                                                            onChange={(v) => setFieldConfig(prev => ({ ...prev, badgeTextColor: v }))}
                                                        />
                                                    </Box>
                                                </Box>
                                            </>
                                        )}
                                    </>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* Save scope (card mode) */}
                    {mode === 'card' && (
                        <Box sx={{ alignSelf: 'flex-start', width: '100%', maxWidth: naturalWidthPx * displayScale }}>
                            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#94a3b8', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Áp dụng cho</Typography>
                            <ToggleButtonGroup value={saveScope} exclusive size="small" onChange={(_, v) => v && setSaveScope(v)}>
                                <ToggleButton value="card" sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5 }}>
                                    Chỉ thẻ này
                                </ToggleButton>
                                <ToggleButton value="kind" sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5 }}>
                                    Mọi thẻ loại {kindLabel(effectiveKind)}
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            {/* ── Footer ── */}
            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9' }}>
                {mode === 'card' && card?.layoutOverride && (
                    <Button onClick={handleClearOverride} startIcon={<Eraser size={14} />}
                        sx={{ textTransform: 'none', fontWeight: 700, color: '#b45309', mr: 'auto' }}>
                        Bỏ tuỳ chỉnh riêng
                    </Button>
                )}
                <Button onClick={handleResetDefault} startIcon={<RefreshCw size={14} />}
                    sx={{ textTransform: 'none', fontWeight: 700, color: '#64748b' }}>
                    Đặt lại mặc định
                </Button>
                <Button onClick={handleSave} disabled={saving} variant="contained"
                    sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' }, textTransform: 'none', fontWeight: 700, borderRadius: '10px', boxShadow: 'none' }}>
                    {saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
            </DialogActions>
        </Dialog>

        {/* ── Dialog tạo loại bảng giá mới ── */}

        <Dialog open={creatingKind} onClose={() => { setCreatingKind(false); setNewKindName(''); }} maxWidth="xs" fullWidth
            slotProps={{ paper: { sx: { borderRadius: '14px' } } }}>
            <DialogTitle sx={{ fontWeight: 800, fontSize: 15, pb: 1 }}>Tạo loại bảng giá mới</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
                <TextField
                    label="Tên loại" size="small" fullWidth autoFocus
                    placeholder="Ví dụ: Siêu Sale 3 giá"
                    value={newKindName}
                    onChange={(e) => setNewKindName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateKind()}
                    sx={{ mt: 0.5 }}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9' }}>
                <Button onClick={() => { setCreatingKind(false); setNewKindName(''); }}
                    sx={{ textTransform: 'none', color: '#64748b' }}>Huỷ</Button>
                <Button onClick={handleCreateKind} variant="contained" disabled={!newKindName.trim()}
                    sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' }, textTransform: 'none', fontWeight: 700, borderRadius: '10px', boxShadow: 'none' }}>
                    Tạo
                </Button>
            </DialogActions>
        </Dialog>
        </>
    );
}
