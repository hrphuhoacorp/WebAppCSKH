'use client';

import { useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from "@mui/material";
import { X as MuiX } from "lucide-react";
import { Plus, Trash2, Edit2, Sparkles, Tag, Calendar, DollarSign, Settings, Copy, GripVertical, ChevronDown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PromoCard, PromoPrintSettings } from "../types";
import {
    PRICE_SLOT_KEYS, PromoTemplateKind,
    buildKindsMap, getAvailableKinds, resolveFieldConfigForKind,
} from "../promoLayout";
import { promoTemplateLayoutApi, PromoTemplateKindUpsertPayload } from "../api/promoTemplateLayout.api";
import PromoLayoutEditor from "./PromoLayoutEditor";
import { PROMO_TEMPLATE_LAYOUTS_QUERY_KEY } from "./PromoPrintPreview";

interface PromoCardEditorProps {
    cards: PromoCard[];
    settings: PromoPrintSettings;
    onAddCard: (card: PromoCard) => void;
    onUpdateCard: (card: PromoCard) => void;
    onDeleteCard: (id: string) => void;
    onClearAll: () => void;
    onLoadSamples: () => void;
    onDuplicateCard?: (id: string) => void;
    onMoveCard?: (fromIdx: number, toIdx: number) => void;
}

interface NewCardForm {
    name: string;
    kindId: string;
    price1: string; price1Unit: string;
    price2: string; price2Unit: string;
    price3: string; price3Unit: string;
    price4: string; price4Unit: string;
    note: string;
    date: string;
}

const EMPTY_FORM: NewCardForm = {
    name: "", kindId: "hotdeal-2",
    price1: "", price1Unit: "",
    price2: "", price2Unit: "",
    price3: "", price3Unit: "",
    price4: "", price4Unit: "",
    note: "", date: "",
};

export default function PromoCardEditor({
    cards,
    settings,
    onAddCard,
    onUpdateCard,
    onDeleteCard,
    onClearAll,
    onLoadSamples,
    onDuplicateCard,
    onMoveCard,
}: PromoCardEditorProps) {
    const [layoutCardId, setLayoutCardId] = useState<string | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const qc = useQueryClient();

    const { data: templateLayoutDtos } = useQuery({
        queryKey: PROMO_TEMPLATE_LAYOUTS_QUERY_KEY,
        queryFn: () => promoTemplateLayoutApi.getAll(),
    });
    const kindsMap = useMemo(() => buildKindsMap(templateLayoutDtos ?? []), [templateLayoutDtos]);
    const availableKinds = useMemo(() => getAvailableKinds(kindsMap), [kindsMap]);

    const handleSaveTemplateKind = async (kind: PromoTemplateKind, payload: PromoTemplateKindUpsertPayload) => {
        try {
            await promoTemplateLayoutApi.upsert(kind, payload);
            await qc.invalidateQueries({ queryKey: PROMO_TEMPLATE_LAYOUTS_QUERY_KEY });
            toast.success('Đã lưu mẫu — áp dụng cho mọi thẻ cùng loại');
        } catch {
            toast.error('Lưu mẫu thất bại, thử lại nhé');
        }
    };

    const layoutCard = cards.find(c => c.id === layoutCardId) ?? null;
    const [newCard, setNewCard] = useState<NewCardForm>(EMPTY_FORM);
    const fieldConfig = resolveFieldConfigForKind(newCard.kindId, kindsMap);
    const activeSlots = PRICE_SLOT_KEYS.filter(k => fieldConfig.priceSlots[k]);

    const [editDialog, setEditDialog] = useState<PromoCard | null>(null);
    const editFieldConfig = editDialog ? resolveFieldConfigForKind(editDialog.kindId, kindsMap) : null;
    const editActiveSlots = editFieldConfig ? PRICE_SLOT_KEYS.filter(k => editFieldConfig.priceSlots[k]) : [];

    const applyPercentDiscount = (percent: number) => {
        const orig = parseInt(newCard.price1, 10);
        if (!isNaN(orig)) {
            setNewCard(prev => ({ ...prev, price2: String(Math.round(orig * (1 - percent / 100))) }));
        }
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCard.name.trim()) return;
        const card: PromoCard = {
            id: `promo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: newCard.name.trim(),
            kindId: newCard.kindId,
            note: newCard.note.trim() || undefined,
            date: newCard.date.trim() || undefined,
        };
        for (const key of PRICE_SLOT_KEYS) {
            if (!fieldConfig.priceSlots[key]) continue;
            const raw = newCard[key];
            if (raw.trim() === "") continue;
            card[key] = parseInt(raw, 10) || 0;
            card[`${key}Unit`] = newCard[`${key}Unit`].trim() || "kg";
        }
        onAddCard(card);
        setNewCard({ ...EMPTY_FORM, kindId: newCard.kindId });
    };

    const saveEditing = () => {
        if (editDialog && editDialog.name.trim()) {
            onUpdateCard(editDialog);
            setEditDialog(null);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {/* ── Header ── */}
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="bg-green-600 text-white p-1.5 rounded-lg shrink-0">
                        <Tag size={16} />
                    </span>
                    <div>
                        <h2 className="text-sm font-extrabold text-zinc-800 leading-tight tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Tạo Bảng Giá Khuyến Mãi
                        </h2>
                        <p className="text-[11px] text-zinc-400 leading-none mt-0.5">Thiết kế bảng giá chuyên nghiệp cho Phuha Fresh</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={onLoadSamples}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                    >
                        <Sparkles size={13} className="text-green-500" />
                        Tải mẫu nhanh
                    </button>
                    {cards.length > 0 && (
                        <button
                            onClick={onClearAll}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                            <Trash2 size={13} />
                            Xóa hết
                        </button>
                    )}
                </div>
            </div>

            <div className="p-5">
                {/* ── Form ── */}
                <form onSubmit={handleAdd} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">

                    {/* Row 1: Tên sản phẩm + Loại bảng giá */}
                    <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Tên sản phẩm *</label>
                            <input
                                type="text"
                                placeholder="Ví dụ: Dưa vàng Đài Loan"
                                value={newCard.name}
                                onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                                className="w-full text-sm bg-white border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div className="w-52 shrink-0">
                            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Loại bảng giá</label>
                            <div className="relative">
                                <select
                                    value={newCard.kindId}
                                    onChange={(e) => setNewCard({ ...newCard, kindId: e.target.value })}
                                    className="w-full appearance-none text-sm bg-white border border-zinc-300 rounded-lg pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                                >
                                    {availableKinds.map(k => (
                                        <option key={k.id} value={k.id}>{k.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Giá */}
                    <div className="pt-2 border-t border-zinc-200">
                        <div className="flex items-center gap-1.5 mb-2">
                            <DollarSign size={12} className="text-zinc-400" />
                            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Cấu hình giá</span>
                        </div>
                        <div className={`grid gap-2.5 ${activeSlots.length <= 2 ? 'grid-cols-2' : activeSlots.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                            {activeSlots.map((key) => {
                                const slot = fieldConfig.priceSlots[key]!;
                                const isHighlight = slot.style === 'highlight';
                                const isStrike = slot.style === 'strike';
                                return (
                                    <div key={key}>
                                        <label className={`block text-[11px] font-bold mb-1 ${isHighlight ? 'text-red-500' : isStrike ? 'text-zinc-400' : 'text-emerald-700'}`}>
                                            {slot.label}
                                        </label>
                                        <div className="flex gap-1">
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={newCard[key]}
                                                onChange={(e) => setNewCard({ ...newCard, [key]: e.target.value })}
                                                className={`flex-1 min-w-0 text-sm bg-white border rounded-lg px-2.5 py-2 outline-none transition-all
                                                    ${isHighlight ? 'border-red-200 focus:border-red-400 focus:ring-1 focus:ring-red-200 font-bold text-red-600'
                                                        : isStrike ? 'border-zinc-200 text-zinc-400'
                                                            : 'border-zinc-200 focus:ring-1 focus:ring-green-400 focus:border-green-400 font-semibold text-emerald-700'}`}
                                            />
                                            <input
                                                type="text"
                                                placeholder="kg"
                                                value={newCard[`${key}Unit`]}
                                                onChange={(e) => setNewCard({ ...newCard, [`${key}Unit`]: e.target.value })}
                                                className="w-12 text-sm bg-white border border-zinc-200 rounded-lg px-2 py-2 outline-none focus:border-zinc-400 text-center text-zinc-500"
                                            />
                                        </div>
                                        {key === 'price1' && fieldConfig.priceSlots.price2 && (
                                            <div className="mt-1.5 flex gap-1">
                                                {[10, 20, 50].map(p => (
                                                    <button key={p} type="button" onClick={() => applyPercentDiscount(p)}
                                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-zinc-200 text-zinc-500 hover:border-red-300 hover:text-red-500 transition-colors">
                                                        -{p}%
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Row 3: Ghi chú + Ngày + Submit */}
                    <div className="flex flex-wrap items-end gap-2.5 pt-2 border-t border-zinc-200">
                        {fieldConfig.noteEnabled && (
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Ghi chú (điều kiện)</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Khi mua từ 2 sản phẩm"
                                    value={newCard.note}
                                    onChange={(e) => setNewCard({ ...newCard, note: e.target.value })}
                                    className="w-full text-sm bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-green-400 focus:border-green-400 transition-all"
                                />
                            </div>
                        )}
                        {fieldConfig.dateEnabled && (
                            <div className="flex-1 min-w-[160px]">
                                <label className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1">
                                    <Calendar size={11} /> Thời gian áp dụng
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Duy nhất ngày 23/05"
                                    value={newCard.date}
                                    onChange={(e) => setNewCard({ ...newCard, date: e.target.value })}
                                    className="w-full text-sm bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-green-400 focus:border-green-400 transition-all"
                                />
                            </div>
                        )}
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-sm px-5 py-2 rounded-lg transition-all shadow-sm shrink-0"
                        >
                            <Plus size={16} />
                            Thêm vào danh sách
                        </button>
                    </div>
                </form>

                {/* ── Danh sách ── */}
                <div className="mt-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-zinc-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Danh sách khuyến mãi
                            <span className="ml-1.5 text-xs font-semibold text-zinc-400 tabular-nums">({cards.length})</span>
                        </h3>
                    </div>

                    {cards.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-white shadow-sm border border-zinc-100">
                                <Tag className="text-zinc-300" size={22} />
                            </div>
                            <p className="text-sm text-zinc-500 font-medium">Chưa có sản phẩm nào</p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">Dùng form trên hoặc nút &ldquo;Tải mẫu nhanh&rdquo;</p>
                        </div>
                    ) : (
                        <div className="border border-zinc-200 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto max-h-[480px]">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-zinc-700 text-white">
                                            <th className="py-2.5 px-2.5 w-8 font-normal" />
                                            <th className="py-2.5 px-3 text-xs font-bold tracking-wide w-10 text-center">#</th>
                                            <th className="py-2.5 px-3 text-xs font-bold tracking-wide">Sản phẩm</th>
                                            <th className="py-2.5 px-3 text-xs font-bold tracking-wide">Giá</th>
                                            <th className="py-2.5 px-3 text-xs font-bold tracking-wide">Ghi chú & Ngày</th>
                                            <th className="py-2.5 px-3 text-xs font-bold tracking-wide text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {cards.map((card, idx) => {
                                            const rowFieldConfig = resolveFieldConfigForKind(card.kindId, kindsMap);
                                            const rowKindLabel = availableKinds.find(k => k.id === card.kindId)?.label ?? card.kindId;
                                            const isDragging = dragIndex === idx;
                                            const isDragOver = dragOverIndex === idx && dragIndex !== idx;

                                            return (
                                                <tr
                                                    key={card.id}
                                                    draggable={!!onMoveCard}
                                                    onDragStart={(e) => {
                                                        setDragIndex(idx);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                        if (dragIndex !== null && dragIndex !== idx) {
                                                            onMoveCard?.(dragIndex, idx);
                                                            setDragIndex(idx);
                                                        }
                                                        setDragOverIndex(idx);
                                                    }}
                                                    onDrop={(e) => { e.preventDefault(); setDragIndex(null); setDragOverIndex(null); }}
                                                    onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                                                    className={`transition-colors ${
                                                        isDragging ? 'bg-green-50 border-l-2 border-l-green-500'
                                                            : isDragOver ? 'bg-green-50/40'
                                                                : 'hover:bg-zinc-50/80'}`}
                                                >
                                                    {/* Drag handle */}
                                                    <td className="py-3 px-2.5">
                                                        {onMoveCard && (
                                                            <span className="text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing flex items-center justify-center">
                                                                <GripVertical size={15} />
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* STT */}
                                                    <td className="py-3 px-3 text-center">
                                                        <span className="text-xs font-bold text-zinc-400 tabular-nums">{idx + 1}</span>
                                                    </td>

                                                    {/* Sản phẩm */}
                                                    <td className="py-3 px-3">
                                                        <p className="font-semibold text-zinc-900 text-sm leading-tight">{card.name}</p>
                                                        <span className="inline-block text-[10px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 tracking-wide">
                                                            {rowKindLabel}
                                                        </span>
                                                    </td>

                                                    {/* Giá */}
                                                    <td className="py-3 px-3">
                                                        <div className="flex flex-col gap-0.5">
                                                            {PRICE_SLOT_KEYS.map((key) => {
                                                                const slot = rowFieldConfig.priceSlots[key];
                                                                const value = card[key];
                                                                if (!slot || value === undefined) return null;
                                                                const cls = slot.style === 'strike'
                                                                    ? 'text-zinc-400 line-through text-[11px]'
                                                                    : slot.style === 'highlight'
                                                                        ? 'font-bold text-red-600 text-xs'
                                                                        : 'font-semibold text-emerald-700 text-xs';
                                                                return (
                                                                    <span key={key} className={cls}>
                                                                        {slot.label}: {value.toLocaleString()}đ/{card[`${key}Unit`] || 'kg'}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>

                                                    {/* Ghi chú & Ngày */}
                                                    <td className="py-3 px-3">
                                                        <div className="flex flex-col gap-0.5">
                                                            {card.note && <span className="text-[11px] text-zinc-500 italic">*{card.note}</span>}
                                                            {card.date && <span className="text-[11px] text-zinc-400">{card.date}</span>}
                                                        </div>
                                                    </td>

                                                    {/* Thao tác */}
                                                    <td className="py-3 px-3">
                                                        <div className="flex items-center justify-end gap-0.5">
                                                            <>
                                                                    {onDuplicateCard && (
                                                                        <button onClick={() => onDuplicateCard(card.id)} title="Sao chép"
                                                                            className="p-1.5 text-zinc-400 hover:text-indigo-500 rounded transition-colors">
                                                                            <Copy size={14} />
                                                                        </button>
                                                                    )}
                                                                    <button onClick={() => setLayoutCardId(card.id)} title="Tuỳ chỉnh layout"
                                                                        className={`p-1.5 rounded transition-colors ${card.layoutOverride ? 'text-violet-500' : 'text-zinc-400 hover:text-violet-500'}`}>
                                                                        <Settings size={14} />
                                                                    </button>
                                                                    <button onClick={() => setEditDialog({ ...card })} title="Chỉnh sửa"
                                                                        className="p-1.5 text-zinc-400 hover:text-green-600 rounded transition-colors">
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button onClick={() => onDeleteCard(card.id)} title="Xoá"
                                                                        className="p-1.5 text-zinc-400 hover:text-red-500 rounded transition-colors">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Dialog chỉnh sửa bảng giá ── */}
            <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth
                slotProps={{ paper: { sx: { borderRadius: '16px' } } }}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>Chỉnh sửa bảng giá</span>
                    <IconButton size="small" onClick={() => setEditDialog(null)}><MuiX size={18} /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {editDialog && editFieldConfig && (
                        <div className="space-y-4 pt-1">
                            {/* Tên sản phẩm */}
                            <div>
                                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Tên sản phẩm *</label>
                                <input type="text" value={editDialog.name}
                                    onChange={(e) => setEditDialog({ ...editDialog, name: e.target.value })}
                                    className="w-full text-sm bg-white border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                />
                            </div>
                            {/* Loại */}
                            <div>
                                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Loại bảng giá</label>
                                <select value={editDialog.kindId}
                                    onChange={(e) => setEditDialog({ ...editDialog, kindId: e.target.value })}
                                    className="w-full text-sm bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500">
                                    {availableKinds.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                                </select>
                            </div>
                            {/* Giá */}
                            <div>
                                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Giá</label>
                                <div className={`grid gap-2 ${editActiveSlots.length <= 2 ? 'grid-cols-2' : editActiveSlots.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                                    {editActiveSlots.map((key) => {
                                        const slot = editFieldConfig.priceSlots[key]!;
                                        const isHighlight = slot.style === 'highlight';
                                        return (
                                            <div key={key}>
                                                <label className={`block text-[11px] font-bold mb-1 ${isHighlight ? 'text-red-500' : 'text-emerald-700'}`}>{slot.label}</label>
                                                <div className="flex gap-1">
                                                    <input type="number" placeholder="0" value={editDialog[key] ?? ''}
                                                        onChange={(e) => setEditDialog({ ...editDialog, [key]: e.target.value ? Number(e.target.value) : undefined })}
                                                        className={`flex-1 min-w-0 text-sm bg-white border rounded-lg px-2 py-1.5 outline-none ${isHighlight ? 'border-red-200 focus:border-red-400 text-red-600 font-bold' : 'border-zinc-200 focus:border-green-400 text-emerald-700 font-semibold'}`}
                                                    />
                                                    <input placeholder="kg" value={editDialog[`${key}Unit`] ?? ''}
                                                        onChange={(e) => setEditDialog({ ...editDialog, [`${key}Unit`]: e.target.value })}
                                                        className="w-12 text-sm bg-white border border-zinc-200 rounded-lg px-2 py-1.5 outline-none text-center text-zinc-500"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Ghi chú + Ngày */}
                            <div className="grid grid-cols-2 gap-3">
                                {editFieldConfig.noteEnabled && (
                                    <div>
                                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1">
                                            Ghi chú
                                        </label>
                                        <input placeholder="Khi mua từ 2kg..." value={editDialog.note ?? ''}
                                            onChange={(e) => setEditDialog({ ...editDialog, note: e.target.value || undefined })}
                                            className="w-full text-sm bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-green-400"
                                        />
                                    </div>
                                )}
                                {editFieldConfig.dateEnabled && (
                                    <div>
                                        <label className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1">
                                            <Calendar size={11} /> Ngày áp dụng
                                        </label>
                                        <input placeholder="Ngày 23/05..." value={editDialog.date ?? ''}
                                            onChange={(e) => setEditDialog({ ...editDialog, date: e.target.value || undefined })}
                                            className="w-full text-sm bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-green-400"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9' }}>
                    <Button onClick={() => setEditDialog(null)} sx={{ textTransform: 'none', color: '#64748b' }}>Huỷ</Button>
                    <Button onClick={saveEditing} variant="contained" disabled={!editDialog?.name?.trim()}
                        sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, textTransform: 'none', fontWeight: 700, borderRadius: '10px', boxShadow: 'none' }}>
                        Lưu thay đổi
                    </Button>
                </DialogActions>
            </Dialog>

            {layoutCard && (
                <PromoLayoutEditor
                    open={!!layoutCard}
                    onClose={() => setLayoutCardId(null)}
                    mode="card"
                    settings={settings}
                    card={layoutCard}
                    availableKinds={availableKinds}
                    kindsMap={kindsMap}
                    onSaveTemplateKind={handleSaveTemplateKind}
                    onSaveCardOverride={(override) => {
                        onUpdateCard({ ...layoutCard, layoutOverride: override });
                        setLayoutCardId(null);
                    }}
                />
            )}
        </div>
    );
}
