'use client';

import { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { FileSpreadsheet, Layers, Sparkles } from "lucide-react";
import { PriceTag, PrintSettings, PromoCard, PromoPrintSettings } from "@/features/price-tags/types";
import TemplateFeatures from "@/features/price-tags/components/TemplateFeatures";
import ManualEditor from "@/features/price-tags/components/ManualEditor";
import PrintPreview from "@/features/price-tags/components/PrintPreview";
import PromoCardEditor from "@/features/price-tags/components/PromoCardEditor";
import PromoPrintPreview from "@/features/price-tags/components/PromoPrintPreview";
import { GREEN } from "@/features/price-tags/styles";

const initialSamples: PriceTag[] = [
    { id: "sample-1", name: "Muối tôm Chân Ý FOODS (Việt Nam)", origin: "Việt Nam", price: 260000, unit: "Hũ" },
    { id: "sample-2", name: "Nho Mẫu Đơn Hàn Quốc Thượng Hạng Sữa", origin: "Hàn Quốc", price: 450000, unit: "Hộp" },
    { id: "sample-3", name: "Táo Rockit New Zealand Giòn Ngọt Thơm", origin: "New Zealand", price: 120000, unit: "Ống" },
    { id: "sample-4", name: "Sữa Tươi Ít Đường TH True Milk Trẻ Em", origin: "Việt Nam", price: 32000, unit: "Lốc" },
    { id: "sample-5", name: "Thịt Bò Mỹ Ba Chỉ Loại A Cắt Sẵn Lẩu", origin: "Mỹ", price: 185000, unit: "Khay" },
    { id: "sample-6", name: "Đùi Cừu Không Xương Úc Cuộn Cao Cấp", origin: "Úc", price: 890000, unit: "Kg" },
    { id: "sample-7", name: "Kem Hộp Trà Xanh Matcha Nhật Bản", origin: "Nhật Bản", price: 150000, unit: "Hộp" },
    { id: "sample-8", name: "Dầu Ô Liu Nguyên Chất Olivoila Ý", origin: "Ý", price: 135000, unit: "Chai" },
];

const samplePromoCards: PromoCard[] = [
    {
        id: "sample-promo-1", name: "Dưa vàng Đài Loan", kindId: "hotdeal-2",
        price1: 99000, price1Unit: "Kg", price2: 79000, price2Unit: "Kg", price3: 69000, price3Unit: "Kg",
        note: "Khi mua từ 2kg", date: "Áp dụng từ 10h-22h Ngày 21/5",
    },
    {
        id: "sample-promo-2", name: "Dưa Hấu Hắc Mỹ Nhân", kindId: "hotdeal-1",
        price1: 59000, price1Unit: "Kg", price2: 39000, price2Unit: "Kg",
        date: "Áp dụng từ 10h-22h Ngày 21/5",
    },
    {
        id: "sample-promo-3", name: "Táo Envy New Zealand", kindId: "sale-1",
        price1: 180000, price1Unit: "Kg", price2: 149000, price2Unit: "Kg",
        note: "Áp dụng khi mua từ 1kg", date: "Áp dụng từ 10h-22h Ngày 21/5",
    },
];

export default function PriceTagsPage() {
    // Primary states
    const [tags, setTags] = useState<PriceTag[]>(initialSamples);
    const [promoCards, setPromoCards] = useState<PromoCard[]>([]);
    const [activeTab, setActiveTab] = useState<"data" | "print" | "promo">("data");

    // Print & layout stylings
    const [settings, setSettings] = useState<PrintSettings>({
        pageSize: "A4",
        orientation: "portrait",
        columns: 5,
        rows: 5,
        borderColor: "#014122",
        textColor: "#014122",
        borderWidth: 3,
        showBorder: true,
    });

    const [promoPrintSettings, setPromoPrintSettings] = useState<PromoPrintSettings>({
        borderColor: "#d97706",
        textColor: "#1f2937",
        borderWidth: 2,
        showBorder: true,
        fontFamily: "sans",
        fontSizeTitle: 47,
        fontSizePrice: 80,
        fontSizeOriginal: 13,
        fontSizeNote: 11,
        brandColor: "#d97706"
    });

    const handleAddPromoCard = (card: PromoCard) => setPromoCards(prev => [card, ...prev]);
    const handleUpdatePromoCard = (updated: PromoCard) => setPromoCards(prev => prev.map(c => c.id === updated.id ? updated : c));
    const handleDeletePromoCard = (id: string) => setPromoCards(prev => prev.filter(c => c.id !== id));
    const handleClearPromoCards = () => setPromoCards([]);
    const handleLoadSamplePromos = () => setPromoCards(samplePromoCards);
    const handleDuplicatePromoCard = (id: string) => setPromoCards(prev => {
        const idx = prev.findIndex(c => c.id === id);
        if (idx === -1) return prev;
        const copy = { ...prev[idx], id: `promo-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` };
        const next = [...prev];
        next.splice(idx + 1, 0, copy);
        return next;
    });
    const handleMovePromoCard = (fromIdx: number, toIdx: number) => setPromoCards(prev => {
        if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= prev.length || toIdx >= prev.length) return prev;
        const next = [...prev];
        const [item] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, item);
        return next;
    });

    const handleAddTag = (newTag: PriceTag) => setTags((prev) => [newTag, ...prev]);
    const handleUpdateTag = (updated: PriceTag) => setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    const handleDeleteTag = (id: string) => setTags((prev) => prev.filter((t) => t.id !== id));
    const handleTagsLoaded = (importedTags: PriceTag[]) => setTags((prev) => [...importedTags, ...prev]);
    const handleClearAll = () => setTags([]);
    const handleLoadSamples = () => setTags(initialSamples);

    return (
        <Box className="pt-scope" sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#f0f7f3' }}>

            {/* Tab switcher — matches the MUI Tabs pattern used across the app (see sales/xnt/page.tsx) */}
            <Box sx={{
                bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', mb: 2.5,
                boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
            }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTabs-indicator': { bgcolor: GREEN, height: 3, borderRadius: '3px 3px 0 0' },
                        '& .MuiTab-root': {
                            fontWeight: 700, textTransform: 'none', fontSize: 13,
                            color: '#64748b', minHeight: 48, px: 2.5,
                            '&.Mui-selected': { color: GREEN },
                        },
                    }}
                >
                    <Tab value="data" icon={<FileSpreadsheet size={16} />} iconPosition="start" label={`Nhập dữ liệu (${tags.length})`} />
                    <Tab value="promo" icon={<Sparkles size={16} />} iconPosition="start" label={`Khuyến Mãi (${promoCards.length})`} />
                    <Tab value="print" icon={<Layers size={16} />} iconPosition="start" label="Sắp xếp & Trang In A4" />
                </Tabs>
            </Box>

            {activeTab === "data" && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TemplateFeatures onTagsLoaded={handleTagsLoaded} currentCount={tags.length} />
                    <ManualEditor
                        tags={tags}
                        onAddTag={handleAddTag}
                        onUpdateTag={handleUpdateTag}
                        onDeleteTag={handleDeleteTag}
                        onClearAll={handleClearAll}
                        onLoadSamples={handleLoadSamples}
                    />
                </Box>
            )}

            {activeTab === "promo" && (
                <div>
                    <PromoCardEditor cards={promoCards} settings={promoPrintSettings} onAddCard={handleAddPromoCard} onUpdateCard={handleUpdatePromoCard} onDeleteCard={handleDeletePromoCard} onClearAll={handleClearPromoCards} onLoadSamples={handleLoadSamplePromos} onDuplicateCard={handleDuplicatePromoCard} onMoveCard={handleMovePromoCard} />

                    {promoCards.length > 0 && (
                        <div className="mt-6">
                            <PromoPrintPreview cards={promoCards} settings={promoPrintSettings} setSettings={setPromoPrintSettings} />
                        </div>
                    )}
                </div>
            )}

            {activeTab === "print" && (
                tags.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-zinc-200 p-12 text-center max-w-lg mx-auto space-y-4">
                        <div>
                            <h3 className="text-base font-bold text-zinc-700">Chưa có sản phẩm nào được thiết lập!</h3>
                            <p className="text-xs text-zinc-400 mt-1">
                                Vui lòng quay lại Tab &quot;Nhập dữ liệu&quot; để nhập file Excel hoặc nạp dữ liệu từ kho lưu trữ mẫu của ứng dụng.
                            </p>
                        </div>
                        <button
                            onClick={() => setActiveTab("data")}
                            className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all"
                        >
                            Quay lại nạp sản phẩm
                        </button>
                    </div>
                ) : (
                    <PrintPreview tags={tags} settings={settings} setSettings={setSettings} />
                )
            )}

        </Box>
    );
}
