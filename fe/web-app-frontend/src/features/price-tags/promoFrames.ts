export type PageOrientation = 'portrait' | 'landscape';

export interface PromoFrame {
    id: string;
    name: string;
    cardsPerPage: number;
    columns: number;
    rows: number;
    /** Baked into the frame, not user-toggleable. The card always renders at its
     *  natural 210x99mm size and is uniformly scaled down to fit a cell (see
     *  PromoCardPrintView.tsx) — a cell shaped much taller than that ratio just
     *  wastes paper as blank margin around a normal-size card. Every preset below
     *  keeps the cell close to the natural ratio so little space is wasted. */
    pageOrientation: PageOrientation;
}

const A4_PORTRAIT = { width: 210, height: 297 };
const A4_LANDSCAPE = { width: 297, height: 210 };

/**
 * Grid presets spanning 3..16 cards/page. No "1" or "2" card/page option — at
 * that size the cell is far taller than the card's natural 210x99mm ratio, so
 * the uniformly-scaled card would sit at roughly its normal size with a large
 * blank margin around it, wasting most of the sheet.
 * Each cell's shape was picked to land as close as possible to (but never above)
 * the reference 210x99mm ratio (2.12), so content fills the cell without ever
 * overflowing it:
 *   grid3:  210 x 99mm     (ratio 2.12 — exact, the original "3 per page" design)
 *   grid4:  148.5 x 105mm  (ratio 1.41)
 *   grid6:  148.5 x 70mm   (ratio 2.12 — exact)
 *   grid8:  105 x 74.25mm  (ratio 1.41)
 *   grid9:  99 x 70mm      (ratio 1.41)
 *   grid12: 105 x 49.5mm   (ratio 2.12 — exact)
 *   grid16: 74.25 x 52.5mm (ratio 1.41)
 */
export const PROMO_FRAMES: PromoFrame[] = [
    { id: 'grid3', name: '3 tấm / trang — mặc định', cardsPerPage: 3, columns: 1, rows: 3, pageOrientation: 'portrait' },
    { id: 'grid4', name: '4 tấm / trang', cardsPerPage: 4, columns: 2, rows: 2, pageOrientation: 'landscape' },
    { id: 'grid6', name: '6 tấm / trang', cardsPerPage: 6, columns: 2, rows: 3, pageOrientation: 'landscape' },
    { id: 'grid8', name: '8 tấm / trang', cardsPerPage: 8, columns: 2, rows: 4, pageOrientation: 'portrait' },
    { id: 'grid9', name: '9 tấm / trang', cardsPerPage: 9, columns: 3, rows: 3, pageOrientation: 'landscape' },
    { id: 'grid12', name: '12 tấm / trang', cardsPerPage: 12, columns: 2, rows: 6, pageOrientation: 'portrait' },
    { id: 'grid16', name: '16 tấm / trang — gọn nhất', cardsPerPage: 16, columns: 4, rows: 4, pageOrientation: 'landscape' },
];

export interface ResolvedFrame extends PromoFrame {
    cardWidthMm: number;
    cardHeightMm: number;
    pageWidthMm: number;
    pageHeightMm: number;
}

/** Computes a frame's actual mm sizes. Orientation comes from the frame itself —
 *  not a separate toggle — so a frame can never accidentally end up with a cell
 *  shape its content will overflow. */
export function resolveFrame(frame: PromoFrame): ResolvedFrame {
    const page = frame.pageOrientation === 'portrait' ? A4_PORTRAIT : A4_LANDSCAPE;
    return {
        ...frame,
        pageWidthMm: page.width,
        pageHeightMm: page.height,
        cardWidthMm: page.width / frame.columns,
        cardHeightMm: page.height / frame.rows,
    };
}

/** Best-fit suggestion: the smallest frame that still fits every card on one page,
 *  falling back to the largest (16/page) frame once the card count exceeds it —
 *  still just a suggestion, the user can always pick a different frame. */
export function recommendFrame(cardCount: number): PromoFrame {
    const fit = PROMO_FRAMES.find(f => f.cardsPerPage >= cardCount);
    return fit ?? PROMO_FRAMES[PROMO_FRAMES.length - 1];
}
