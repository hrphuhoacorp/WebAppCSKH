'use client';

import { PromoCard, PromoPrintSettings } from "../types";
import { Printer, Sliders, RefreshCw, Settings, ChevronDown } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Dispatch, SetStateAction } from "react";
import { useReactToPrint } from "react-to-print";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PromoCardPrintView from "./PromoCardPrintView";
import PromoLayoutEditor from "./PromoLayoutEditor";
import { PROMO_FRAMES, recommendFrame, resolveFrame } from "../promoFrames";
import {
    PromoCardLayout, PromoTemplateKind, FieldConfig,
    buildKindsMap, getAvailableKinds, resolveFieldConfigForKind, resolveLayoutForKind,
} from "../promoLayout";
import { promoTemplateLayoutApi, PromoTemplateKindUpsertPayload } from "../api/promoTemplateLayout.api";

interface PromoPrintPreviewProps {
    cards: PromoCard[];
    settings: PromoPrintSettings;
    setSettings: Dispatch<SetStateAction<PromoPrintSettings>>;
}

export const PROMO_TEMPLATE_LAYOUTS_QUERY_KEY = ['promo-template-layouts'];

export default function PromoPrintPreview({ cards, settings, setSettings }: PromoPrintPreviewProps) {
    const [framePickerOpen, setFramePickerOpen] = useState(false);
    const [gapSize, setGapSize] = useState("1mm");
    const [frameId, setFrameId] = useState("grid3");
    const [editorOpen, setEditorOpen] = useState(false);
    const qc = useQueryClient();

    const frame = PROMO_FRAMES.find(f => f.id === frameId) ?? PROMO_FRAMES.find(f => f.id === 'grid3')!;
    const resolved = resolveFrame(frame);
    const itemsPerPage = resolved.cardsPerPage;

    // Định nghĩa từng "loại bảng giá" (4 loại có sẵn + loại người dùng tự tạo) — lưu DB, áp dụng
    // cho mọi thẻ khuyến mãi tạo sau này. Thiếu key nào (chưa ai tuỳ chỉnh loại đó) thì rơi về
    // BUILTIN_FIELD_CONFIGS/DEFAULT_LAYOUTS cứng (chỉ 4 loại gốc mới có fallback cứng).
    const { data: templateLayoutDtos } = useQuery({
        queryKey: PROMO_TEMPLATE_LAYOUTS_QUERY_KEY,
        queryFn: () => promoTemplateLayoutApi.getAll(),
    });

    const kindsMap = useMemo(() => buildKindsMap(templateLayoutDtos ?? []), [templateLayoutDtos]);

    // Danh sách loại để chọn (dropdown trong editor/form) — 4 loại gốc luôn có mặt + mọi loại đã
    // lưu DB (kể cả loại tự tạo), loại nào đã fetch có displayName riêng thì ưu tiên dùng.
    const availableKinds = useMemo(() => getAvailableKinds(kindsMap), [kindsMap]);

    const resolveLayout = useCallback((card: PromoCard): PromoCardLayout =>
        card.layoutOverride ?? resolveLayoutForKind(card.kindId, kindsMap),
    [kindsMap]);

    const resolveFieldConfig = useCallback((card: PromoCard): FieldConfig =>
        resolveFieldConfigForKind(card.kindId, kindsMap),
    [kindsMap]);

    const handleSaveTemplateKind = async (kind: PromoTemplateKind, payload: PromoTemplateKindUpsertPayload) => {
        try {
            await promoTemplateLayoutApi.upsert(kind, payload);
            await qc.invalidateQueries({ queryKey: PROMO_TEMPLATE_LAYOUTS_QUERY_KEY });
            toast.success('Đã lưu mẫu — áp dụng cho mọi thẻ cùng loại');
        } catch {
            toast.error('Lưu mẫu thất bại, thử lại nhé');
        }
    };

    const handleDeleteKind = async (kind: PromoTemplateKind) => {
        try {
            await promoTemplateLayoutApi.delete(kind);
            await qc.invalidateQueries({ queryKey: PROMO_TEMPLATE_LAYOUTS_QUERY_KEY });
            toast.success('Đã xóa loại bảng giá');
        } catch {
            toast.error('Xóa thất bại, thử lại nhé');
        }
    };

    const pages = useMemo(() => {
        const totalPages = Math.ceil(cards.length / itemsPerPage) || 1;
        return Array.from({ length: totalPages }, (_, p) => {
            const start = p * itemsPerPage;
            return Array.from({ length: itemsPerPage }, (_, i) => cards[start + i] || null);
        });
    }, [cards, itemsPerPage]);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Khuyen_Mai_${new Date().getTime()}`,
    });

    const handleReset = () => {
        setGapSize("1mm");
        setSettings({
            borderColor: "transparent",
            textColor: "#075c4f",
            borderWidth: 0,
            showBorder: false,
            fontFamily: "sans",
            fontSizeTitle: 50,
            fontSizePrice: 120,
            fontSizeOriginal: 85,
            fontSizeNote: 30,
            brandColor: "#075c4f",
        });
    };

    const recommended = recommendFrame(cards.length);

    return (
        <div className="space-y-4">
            {/* Settings bar */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                    <Sliders className="text-green-600 shrink-0" size={16} />
                    <span className="font-bold text-zinc-700 text-sm mr-1">In Khuyến Mãi</span>

                    {/* Layout picker trigger */}
                    <div className="relative">
                        <button
                            onClick={() => setFramePickerOpen(v => !v)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs font-bold text-zinc-700 hover:border-green-500 hover:text-green-700 transition"
                        >
                            <span className="text-zinc-400 text-[10px]">Layout:</span>
                            {frame.name.split('—')[0].trim()}
                            <ChevronDown size={12} className="text-zinc-400" />
                        </button>

                        {framePickerOpen && (
                            <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-zinc-200 rounded-xl shadow-lg p-3 flex gap-2 flex-wrap min-w-[340px]">
                                {PROMO_FRAMES.map((f) => {
                                    const isSelected = f.id === frameId;
                                    const isRec = f.id === recommended.id;
                                    const isPortrait = f.pageOrientation === 'portrait';
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => { setFrameId(f.id); setFramePickerOpen(false); }}
                                            className={`relative flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all ${isSelected ? 'border-green-600 bg-green-50' : 'border-zinc-200 hover:border-green-400 bg-white'}`}
                                            title={f.name}
                                        >
                                            {isRec && (
                                                <span className="absolute -top-2 -right-1 text-[8px] font-black bg-amber-100 text-amber-700 px-1 rounded">
                                                    Đề xuất
                                                </span>
                                            )}
                                            {/* Mini A4 thumbnail */}
                                            <div
                                                style={{
                                                    width: isPortrait ? 28 : 40,
                                                    height: isPortrait ? 40 : 28,
                                                    display: 'grid',
                                                    gridTemplateColumns: `repeat(${f.columns}, 1fr)`,
                                                    gridTemplateRows: `repeat(${f.rows}, 1fr)`,
                                                    gap: 1.5,
                                                    padding: 2,
                                                    background: '#f8fafc',
                                                    borderRadius: 3,
                                                    border: '1px solid #e2e8f0',
                                                }}
                                            >
                                                {Array.from({ length: f.cardsPerPage }).map((_, i) => (
                                                    <div key={i} style={{ background: isSelected ? '#086839' : '#94a3b8', borderRadius: 1 }} />
                                                ))}
                                            </div>
                                            <span className={`text-[9px] font-bold ${isSelected ? 'text-green-700' : 'text-zinc-500'}`}>
                                                {f.cardsPerPage} tấm
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Gap */}
                    <select
                        value={gapSize}
                        onChange={(e) => setGapSize(e.target.value)}
                        className="text-xs border border-zinc-300 rounded-lg px-2 py-1.5 text-zinc-700 bg-white"
                    >
                        <option value="0mm">Sát nhau</option>
                        <option value="1mm">Chuẩn in</option>
                        <option value="3mm">Rộng nhẹ</option>
                        <option value="5mm">Rộng</option>
                    </select>

                    {/* Font title slider */}
                    <div className="flex items-center gap-2 min-w-[160px]">
                        <span className="text-[10px] font-semibold text-zinc-500 whitespace-nowrap">Tiêu đề</span>
                        <input type="range" min="40" max="95" value={settings.fontSizeTitle}
                            onChange={(e) => setSettings({ ...settings, fontSizeTitle: Number(e.target.value) })}
                            className="flex-1 accent-green-600"
                        />
                        <span className="text-[10px] text-green-600 font-bold w-7">{settings.fontSizeTitle}</span>
                    </div>

                    {/* Font price slider */}
                    <div className="flex items-center gap-2 min-w-[160px]">
                        <span className="text-[10px] font-semibold text-zinc-500 whitespace-nowrap">Giá</span>
                        <input type="range" min="40" max="120" value={settings.fontSizePrice}
                            onChange={(e) => setSettings({ ...settings, fontSizePrice: Number(e.target.value) })}
                            className="flex-1 accent-red-500"
                        />
                        <span className="text-[10px] text-red-500 font-bold w-7">{settings.fontSizePrice}</span>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-1.5 ml-auto">
                        <button onClick={() => setEditorOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-xs font-bold text-green-700 hover:bg-green-100 transition"
                        >
                            <Settings size={13} />
                            Cấu hình mẫu
                        </button>
                        <button onClick={handleReset}
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition"
                            title="Reset"
                        >
                            <RefreshCw size={14} />
                        </button>
                        <button onClick={() => handlePrint()}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition"
                        >
                            <Printer size={13} />
                            In ngay
                        </button>
                    </div>
                </div>
            </div>

            {/* Live preview — luôn hiện */}
            <PromoCardPrintView
                pages={pages}
                settings={settings}
                gapSize={gapSize}
                widthMm={resolved.cardWidthMm}
                heightMm={resolved.cardHeightMm}
                pageWidthMm={resolved.pageWidthMm}
                pageHeightMm={resolved.pageHeightMm}
                orientation={resolved.pageOrientation}
                columns={resolved.columns}
                resolveLayout={resolveLayout}
                resolveFieldConfig={resolveFieldConfig}
            />

            {/* Hidden print-only copy, isolated by react-to-print (see useReactToPrint above) */}
            <div className="hidden">
                <PromoCardPrintView
                    ref={printRef}
                    pages={pages}
                    settings={settings}
                    gapSize={gapSize}
                    widthMm={resolved.cardWidthMm}
                    heightMm={resolved.cardHeightMm}
                    pageWidthMm={resolved.pageWidthMm}
                    pageHeightMm={resolved.pageHeightMm}
                    orientation={resolved.pageOrientation}
                    columns={resolved.columns}
                    resolveLayout={resolveLayout}
                    resolveFieldConfig={resolveFieldConfig}
                />
            </div>

            {editorOpen && (
                <PromoLayoutEditor
                    open={editorOpen}
                    onClose={() => setEditorOpen(false)}
                    mode="template"
                    settings={settings}
                    availableKinds={availableKinds}
                    kindsMap={kindsMap}
                    onSaveTemplateKind={handleSaveTemplateKind}
                    onDeleteKind={handleDeleteKind}
                    defaultKind={cards[0]?.kindId ?? 'hotdeal-2'}
                />
            )}
        </div>
    );
}
