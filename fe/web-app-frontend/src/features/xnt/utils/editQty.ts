// Port thuần client-side của lookupEditQtyValue (nxt-core.js) — chỉ đọc, không gọi API, chạy trên
// danh sách dòng Tổng quan đã fetch sẵn. Việc áp dụng sửa thật nằm ở backend
// (NxtService.ApplyEditQtyAsync).
import type { XntOverviewRow } from '../schemas/xnt.schema';
import { normalizeItemCode } from './wrongCode';

export const EDIT_FIELD_LABELS: Record<string, string> = {
    giftIn: 'Gói ra',
    receiveBranch: 'Nhận CN',
    transferBranch: 'Chuyển CN',
    cancelBasket: 'Hủy giỏ',
    actualStock: 'Tồn thực tế',
    soldNotPicked: 'Bán chưa lấy',
    adjustment: 'Điều chỉnh',
};

export type EditQtyLookupResult = { ok: boolean; message: string; currentValue: number | null };

export function lookupEditQtyValue(
    rows: XntOverviewRow[],
    params: { closeDate: string; branch: string; itemCode: string; field: string },
): EditQtyLookupResult {
    const { closeDate, branch, field } = params;
    const itemCode = normalizeItemCode(params.itemCode);

    if (!closeDate || !branch || !itemCode) {
        return { ok: false, message: 'Nhập ngày, chi nhánh và mã giỏ để xem giá trị hiện tại.', currentValue: null };
    }

    const row = rows.find(r => r.closeDate === closeDate && r.branch === branch && r.itemCode === itemCode);
    if (!row) {
        return { ok: false, message: `Không tìm thấy mã ${itemCode} tại ${branch} ngày ${closeDate}. Kiểm tra lại ngày/chi nhánh/mã.`, currentValue: null };
    }

    const currentVal = Number(row[field as keyof XntOverviewRow] ?? 0);
    return {
        ok: true,
        message: `Tìm thấy — ${EDIT_FIELD_LABELS[field]}: ${currentVal} (${itemCode} · ${branch} · ${closeDate})`,
        currentValue: currentVal,
    };
}
