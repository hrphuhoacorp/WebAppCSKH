import '@/features/price-tags/price-tags.css';

/**
 * PromoCardPrint.tsx still references the literal font-family name "Montserrat"
 * directly (not yet redesigned — promo cards are a later pass), so this CDN
 * link stays for that. PriceTagCard.tsx's own Montserrat is self-hosted via
 * next/font instead (see ../fonts.ts) — more reliable than this <link>, since
 * ad-blockers/privacy extensions commonly block fonts.googleapis.com outright,
 * silently falling back to a system font with no visible error.
 */
export default function PriceTagsLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {/* precedence is required for React 19 to hoist/dedupe this into <head> —
                without it, the <link> renders in place inside <body> and the browser
                may not load the stylesheet at all, silently falling back to a system font. */}
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,600;0,700;0,800;0,900;1,900&display=swap"
                precedence="default"
            />
            {children}
        </>
    );
}
