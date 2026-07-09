// Port nguyên từ fe/web-app-frontend/public/js/nxt-core.js: isHeaderLine, looksLikePriceOrDate,
// parseQtyFromRest, parseCodeQtyText — dùng chung cho Gói ra/Tồn CN/Hủy giỏ (mọi màn "dán danh
// sách" đều parse theo cùng 1 luật). Đây là logic PARSE/HIỂN THỊ (đọc text người dùng dán ra
// preview trước khi lưu), không phải nghiệp vụ dữ liệu — nghiệp vụ (cộng dồn, ghi log, đồng bộ
// tồn đầu ngày mai...) luôn nằm ở backend (NxtService.cs). Giữ đồng bộ với nxt-core.js nếu sửa.

export const VALID_CODE_PREFIX = /^(H|GT|BK|SON|TEMP|TMP|AT)[A-Z0-9-]*/i;
export const ITEM_CODE_REGEX = /\b(SON[A-Za-z0-9-]*|TEMP[A-Za-z0-9-]*|TMP[A-Za-z0-9-]*|[A-Za-z]{1,3}\d+[A-Za-z0-9-]*)\b/i;

function removeAccent(str: string): string {
    return String(str || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

export function number(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const s = String(value || '').replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}

// isHeaderLine — nhận diện dòng tiêu đề (tổng, ngày, chi nhánh...) để bỏ qua không báo lỗi. Đã vá
// thêm 2 pattern "tồn giỏ <CN> <ngày>" và "giỏ <phân loại>" (xem nxt-core.js) — sửa đồng bộ ở đây
// nếu sửa bên JS.
export function isHeaderLine(clean: string): boolean {
    const noAccent = removeAccent(clean).toLowerCase();
    if (/^(tong|total)\b/.test(noAccent)) return true;
    if (/^ngay\s+\d{1,2}[/-]\d{1,2}/.test(noAccent)) return true;
    if (/^(pl|phu loi|nq|ngo quyen|lt|lai thieu)\s+\d{1,2}[/-]\d{1,2}/.test(noAccent)) return true;
    if (/^(pl|phu loi|nq|ngo quyen|lt|lai thieu)$/.test(noAccent)) return true;
    if (/^ton(\s+gio|\s+kho)?\b/.test(noAccent)
        && (/\b(pl|nq|lt|phu loi|ngo quyen|lai thieu)\b/.test(noAccent) || /\d{1,2}[/-]\d{1,2}/.test(noAccent))
        && !ITEM_CODE_REGEX.test(clean)) return true;
    if (/^gio\b/.test(noAccent) && !/\d/.test(noAccent)) return true;
    return false;
}

export function looksLikePriceOrDate(token: string): boolean {
    const t = String(token || '').trim().toUpperCase();
    if (/^\d{1,2}[/-]\d{1,2}/.test(t)) return true;
    if (/^\d+([.,]\d+)?K$/.test(t)) return true;
    if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return true;
    return false;
}

// Trả về số lượng đọc được, hoặc null nếu KHÔNG tìm thấy số lượng nào (khác 0 — 0 nghĩa là tìm
// thấy nhưng giá trị là 0). Không mặc định về 1, để parseCodeQtyText quyết định chặn thay vì âm
// thầm ghi sai SL.
export function parseQtyFromRest(rest: string): number | null {
    const s = String(rest || '').trim();
    if (!s) return null;

    const directPlus = s.match(/^\s*(?:[:：\-–—]|x|X|sl|SL|số lượng|so luong)?\s*(-?\d+(?:\s*\+\s*-?\d+)+)\b/i);
    if (directPlus) return directPlus[1].split('+').reduce((sum, value) => sum + number(value.trim()), 0);

    const directQty = s.match(/^\s*(?:[:：\-–—]|x|X|sl|SL|số lượng|so luong)?\s*(-?\d+(?:[.,]\d+)?)\b/i);
    if (directQty && !looksLikePriceOrDate(directQty[1])) return number(directQty[1].replace(',', '.'));

    const laterPlus = s.match(/\b(-?\d+(?:\s*\+\s*-?\d+)+)\b/);
    if (laterPlus) return laterPlus[1].split('+').reduce((sum, value) => sum + number(value.trim()), 0);

    const laterQty = s.match(/\b(?:sl|so luong|số lượng|qty)?\s*(-?\d+(?:[.,]\d+)?)\b/i);
    if (laterQty && !looksLikePriceOrDate(laterQty[1])) return number(laterQty[1].replace(',', '.'));

    return null;
}

export type ParsedCodeQtyRow = {
    date?: string;
    branch?: string;
    itemCode: string;
    qty: number;
    raw: string;
    _error?: string;
    [key: string]: unknown;
};

// parseCodeQtyText — port nguyên nxt-core.js, kể cả cơ chế ghép dòng kế tiếp làm số lượng (dán
// Zalo hay tách "mã" và "SL/lý do" thành 2 dòng riêng) và việc CHẶN thay vì âm thầm bỏ qua khi
// không đọc được số lượng (đã sửa hồi đầu phiên — không được quay lại mặc định về 1).
export function parseCodeQtyText(text: string, defaults: Record<string, unknown> = {}): ParsedCodeQtyRow[] {
    const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const rows: ParsedCodeQtyRow[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const clean = line.replace(/[，,;]/g, ' ').trim();
        if (isHeaderLine(clean)) continue;
        const codeMatch = clean.match(ITEM_CODE_REGEX);
        if (!codeMatch) {
            rows.push({ ...defaults, itemCode: '???', qty: 0, raw: line, _error: 'Không tìm thấy mã hợp lệ trong dòng này' });
            continue;
        }
        const itemCode = codeMatch[1].toUpperCase();
        if (!VALID_CODE_PREFIX.test(itemCode)) {
            rows.push({ ...defaults, itemCode, qty: 0, raw: line, _error: `Mã "${itemCode}" không đúng tiền tố (H/GT/BK/SON/TEMP/TMP/AT)` });
            continue;
        }
        if (looksLikePriceOrDate(itemCode)) {
            rows.push({ ...defaults, itemCode, qty: 0, raw: line, _error: `"${itemCode}" trông giống ngày/giá, bỏ qua` });
            continue;
        }
        const rest = clean.slice((codeMatch.index ?? 0) + codeMatch[0].length).trim();
        let qty = parseQtyFromRest(rest);
        let raw = line;

        if (qty === null) {
            const nextLine = lines[i + 1];
            const nextClean = nextLine ? nextLine.replace(/[，,;]/g, ' ').trim() : '';
            const nextIsOwnCode = !!nextClean && !isHeaderLine(nextClean) && ITEM_CODE_REGEX.test(nextClean);
            if (nextLine && !isHeaderLine(nextClean) && !nextIsOwnCode) {
                const nextQty = parseQtyFromRest(nextClean);
                if (nextQty !== null) {
                    qty = nextQty;
                    raw = `${line} | ${nextLine}`;
                    i++;
                }
            }
        }

        if (qty === null) {
            rows.push({ ...defaults, itemCode, qty: 0, raw, _error: 'Không đọc được số lượng (cả dòng này lẫn dòng kế tiếp). Vui lòng sửa lại dòng nhập.' });
            continue;
        }

        rows.push({ ...defaults, itemCode, qty, raw });
    }
    return rows;
}

export type DupCheckResult = {
    errorCount: number;
    dups: { code: string; count: number }[];
    hasIssues: boolean;
};

// checkPreviewDups — kiểm dòng lỗi (_error) + mã trùng theo (date,branch,itemCode) — dùng để
// quyết định khóa nút Lưu + hiện banner cảnh báo phía trên, giống hệt hành vi đã có ở Gói ra/Hủy
// giỏ cũ (và đã bổ sung thêm cho Tồn CN trong phiên trước).
export function checkPreviewDups(rows: ParsedCodeQtyRow[]): DupCheckResult {
    const counts: Record<string, number> = {};
    const errorCount = rows.filter(r => r._error).length;
    rows.forEach(r => {
        if (r._error) return;
        const key = `${r.date}|${r.branch || ''}|${r.itemCode}`;
        counts[key] = (counts[key] || 0) + 1;
    });
    const dups = Object.entries(counts)
        .filter(([, n]) => n > 1)
        .map(([key, n]) => ({ code: key.split('|')[2], count: n }));
    return { errorCount, dups, hasIssues: errorCount > 0 || dups.length > 0 };
}
