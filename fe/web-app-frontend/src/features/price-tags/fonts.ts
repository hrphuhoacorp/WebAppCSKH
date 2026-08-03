import { Montserrat } from 'next/font/google';

/**
 * Self-hosted via next/font instead of a plain Google Fonts <link> — the link
 * approach depends on the browser actually fetching fonts.googleapis.com at
 * runtime, which ad-blockers/privacy extensions commonly block outright
 * (silently falling back to a system font, which is exactly what looked
 * "wrong" — not a bad font choice, the font just never loaded at all).
 * next/font downloads the font at build time and serves it from this same
 * origin, so it can't be blocked that way.
 */
export const montserrat = Montserrat({
    subsets: ['latin', 'vietnamese'],
    weight: ['700', '800', '900'],
    style: ['normal'],
    display: 'swap',
});
