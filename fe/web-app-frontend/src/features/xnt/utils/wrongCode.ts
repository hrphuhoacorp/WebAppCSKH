// Port thuần client-side của checkTempCodeBranch (nxt-core.js) — chỉ đọc, không gọi API, chạy
// trên danh sách dòng Tổng quan đã fetch sẵn (xntApi.getOverview). Việc áp dụng/đổi mã thật nằm ở
// backend (NxtService.ApplyWrongCodeAsync) — hàm này chỉ giúp người dùng kiểm tra trước khi bấm.
import type { XntOverviewRow } from '../schemas/xnt.schema';

export function normalizeItemCode(value: string): string {
    return (value || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function formatSourceName(source: string): string {
    const map: Record<string, string> = {
        allInternal: 'Tất cả phát sinh nội bộ',
        giftIn: 'Gói ra',
        stock: 'Tồn CN',
        cancel: 'Hủy giỏ',
        transfer: 'Chuyển CN / Nhận CN',
    };
    return map[source] || source || '';
}

function getInternalMoveFields(source: string): (keyof XntOverviewRow)[] {
    if (source === 'giftIn') return ['giftIn'];
    if (source === 'stock') return ['actualStock', 'soldNotPicked'];
    if (source === 'cancel') return ['cancelBasket'];
    if (source === 'transfer') return ['transferBranch', 'receiveBranch'];
    return ['openingStock', 'giftIn', 'actualStock', 'soldNotPicked', 'cancelBasket', 'transferBranch', 'receiveBranch', 'adjustment'];
}

function hasInternalSource(row: XntOverviewRow, source: string): boolean {
    return getInternalMoveFields(source).some(field => Number(row[field]) !== 0);
}

function isSapoOnlyRow(row: XntOverviewRow): boolean {
    return Number(row.sapoSold) !== 0 || Number(row.revenue) !== 0 || Number(row.orderCount) !== 0;
}

export type TempCodeCheckResult = { ok: boolean | null; message: string };

export function checkTempCodeBranch(
    rows: XntOverviewRow[],
    params: { closeDate: string; branch: string; wrongCode: string; source: string; type: string },
): TempCodeCheckResult {
    const { closeDate, branch, source, type } = params;
    const wrongCode = normalizeItemCode(params.wrongCode);

    if (!closeDate || !branch || !wrongCode) {
        return { ok: null, message: 'Vui lòng nhập ngày phát sinh, chi nhánh và mã sai/mã tạm trước rồi bấm kiểm tra.' };
    }

    const allCodeRows = rows.filter(r => !r.inactive && r.closeDate === closeDate && r.itemCode === wrongCode);
    const sameBranchRowsAll = allCodeRows.filter(r => r.branch === branch);

    if (type === 'Sai mã Sapo / check đơn') {
        const sapoRows = allCodeRows.filter(r => Number(r.sapoSold) !== 0 || Number(r.revenue) !== 0);
        const sameSapo = sapoRows.filter(r => r.branch === branch);
        const otherSapo = sapoRows.filter(r => r.branch !== branch);

        if (sameSapo.length === 1 && otherSapo.length === 0) {
            return { ok: true, message: `OK: Mã ${wrongCode} có phát sinh Sapo ở đúng chi nhánh ${branch}. Có thể áp dụng Sai mã Sapo.` };
        }
        if (sameSapo.length === 0 && otherSapo.length > 0) {
            return { ok: false, message: `CẢNH BÁO MẠNH: Mã ${wrongCode} có Sapo nhưng không nằm ở ${branch}, đang thấy ở: ${[...new Set(otherSapo.map(r => r.branch))].join(', ')}.` };
        }
        if (sameSapo.length > 1 || (sameSapo.length > 0 && otherSapo.length > 0)) {
            return { ok: false, message: `Cần kiểm tra: Mã ${wrongCode} có nhiều phát sinh Sapo/nghi vấn nhiều chi nhánh. Vui lòng xác nhận ngày và CN trước khi đổi.` };
        }
        return { ok: false, message: `Chưa thấy Sapo: Không tìm thấy mã ${wrongCode} trong Sapo ngày ${closeDate}. Nếu mã nằm ở Gói ra/Tồn/Hủy/Chuyển thì chọn loại Đổi mã tạm / nhập nhầm.` };
    }

    const internalRows = allCodeRows.filter(r => hasInternalSource(r, source));
    const sameBranchRows = internalRows.filter(r => r.branch === branch);
    const otherBranchRows = internalRows.filter(r => r.branch !== branch);

    if (sameBranchRows.length === 1 && otherBranchRows.length === 0) {
        return { ok: true, message: `OK: Mã ${wrongCode} đang có 1 phát sinh nội bộ ở đúng chi nhánh ${branch}. Có thể đổi mã.` };
    }
    if (sameBranchRows.length > 1) {
        return { ok: false, message: `Cần kiểm tra: Mã ${wrongCode} có nhiều phát sinh nội bộ trong chi nhánh ${branch}. Vui lòng xem kỹ nguồn phát sinh trước khi đổi.` };
    }
    if (sameBranchRows.length === 0 && otherBranchRows.length > 0) {
        return { ok: false, message: `CẢNH BÁO MẠNH: Mã ${wrongCode} không nằm ở chi nhánh ${branch}, mà đang thấy ở: ${[...new Set(otherBranchRows.map(r => r.branch))].join(', ')}. Có thể bạn chọn sai chi nhánh hoặc sai ngày.` };
    }
    const sameSapoOnly = sameBranchRowsAll.filter(isSapoOnlyRow);
    if (sameBranchRows.length === 0 && sameSapoOnly.length > 0) {
        return { ok: false, message: `Đang thấy ở Sapo bán: Mã ${wrongCode} có trong Sapo của ${branch}. Nếu cần đổi mã bán sai, hãy chọn loại Sai mã Sapo / check đơn, không chọn Đổi mã tạm.` };
    }
    return { ok: false, message: `Chưa thấy phát sinh: Không tìm thấy mã ${wrongCode} trong ngày ${closeDate}, nguồn ${formatSourceName(source)}. Kiểm tra lại ngày, chi nhánh hoặc nguồn phát sinh.` };
}

// parseLogDetail port — chỉ dùng để HIỂN THỊ trong dialog "Xem chi tiết" (rollback thật đã chuyển
// hẳn sang backend NxtService.RollbackLogAsync, không còn tự parse/tự đảo ngược ở client nữa).
export type ParsedLogItem = { closeDate: string | null; code: string; qty: number; prevQty?: number; status?: string };

export function parseLogDetail(detail: string | null | undefined): ParsedLogItem[] {
    return (detail || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map((s): ParsedLogItem | null => {
            const v4 = s.match(/^(\d{2}\/\d{2}\/\d{4})\|(.+):(-?[\d.]+)→(-?[\d.]+)$/);
            if (v4) return { closeDate: v4[1], code: v4[2].trim(), prevQty: Number(v4[3]), qty: Number(v4[4]) };
            const v3 = s.match(/^(\d{2}\/\d{2}\/\d{4})\|(.+):(-?[\d.]+)\|(.*)$/);
            if (v3) return { closeDate: v3[1], code: v3[2].trim(), qty: Number(v3[3]), status: v3[4] };
            const v2 = s.match(/^(\d{2}\/\d{2}\/\d{4})\|(.+):(-?[\d.]+)$/);
            if (v2) return { closeDate: v2[1], code: v2[2].trim(), qty: Number(v2[3]) };
            const v1 = s.match(/^(.+):(-?[\d.]+)$/);
            return v1 ? { closeDate: null, code: v1[1].trim(), qty: Number(v1[2]) } : null;
        })
        .filter((x): x is ParsedLogItem => x !== null);
}
