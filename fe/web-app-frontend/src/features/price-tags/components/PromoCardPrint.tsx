'use client';

import { useRef, type CSSProperties, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { PromoCard, PromoPrintSettings } from "../types";
import {
    PromoCardLayout, PromoElementKey, ElementBox, ELEMENT_NATIVE_SIZE_MM,
    CARD_WIDTH_MM, CARD_HEIGHT_MM, FLOW_KEYS, FLOW_COLUMN_LEFT_PCT, FLOW_COLUMN_WIDTH_PCT, pctToMm,
    FieldConfig, PriceSlotConfig, PRICE_SLOT_KEYS,
} from "../promoLayout";

interface PromoCardPrintProps {
    card: PromoCard;
    settings: PromoPrintSettings;
    /** Định nghĩa ô giá/ghi chú/ngày/badge nào bật cho loại bảng giá của thẻ này — xem promoLayout.ts. */
    fieldConfig: FieldConfig;
    /** Layout đã phân giải sẵn (theo loại bảng giá hoặc override riêng thẻ) — xem promoLayout.ts. */
    layout: PromoCardLayout;
    /** Khi có, mọi phần tử (trừ stripe) trở thành kéo-được + resize-được, báo vị trí/kích thước
     *  mới ra ngoài thay vì chỉ hiển thị tĩnh — chỉ dùng trong PromoLayoutEditor.tsx. */
    onElementDrag?: (key: PromoElementKey, box: Pick<ElementBox, 'xPct' | 'yPct' | 'align'>) => void;
    onElementResize?: (key: PromoElementKey, box: Pick<ElementBox, 'widthPct' | 'heightPct' | 'auto'>) => void;
    /** Bấm vào 1 phần tử (trước khi biết có kéo hay không) — dùng để chọn phần tử cho panel số
     *  liệu trong PromoLayoutEditor.tsx. */
    onElementSelect?: (key: PromoElementKey) => void;
    /** Phần tử đang được chọn trong panel số liệu — viền xanh lá để phân biệt. */
    selectedKey?: PromoElementKey | null;
}

const formatPrice = (value?: number) => (value || 0).toLocaleString("vi-VN");

const MIN_BOX_PCT = 5;
const MAX_BOX_PCT = 150;
const GAP_MIN_PCT = -10;
const GAP_MAX_PCT = 60;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

interface ElementFrameProps {
    elKey: PromoElementKey;
    box: ElementBox;
    editable: boolean;
    isSelected?: boolean;
    frameRef?: (el: HTMLDivElement | null) => void;
    onDragStart: (e: ReactMouseEvent) => void;
    onResizeStart?: (e: ReactMouseEvent) => void;
    children: ReactNode;
}

/** Khung box tuyệt đối — chỉ còn dùng cho logo/badge (vị trí + kích thước cố định, resize kiểu
 *  phóng to/thu nhỏ khung ảnh). Các phần tử CHỮ giờ render theo dòng chảy, xem FlowChild bên dưới.
 *  Đặt ở module scope để tránh tạo component mới mỗi lần render. */
function ElementFrame({ elKey, box: elBox, editable, isSelected, frameRef, onDragStart, onResizeStart, children }: ElementFrameProps) {
    const outlineColor = isSelected ? '#16a34a' : 'rgba(37,99,235,.5)';

    const frameStyle: CSSProperties = {
        position: "absolute",
        left: `${elBox.xPct}%`,
        top: `${elBox.yPct}%`,
        width: `${elBox.widthPct}%`,
        height: `${elBox.heightPct}%`,
    };

    if (editable) {
        frameStyle.cursor = 'move';
        frameStyle.outline = `1px dashed ${outlineColor}`;
        frameStyle.outlineOffset = 2;
    }

    const native = ELEMENT_NATIVE_SIZE_MM[elKey];
    const boxWidthMm = (elBox.widthPct / 100) * CARD_WIDTH_MM;
    const boxHeightMm = (elBox.heightPct / 100) * CARD_HEIGHT_MM;
    const scale = Math.min(boxWidthMm / native.width, boxHeightMm / native.height);

    return (
        <div ref={frameRef} style={frameStyle} onMouseDown={onDragStart}>
            <div style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: `${native.width}mm`, height: `${native.height}mm`, transform: `scale(${scale})`, flex: "none" }}>
                    {children}
                </div>
            </div>
            {onResizeStart && (
                <div
                    onMouseDown={onResizeStart}
                    style={{
                        position: 'absolute', right: -6, bottom: -6, width: 14, height: 14, borderRadius: '50%',
                        background: '#2563eb', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.4)',
                        cursor: 'nwse-resize', zIndex: 10,
                    }}
                />
            )}
        </div>
    );
}

