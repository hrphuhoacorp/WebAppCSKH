// Port nguyên từ nxt-core.js: inferStockStatus, parseTransferToBranch, isSoldNotPickedStatus,
// getStockStatusType, mergeStockRows — riêng cho tab Tồn CN (không dùng chung với Gói ra/Hủy giỏ
// vì có thêm khái niệm DTT/CTT/chuyển chi nhánh). Giữ đồng bộ với nxt-core.js nếu sửa.

import { number, type ParsedCodeQtyRow } from './parseCodeQty';

const BRANCH_ALIASES: Record<string, string> = {
    PL: 'Phú Lợi', 'PHU LOI': 'Phú Lợi', 'PHÚ LỢI': 'Phú Lợi',
    NQ: 'Ngô Quyền', 'NGO QUYEN': 'Ngô Quyền', 'NGÔ QUYỀN': 'Ngô Quyền',
    LT: 'Lái Thiêu', 'LAI THIEU': 'Lái Thiêu', 'LÁI THIÊU': 'Lái Thiêu',
};

function removeAccent(str: string): string {
    return String(str || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function normBranch(value: string): string {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const upper = removeAccent(raw).toUpperCase();
    return BRANCH_ALIASES[upper] || raw;
}

export function parseTransferToBranch(raw: string, defaultBranch: string): string {
    const s = removeAccent(raw).toUpperCase();
    const after = s.match(/CHUYEN\s+(PL|NQ|LT|PHU LOI|NGO QUYEN|LAI THIEU)/);
    if (!after) return defaultBranch || '';
    return normBranch(after[1]);
}

export function inferStockStatus(raw: string, defaultStatus: string): string {
    const s = removeAccent(raw).toLowerCase();
    const hasToken = (token: string) => new RegExp(`(^|\\s|[^a-z0-9])${token}($|\\s|[^a-z0-9])`, 'i').test(s);

    if (/chuyen\s+(pl|nq|lt|phu loi|ngo quyen|lai thieu)/.test(s)) return 'Chuyển chi nhánh';
    if (hasToken('ctt') || /chua thanh toan/.test(s)) return 'CTT - giữ giỏ/chưa thanh toán';
    if (hasToken('dtt') || /da thanh toan|cho lay|chua lay|cho giao|da ban chua lay|khach da thanh toan/.test(s)) {
        return 'DTT - đã bán chưa lấy';
    }
    return defaultStatus || 'Tồn bình thường';
}

export function getStockStatusType(status: string): 'CTT' | 'DTT' | '' {
    const plain = removeAccent(status || '').toLowerCase();
    if (plain.includes('ctt') || plain.includes('chua thanh toan')) return 'CTT';
    if (plain.includes('dtt') || plain.includes('da thanh toan') || plain.includes('cho lay') || plain.includes('chua lay') || plain.includes('cho giao') || plain.includes('da ban chua lay')) return 'DTT';
    return '';
}

export function isSoldNotPickedStatus(status: string): boolean {
    return getStockStatusType(status) === 'DTT';
}

export type StockPreviewRow = ParsedCodeQtyRow & {
    status: string;
    transferToBranch: string;
    _soldNotPickedOverride?: number;
};

export type MergeStockResult = {
    mergedRows: StockPreviewRow[];
    trueWarnings: string[];
};

// mergeStockRows port — gộp dòng tồn thường (SET, sum qty làm actualStock) tách riêng khỏi dòng
// chuyển CN (cộng dồn theo điểm đến); cảnh báo TRÙNG THẬT khi 2 dòng tồn cùng (date,branch,code)
// có CÙNG loại trạng thái (DTT+DTT, CTT+CTT, bình thường+bình thường) — mơ hồ không biết dòng nào
// đúng, khác với việc merge DTT+CTT hợp lệ (khách vừa DTT vừa CTT trong ngày, cộng lại đúng).
export function mergeStockRows(rows: StockPreviewRow[]): MergeStockResult {
    const trueWarnings: string[] = [];
    const groups: Record<string, StockPreviewRow[]> = {};
    rows.forEach(r => {
        const key = `${r.date}|${r.branch || ''}|${r.itemCode}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
    });
    const mergedRows: StockPreviewRow[] = [];
    Object.values(groups).forEach(group => {
        if (group.length === 1) { mergedRows.push(group[0]); return; }
        const stockRows = group.filter(r => r.status !== 'Chuyển chi nhánh');
        const transferRows = group.filter(r => r.status === 'Chuyển chi nhánh');

        if (stockRows.length > 1) {
            const types = stockRows.map(r => getStockStatusType(r.status) || 'normal');
            const seen = new Set<string>();
            for (const t of types) { if (seen.has(t)) { trueWarnings.push(group[0].itemCode); break; } seen.add(t); }
        }

        if (stockRows.length > 0) {
            const totalQty = stockRows.reduce((s, r) => s + number(r.qty), 0);
            const dttQty = stockRows.filter(r => isSoldNotPickedStatus(r.status)).reduce((s, r) => s + number(r.qty), 0);
            const hasDTT = stockRows.some(r => getStockStatusType(r.status) === 'DTT');
            const hasCTT = !hasDTT && stockRows.some(r => getStockStatusType(r.status) === 'CTT');
            const statusRow = hasDTT ? stockRows.find(r => getStockStatusType(r.status) === 'DTT')!
                : hasCTT ? stockRows.find(r => getStockStatusType(r.status) === 'CTT')!
                    : stockRows[0];
            mergedRows.push({
                ...stockRows[0], qty: totalQty, status: statusRow.status, _soldNotPickedOverride: dttQty,
                raw: stockRows.length > 1 ? stockRows.map(r => r.raw).join(' + ') : stockRows[0].raw,
            });
        }

        const transferByDest: Record<string, StockPreviewRow[]> = {};
        transferRows.forEach(r => {
            const dest = r.transferToBranch || '';
            if (!transferByDest[dest]) transferByDest[dest] = [];
            transferByDest[dest].push(r);
        });
        Object.values(transferByDest).forEach(tRows => {
            const totalQty = tRows.reduce((s, r) => s + number(r.qty), 0);
            mergedRows.push({ ...tRows[0], qty: totalQty, raw: tRows.length > 1 ? tRows.map(r => r.raw).join(' + ') : tRows[0].raw });
        });
    });
    return { mergedRows, trueWarnings };
}
