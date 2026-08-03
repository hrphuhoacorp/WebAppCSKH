'use client';

import React from "react";
import { PromoCard, PromoPrintSettings } from "../types";
import { PromoCardLayout, FieldConfig, DEFAULT_LAYOUT, BUILTIN_FIELD_CONFIGS, NEW_KIND_DEFAULT_FIELD_CONFIG } from "../promoLayout";
import { PageOrientation } from "../promoFrames";
import PromoCardPrint from "./PromoCardPrint";

interface Props {
    pages: (PromoCard | null)[][];
    settings: PromoPrintSettings;
    gapSize: string;
    /** Card box size in mm — driven by the chosen frame (see promoFrames.ts). */
    widthMm?: number;
    heightMm?: number;
    /** Full A4 page size in mm for the current orientation. */
    pageWidthMm?: number;
    pageHeightMm?: number;
    orientation?: PageOrientation;
    /** Grid arrangement for the page — how many card slots per row. Defaults to a
     *  single column (the original "3 stacked" behavior) when omitted. */
    columns?: number;
    /** Mỗi thẻ có thể là một "loại bảng giá" khác nhau nên layout phải giải theo TỪNG thẻ, không
     *  còn 1 layout dùng chung cho cả trang. */
    resolveLayout?: (card: PromoCard) => PromoCardLayout;
    /** Ô giá/ghi chú/ngày/badge nào bật cho từng thẻ — giải theo loại của thẻ đó, song song
     *  `resolveLayout`. */
    resolveFieldConfig?: (card: PromoCard) => FieldConfig;
}

const defaultResolveFieldConfig = (card: PromoCard): FieldConfig =>
    BUILTIN_FIELD_CONFIGS[card.kindId] ?? NEW_KIND_DEFAULT_FIELD_CONFIG;

/**
 * Same A4 grid used both for the on-screen preview (mounted visibly in
 * PromoPrintPreview.tsx) and as the print target (mounted hidden, ref'd via
 * useReactToPrint). Keeping one component for both avoids duplicating the
 * SALE/HOT DEAL badge clip-path shapes in two places.
 */