interface FlowChildProps {
    box: ElementBox;
    editable: boolean;
    isSelected?: boolean;
    frameRef?: (el: HTMLDivElement | null) => void;
    onDragStart: (e: ReactMouseEvent) => void;
    onResizeStart?: (e: ReactMouseEvent) => void;
    children: ReactNode;
}

const ALIGN_TO_FLEX: Record<'left' | 'center' | 'right' | 'custom', CSSProperties['alignSelf']> = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
    custom: 'flex-start',
};

/** Phần tử CHỮ trong dòng chảy tài liệu (giống Word): không định vị tuyệt đối — `marginTop` là
 *  khoảng cách so với mép dưới phần tử liền trước ĐÃ THỰC SỰ render, nên phần tử phía trên cao lên
 *  (xuống dòng) sẽ tự đẩy phần tử này xuống, không bao giờ đè lên nhau. Kéo chuột dọc trên cả dòng
 *  đổi khoảng cách trên (marginTop). Tay cầm resize (giữa-phải) đổi BỀ NGANG khung chữ (vùng xuống
 *  dòng) — kéo 1 lần tự chuyển sang bề ngang thủ công; chiều cao luôn tự nhiên theo số dòng, không
 *  có khái niệm resize chiều cao. "Căn lề" (trái/giữa/phải, xem `align`) đặt cả hộp trong cột dòng
 *  chảy chung. */
function FlowChild({ box: elBox, editable, isSelected, frameRef, onDragStart, onResizeStart, children }: FlowChildProps) {
    const outlineColor = isSelected ? '#16a34a' : 'rgba(37,99,235,.5)';
    const isAuto = elBox.auto;
    const isCustomAlign = elBox.align === 'custom';

    const style: CSSProperties = {
        position: "relative",
        marginTop: `${pctToMm(elBox.yPct, 'y')}mm`,
        width: isAuto ? "max-content" : `${pctToMm(elBox.widthPct, 'x')}mm`,
        maxWidth: "100%",
        // 'custom' = đã tự kéo ngang bằng chuột — dùng đúng offset xPct đã lưu (marginLeft) thay
        // vì canh theo flexbox, để không bị "hút" về giữa/mép mỗi lần render lại.
        alignSelf: isCustomAlign ? 'flex-start' : ALIGN_TO_FLEX[elBox.align ?? 'center'],
        marginLeft: isCustomAlign ? `${pctToMm(elBox.xPct, 'x')}mm` : undefined,
    };

    if (editable) {
        style.cursor = 'move';
        style.outline = `1px dashed ${outlineColor}`;
        style.outlineOffset = 2;
    }

    return (
        <div ref={frameRef} style={style} onMouseDown={onDragStart}>
            {children}
            {onResizeStart && (
                <div
                    onMouseDown={onResizeStart}
                    style={{
                        position: 'absolute', right: -6, top: '50%', marginTop: -7, width: 14, height: 14, borderRadius: '50%',
                        background: '#2563eb', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.4)',
                        cursor: 'ew-resize', zIndex: 10,
                    }}
                />
            )}
        </div>
    );
}

