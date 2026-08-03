'use client';

import React from "react";
import { PriceTag, PrintSettings } from "../types";
import PriceTagCard from "./PriceTagCard";

interface Props {
    pages: (PriceTag | null)[][];
    settings: PrintSettings;
    gapSize: string;
}

/**
 * Print-only content, isolated via react-to-print (see PrintPreview.tsx's
 * useReactToPrint). Because react-to-print clones just this ref'd subtree into
 * its own iframe, the dashboard sidebar/topbar are never part of the print
 * document — no CSS hiding hacks needed, unlike the original standalone app's
 * window.print() + #root/header/footer approach (which doesn't apply here:
 * Next.js has no #root, and the dashboard chrome isn't a header/footer tag).
 */
const PriceTagPrintView = React.forwardRef<HTMLDivElement, Props>(({ pages, settings, gapSize }, ref) => {
    const isPortrait = settings.orientation !== "landscape";

    return (
        <div ref={ref} className="pt-scope">
            <style>{`
                @page { size: A4 ${isPortrait ? "portrait" : "landscape"}; margin: 0; }
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .price-tag-print-page {
                    page-break-after: always;
                    break-after: page;
                }
                .price-tag-print-page:last-child {
                    page-break-after: auto;
                    break-after: auto;
                }
            `}</style>
            <div className="w-full flex flex-col font-sans">
                {pages.map((pageTags, pageIdx) => (
                    <div
                        key={`physical-print-${pageIdx}`}
                        className="price-tag-print-page"
                        style={{
                            gap: gapSize,
                            width: isPortrait ? "210mm" : "297mm",
                            height: isPortrait ? "297mm" : "210mm",
                            display: "grid",
                            gridTemplateColumns: isPortrait ? "repeat(3, 65mm)" : "repeat(4, 65mm)",
                            gridTemplateRows: isPortrait ? "repeat(7, 36mm)" : "repeat(5, 36mm)",
                            paddingLeft: isPortrait ? "7.5mm" : "18.5mm",
                            paddingRight: isPortrait ? "7.5mm" : "18.5mm",
                            paddingTop: isPortrait ? "15.5mm" : "10mm",
                            paddingBottom: isPortrait ? "15.5mm" : "10mm",
                            boxSizing: "border-box",
                            alignContent: "start",
                            justifyContent: "start",
                        }}
                    >
                        {pageTags.map((tag, i) => (
                            <div
                                key={tag ? `ptag-${tag.id}` : `pempty-${pageIdx}-${i}`}
                                className="h-full w-full"
                                style={{
                                    boxSizing: "border-box",
                                    width: "65mm",
                                    height: "36mm"
                                }}
                            >
                                {tag ? (
                                    <PriceTagCard tag={tag} settings={settings} preview={false} />
                                ) : (
                                    // Print blank sheets or a very subtle outline so trimming lines remain accessible
                                    <div
                                        className="h-full w-full bg-white rounded-[2px]"
                                        style={{
                                            border: "none",
                                            opacity: 0.15
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
});

PriceTagPrintView.displayName = 'PriceTagPrintView';

export default PriceTagPrintView;