const PromoCardPrintView = React.forwardRef<HTMLDivElement, Props>(
    (
        {
            pages, settings, gapSize,
            widthMm = 210, heightMm = 99,
            pageWidthMm = 210, pageHeightMm = 297,
            orientation = 'portrait',
            columns = 1, resolveLayout = () => DEFAULT_LAYOUT,
            resolveFieldConfig = defaultResolveFieldConfig,
        },
        ref
    ) => {
        // The card only ever renders at its natural 210x99mm size (see PromoCardPrint.tsx).
        // A cell shaped differently than that ratio scales the whole card down by a single
        // uniform factor (never width and height independently) and centers it, so the cell's
        // own leftover space becomes plain margin instead of stretching the card's proportions.
        const uniformScale = Math.min(widthMm / 210, heightMm / 99);
        const scaledWidthMm = 210 * uniformScale;
        const scaledHeightMm = 99 * uniformScale;

        return (
            <div ref={ref} className="pt-scope print-preview-wrap">
                <style>{getPromoPrintCss(pageWidthMm, pageHeightMm, orientation)}</style>
                {pages.map((page, pageIndex) => (
                    <div
                        key={pageIndex}
                        className="a4-page"
                        style={{ width: `${pageWidthMm}mm`, height: `${pageHeightMm}mm`, gap: gapSize, display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, alignContent: 'start' }}
                    >
                        {page.map((card, index) => (
                            <div
                                key={card?.id || `blank-${pageIndex}-${index}`}
                                className="a5-slot"
                                style={{ width: `${widthMm}mm`, height: `${heightMm}mm`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {card && (
                                    <div style={{ width: `${scaledWidthMm}mm`, height: `${scaledHeightMm}mm`, overflow: 'hidden' }}>
                                        <div style={{ width: '210mm', height: '99mm', transform: `scale(${uniformScale})`, transformOrigin: 'top left' }}>
                                            <PromoCardPrint card={card} settings={settings} layout={resolveLayout(card)} fieldConfig={resolveFieldConfig(card)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }
);

PromoCardPrintView.displayName = 'PromoCardPrintView';

export default PromoCardPrintView;

function getPromoPrintCss(pageWidthMm: number, pageHeightMm: number, orientation: PageOrientation) {
    return `
.print-preview-wrap{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:18px;
}

.a4-page{
  background:#fff;
  box-shadow:0 4px 18px rgba(0,0,0,.14);
  justify-content:flex-start;
  overflow:hidden;
}

.a5-slot{
  overflow:hidden;
  break-inside:avoid;
  page-break-inside:avoid;
}
  .old-number{
  position:relative;
  font-size:22.5mm;
  letter-spacing:.1mm;
}
.old-number::after{
  content:"";
  position:absolute;
  left:0;
  right:0;
  top:50%;
  height:1.8mm;
  background:#007044;
  transform:translateY(-50%) rotate(-1deg);
  border-radius:5mm;
}

.sale-badge-wrap{
  width:88mm;
  height:58mm;
  filter:drop-shadow(0 .5mm .5mm rgba(0,0,0,.18));
  transform:rotate(9deg);
}.sale-badge{
  position:absolute;
  inset:0;
  background:var(--badge-border-color,#e60008);
  clip-path:polygon(0% 22%, 8% 13%, 5% 0%, 18% 7%, 25% 0%, 32% 8%, 43% 0%, 50% 8%, 61% 0%, 68% 9%, 79% 1%, 86% 12%, 100% 7%, 94% 23%, 100% 32%, 92% 42%, 100% 52%, 91% 61%, 100% 72%, 88% 78%, 92% 92%, 78% 88%, 70% 100%, 61% 89%, 51% 100%, 43% 89%, 32% 100%, 25% 88%, 13% 96%, 13% 82%, 0% 78%, 9% 66%, 0% 56%, 10% 46%, 0% 36%, 10% 28%);
}
.sale-badge::before{
  content:"";
  position:absolute;
  inset:2mm;
  background:transparent;
  clip-path:inherit;
  box-shadow:inset 0 0 0 1.2mm rgba(255,255,255,.92);
  opacity:.9;
}
.sale-text{
  position:absolute;
  top:25mm;
  left:13mm;
  color:var(--badge-text-color,#fff);
  font-size:15mm;
  font-weight:900;
  letter-spacing:1mm;
  line-height:1;
  transform:rotate(20deg);
}
.hotdeal-wrap{
  width:75mm;
  height:58mm;
  filter:drop-shadow(0 .6mm .4mm rgba(0,0,0,.16));
  transform:rotate(8deg);
}
.hotdeal-border,
.hotdeal-shape{
  position:absolute;
  clip-path:polygon(0 10%, 13% 6%, 17% 0, 27% 6%, 36% 0, 45% 7%, 55% 0, 64% 7%, 75% 0, 82% 9%, 95% 5%, 91% 20%, 100% 27%, 90% 38%, 100% 48%, 88% 58%, 100% 70%, 86% 76%, 89% 93%, 74% 88%, 66% 100%, 57% 89%, 46% 100%, 38% 88%, 27% 98%, 20% 85%, 7% 91%, 8% 76%, 0 69%, 10% 58%, 0 47%, 10% 37%, 0 28%, 11% 18%);
}
.hotdeal-border{inset:0;background:var(--badge-border-color,#e60008);}
.hotdeal-shape{inset:2.7mm;background:var(--badge-fill-color,#ffe21f);overflow:hidden;}
.hotdeal-shape::after{
  content:"";
  position:absolute;
  inset:0;
  background-image:radial-gradient(rgba(0,0,0,.15) 0 .45mm, transparent .48mm);
  background-size:2mm 2mm;
  opacity:.65;
  transform:rotate(-8deg) scale(1.2);
}
.hotdeal-text{
  position:absolute;
  top:17mm;
  left:17mm;
  color:var(--badge-text-color,var(--badge-border-color,#e60008));
  font-size:12mm;
  font-weight:900;
  line-height:.9;
  text-align:center;
  letter-spacing:.5mm;
  transform:rotate(7deg);
  text-transform:uppercase;
  -webkit-text-stroke:.7mm #fff;
  paint-order:stroke fill;
  text-shadow:1mm 1mm 0 rgba(0,0,0,.18);
}


@media print{
  @page{ size:A4 ${orientation}; margin:0; }
  html,body{ margin:0 !important; padding:0 !important; background:#fff !important; }
  .print-preview-wrap{ display:block !important; margin:0 !important; padding:0 !important; }
  .a4-page{
    width:${pageWidthMm}mm !important;
    height:${pageHeightMm}mm !important;
    box-shadow:none !important;
    page-break-after:always;
    break-after:page;
    margin:0 !important;
  }
  .a4-page:last-child{ page-break-after:auto; break-after:auto; }
}
`;
}