/**
 * Logo/badge: hộp kéo-thả + resize tuyệt đối, phóng to/thu nhỏ khung ảnh (ELEMENT_NATIVE_SIZE_MM
 * + `transform:scale()`) — xem ElementFrame.
 *
 * Các phần tử CHỮ (FLOW_KEYS): render theo DÒNG CHẢY TÀI LIỆU trong 1 cột chung (canh giữa, tránh
 * vùng badge), không còn định vị tuyệt đối độc lập — xem FlowChild. Nhờ vậy phần tử nào cao lên vì
 * nội dung dài/cỡ chữ to sẽ tự đẩy các phần tử BÊN DƯỚI nó xuống theo, không đè chồng lên nhau như
 * trước. Mặc định ở chế độ "tự giãn theo nội dung" (`box.auto === true`) — hộp luôn vừa khít chữ
 * hiện tại theo chiều rộng; kéo resize 1 lần sẽ tự chuyển phần tử đó sang chiều rộng thủ công
 * (chữ vẫn xuống dòng vừa khít, không bao giờ tràn/bị cắt).
 */
/** Cỡ chữ 1 ô giá theo `sizeTier`. Kiểu `strike` (giá gốc gạch ngang) dùng mm cố định — không theo
 *  thanh trượt "Cỡ chữ giá" như các kiểu còn lại, giữ đúng hành vi cũ (giá gốc không phóng to/nhỏ
 *  theo settings). */
function priceFontSize(cfg: PriceSlotConfig, settings: PromoPrintSettings): string {
    if (cfg.fontSizeMm !== undefined) return `${cfg.fontSizeMm}mm`;
    if (cfg.style === 'strike') {
        return cfg.sizeTier === 'lg' ? '15mm' : cfg.sizeTier === 'md' ? '11mm' : '8mm';
    }
    const base = settings.fontSizePrice;
    const px = cfg.sizeTier === 'lg' ? base : cfg.sizeTier === 'md' ? base - 20 : base - 40;
    return `${Math.max(px, 20)}px`;
}

export default function PromoCardPrint({ card, settings, fieldConfig, layout, onElementDrag, onElementResize, onElementSelect, selectedKey }: PromoCardPrintProps) {
    const green = "#075c4f";
    const green2 = "#007044";
    const red = "#e60008";
    const yellow = "#ffe21f";
    const cardRef = useRef<HTMLDivElement>(null);
    const flowColumnRef = useRef<HTMLDivElement>(null);
    const frameRefs = useRef<Partial<Record<PromoElementKey, HTMLDivElement | null>>>({});
    const editable = !!(onElementDrag || onElementResize);

    const displayName = [card.name].filter(Boolean).join("\n");
    const isFlowKey = (key: PromoElementKey) => FLOW_KEYS.includes(key);

    const handleDragStart = (key: PromoElementKey) => (e: ReactMouseEvent) => {
        onElementSelect?.(key);
        if (!onElementDrag || !cardRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = cardRef.current.getBoundingClientRect();
        const flow = isFlowKey(key);
        // Kéo theo ĐỘ LỆCH so với điểm bấm chuột ban đầu, không neo góc phần tử vào toạ độ
        // chuột — nếu không, bấm ở giữa/mép phần tử rồi kéo sẽ làm nó nhảy giật để góc trên-trái
        // chạy về đúng vị trí con trỏ (đúng cảm giác "khó chịu" khi kéo).
        const startBox = layout[key];
        const startX = e.clientX;
        const startY = e.clientY;
        // Phần tử chữ: điểm X bắt đầu lấy từ vị trí ĐANG HIỂN THỊ thật (offset so với mép trái
        // cột dòng chảy) — vì trước khi kéo, phần tử có thể đang canh giữa/trái/phải bằng flexbox
        // (align !== 'custom'), không dùng xPct đã lưu (có thể lệch hẳn) — nhờ vậy không bị giật
        // hình ngay lần kéo ngang đầu tiên.
        const flowEl = frameRefs.current[key];
        const flowColumnEl = flowColumnRef.current;
        const startFlowXPct = (flow && flowEl && flowColumnEl)
            ? ((flowEl.getBoundingClientRect().left - flowColumnEl.getBoundingClientRect().left) / rect.width) * 100
            : startBox.xPct;

        const handleMove = (moveEvent: globalThis.MouseEvent) => {
            const dyPct = ((moveEvent.clientY - startY) / rect.height) * 100;
            const dxPct = ((moveEvent.clientX - startX) / rect.width) * 100;
            if (flow) {
                // Phần tử chữ: kéo dọc đổi khoảng cách trên (gap); kéo ngang chuyển sang canh lề
                // tự do (custom) và đổi offset trong cột dòng chảy.
                const yPct = clamp(startBox.yPct + dyPct, GAP_MIN_PCT, GAP_MAX_PCT);
                const xPct = clamp(startFlowXPct + dxPct, -5, 100);
                onElementDrag(key, { xPct: round1(xPct), yPct: round1(yPct), align: 'custom' });
                return;
            }
            const xPct = clamp(startBox.xPct + dxPct, -20, 120);
            const yPct = clamp(startBox.yPct + dyPct, -20, 120);
            onElementDrag(key, { xPct: round1(xPct), yPct: round1(yPct) });
        };
        const handleUp = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    };

    const handleResizeStart = (key: PromoElementKey) => (e: ReactMouseEvent) => {
        onElementSelect?.(key);
        if (!onElementResize || !cardRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = cardRef.current.getBoundingClientRect();
        const flow = isFlowKey(key);
        // Dùng kích thước ĐANG HIỂN THỊ thật (kể cả khi đang ở chế độ tự giãn) làm điểm bắt đầu,
        // không dùng widthPct/heightPct đã lưu (có thể lệch nếu đang auto) — nhờ vậy chuyển từ
        // tự động sang thủ công không bị giật kích thước.
        const frameEl = frameRefs.current[key];
        const startRect = frameEl?.getBoundingClientRect();
        const startWidthPct = startRect ? (startRect.width / rect.width) * 100 : layout[key].widthPct;
        const startHeightPct = startRect ? (startRect.height / rect.height) * 100 : layout[key].heightPct;
        const startX = e.clientX;
        const startY = e.clientY;

        const handleMove = (moveEvent: globalThis.MouseEvent) => {
            const dxPct = ((moveEvent.clientX - startX) / rect.width) * 100;
            const newWidthPct = round1(clamp(startWidthPct + dxPct, MIN_BOX_PCT, MAX_BOX_PCT));
            if (flow) {
                // Phần tử chữ: chỉ đổi bề ngang (vùng xuống dòng) — chiều cao luôn tự nhiên theo
                // dòng chảy, không có khái niệm resize chiều cao.
                onElementResize(key, { widthPct: newWidthPct, heightPct: layout[key].heightPct, auto: false });
                return;
            }
            // logo/badge: giữ nguyên kiểu resize khung ảnh, đổi độc lập cả 2 chiều.
            const dyPct = ((moveEvent.clientY - startY) / rect.height) * 100;
            onElementResize(key, {
                widthPct: newWidthPct,
                heightPct: round1(clamp(startHeightPct + dyPct, MIN_BOX_PCT, MAX_BOX_PCT)),
                auto: false,
            });
        };
        const handleUp = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    };

    const frame = (elKey: PromoElementKey, children: ReactNode) => (
        <ElementFrame
            elKey={elKey}
            box={layout[elKey]}
            editable={editable}
            isSelected={selectedKey === elKey}
            frameRef={(el) => { frameRefs.current[elKey] = el; }}
            onDragStart={handleDragStart(elKey)}
            onResizeStart={onElementResize ? handleResizeStart(elKey) : undefined}
        >
            {children}
        </ElementFrame>
    );

    const flowChild = (elKey: PromoElementKey, children: ReactNode) => (
        <FlowChild
            key={elKey}
            box={layout[elKey]}
            editable={editable}
            isSelected={selectedKey === elKey}
            frameRef={(el) => { frameRefs.current[elKey] = el; }}
            onDragStart={handleDragStart(elKey)}
            onResizeStart={onElementResize ? handleResizeStart(elKey) : undefined}
        >
            {children}
        </FlowChild>
    );

    const stripeBox = layout.stripe;

    const renderPriceSlot = (cfg: PriceSlotConfig, value: number | undefined, unit: string | undefined) => {
        const color = cfg.style === 'strike' ? green2 : cfg.style === 'highlight' ? red : green;
        return (
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    alignItems: "flex-end",
                    gap: cfg.style === 'strike' ? "4mm" : "3.2mm",
                    color,
                    fontWeight: 900,
                    lineHeight: cfg.style === 'strike' ? 0.9 : 0.92,
                }}
            >
                <span
                    className={cfg.style === 'strike' ? 'old-number' : undefined}
                    style={{
                        fontSize: priceFontSize(cfg, settings),
                        letterSpacing: cfg.style === 'strike' ? undefined : "0.15mm",
                        textShadow: cfg.style === 'strike' ? undefined : "0 0.45mm 0 rgba(0,0,0,.08)",
                    }}
                >
                    {formatPrice(value)}
                </span>
                <span style={{ fontSize: "9mm", marginBottom: cfg.style === 'strike' ? "1.8mm" : "3.7mm", fontWeight: 900 }}>
                    đ/{unit || "kg"}
                </span>
            </div>
        );
    };

    return (
        <div
            ref={cardRef}
            className="promo-a5-card"
            style={{
                width: "210mm",
                height: "99mm",
                background: "#fff",
                position: "relative",
                overflow: "hidden",
                color: green,
                fontFamily: "Montserrat, Arial, sans-serif",
                border: settings.showBorder ? `${settings.borderWidth}px solid ${settings.borderColor}` : "none",
            }}
        >
            {/* Left edge stripe decoration — trang trí, luôn cao hết thẻ, không dùng cơ chế
                box+scale như các phần tử chữ (không có "nội dung" để scale). */}
            <div
                onMouseDown={handleDragStart('stripe')}
                style={{
                    position: "absolute",
                    left: `${stripeBox.xPct}%`,
                    top: 0,
                    bottom: 0,
                    width: `${stripeBox.widthPct}%`,
                    cursor: editable ? 'move' : undefined,
                    background: `repeating-linear-gradient(
      45deg,
      ${green} 0 4mm,
      ${yellow} 4mm 7.2mm,
      ${green} 7.2mm 10.8mm
    )`,
                }}
            />

            {/* Logo */}
            {frame("logo", (
                <img
                    src="/images/Logo/PHF_FALOGO.png"
                    alt="Logo"
                    style={{ width: "100%", height: "auto", pointerEvents: editable ? 'none' : undefined }}
                />
            ))}

            {/* SALE / HOT DEAL badge */}
            {fieldConfig.badge !== 'none' && frame("badge",
                fieldConfig.badge === 'hotdeal'
                    ? <HotDealBadge label={fieldConfig.badgeLabel} borderColor={fieldConfig.badgeBorderColor} fillColor={fieldConfig.badgeFillColor} textColor={fieldConfig.badgeTextColor} />
                    : <SaleBadge label={fieldConfig.badgeLabel} borderColor={fieldConfig.badgeBorderColor} textColor={fieldConfig.badgeTextColor} />
            )}

            {/* Cột dòng chảy — chứa toàn bộ phần tử CHỮ theo đúng thứ tự. */}
            <div
                ref={flowColumnRef}
                style={{
                    position: "absolute",
                    left: `${FLOW_COLUMN_LEFT_PCT}%`,
                    top: 0,
                    width: `${FLOW_COLUMN_WIDTH_PCT}%`,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                {flowChild("title", (
                    <h1
                        style={{
                            whiteSpace: "pre-line",
                            fontWeight: 800,
                            fontSize: layout.title.fontSizeMm ? `${layout.title.fontSizeMm}mm` : `${settings.fontSizeTitle}px`,
                            lineHeight: 1.15,
                            letterSpacing: "-1.3mm",
                            margin: 0,
                            textAlign: "center",
                            pointerEvents: editable ? 'none' : undefined,
                        }}
                        className="promo-title"
                    >
                        {displayName}
                    </h1>
                ))}

                {/* Render theo elementOrder — bỏ qua phần tử bị tắt hoặc không có dữ liệu. */}
                {(fieldConfig.elementOrder ?? FLOW_KEYS).map((key) => {
                    if (key === 'title') return null; // title đã render riêng ở trên

                    if (PRICE_SLOT_KEYS.includes(key as typeof PRICE_SLOT_KEYS[number])) {
                        const pKey = key as typeof PRICE_SLOT_KEYS[number];
                        const cfg = fieldConfig.priceSlots[pKey];
                        const value = card[pKey];
                        if (!cfg || value === undefined) return null;
                        return flowChild(key, renderPriceSlot(cfg, value, card[`${pKey}Unit` as const]));
                    }

                    if (key === 'note') {
                        if (!fieldConfig.noteEnabled || !card.note) return null;
                        return flowChild(key, (
                            <div style={{ textAlign: "center", fontWeight: 900, lineHeight: 0.92, fontSize: layout.note.fontSizeMm ? `${layout.note.fontSizeMm}mm` : "7.5mm" }}>
                                ** {card.note} **
                            </div>
                        ));
                    }

                    if (key === 'date') {
                        if (!fieldConfig.dateEnabled) return null;
                        return flowChild(key, (
                            <div style={{ color: "#0f7b55", fontStyle: "italic", fontWeight: 500, fontSize: layout.date.fontSizeMm ? `${layout.date.fontSizeMm}mm` : "8.3mm", lineHeight: 1.55, textAlign: "center" }}>
                                <div>**{card.date || "Áp dụng duy nhất ngày 23/05"}</div>
                            </div>
                        ));
                    }

                    return null;
                })}
            </div>
        </div>
    );
}

function SaleBadge({ label, borderColor, textColor }: { label?: string; borderColor?: string; textColor?: string }) {
    const lines = (label ?? 'SALE').split('\n');
    return (
        <div className="sale-badge-wrap" aria-label="Sale"
            style={{
                '--badge-border-color': borderColor ?? '#e60008',
                ...(textColor ? { '--badge-text-color': textColor } : {}),
            } as React.CSSProperties}>
            <div className="sale-badge" />
            <div className="sale-text">
                {lines.map((l, i) => <span key={i}>{l}{i < lines.length - 1 && <br />}</span>)}
            </div>
        </div>
    );
}

function HotDealBadge({ label, borderColor, fillColor, textColor }: { label?: string; borderColor?: string; fillColor?: string; textColor?: string }) {
    const lines = (label ?? 'HOT\nDEAL').split('\n');
    return (
        <div className="hotdeal-wrap" aria-label="Hot Deal"
            style={{
                '--badge-border-color': borderColor ?? '#e60008',
                '--badge-fill-color': fillColor ?? '#ffe21f',
                ...(textColor ? { '--badge-text-color': textColor } : {}),
            } as React.CSSProperties}>
            <div className="hotdeal-border" />
            <div className="hotdeal-shape" />
            <div className="hotdeal-text">
                {lines.map((l, i) => <span key={i}>{l}{i < lines.length - 1 && <br />}</span>)}
            </div>
        </div>
    );
}

