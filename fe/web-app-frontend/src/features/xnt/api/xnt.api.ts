import { api } from "@/services/axios";
import type {
    XntCheckDay,
    XntInlineEditRequest,
    XntOverviewFilter,
    XntOverviewKpis,
    XntOverviewRow,
    XntRowKey,
} from "../schemas/xnt.schema";

type Envelope<T> = { content: T; message?: string; status?: string };

export const xntApi = {
    getOverview: async (filter: XntOverviewFilter) => {
        const response = await api.get<Envelope<XntOverviewRow[]>>("/Nxt/overview", { params: filter });
        return response.data;
    },

    getOverviewKpis: async (filter: XntOverviewFilter) => {
        const response = await api.get<Envelope<XntOverviewKpis>>("/Nxt/overview/kpis", { params: filter });
        return response.data;
    },

    getCheckDays: async () => {
        const response = await api.get<Envelope<XntCheckDay[]>>("/Nxt/overview/check-days");
        return response.data;
    },

    // Lỗi (không tìm thấy dòng / xung đột dữ liệu OCC) giờ trả qua HTTP status + ErrorResponse
    // (GlobalExceptionMiddleware), KHÔNG còn field content.success/conflict — gọi hàm này trong
    // try/catch, đọc lỗi qua err.response.data.Message (đã chuẩn hóa ở axios.ts interceptor).
    inlineEdit: async (dto: XntInlineEditRequest) => {
        const response = await api.post<Envelope<XntOverviewRow>>("/Nxt/overview/inline-edit", dto);
        return response.data;
    },

    softDeleteRows: async (keys: XntRowKey[], loginCode: string, userName?: string) => {
        const response = await api.delete<Envelope<{ deletedCount: number }>>("/Nxt/overview/rows", {
            data: { keys, loginCode, userName },
        });
        return response.data;
    },

    // Truy vết nguồn gốc (đã có sẵn từ trước, dùng lại nguyên vẹn cho modal Truy vết React mới).
    getCellLogs: async (closeDate: string, branch: string, itemCode: string) => {
        const response = await api.get<Envelope<CellLog[]>>("/Nxt/logs/cell", {
            params: { closeDate, branch, itemCode },
        });
        return response.data;
    },

    // Dùng cho phần "Sapo treo" trong phân tích ô Điều chỉnh — cross-check tương tự bản JS cũ.
    getSapoPending: async () => {
        const response = await api.get<Envelope<SapoPendingRecord[]>>("/NxtSapoPending");
        return response.data;
    },

    // Gói ra — rows đã được parse/xác nhận hợp lệ ở frontend (xem features/xnt/utils/parseCodeQty.ts),
    // backend chỉ áp dụng (cộng dồn) + ghi log gộp.
    applyGiftIn: async (rows: NxtBatchRow[], loginCode: string, userName?: string) => {
        const response = await api.post<Envelope<{ rowCount: number }>>("/Nxt/gift-in", { rows, loginCode, userName });
        return response.data;
    },

    // Tồn CN — rows đã parse-preview + gộp (mergeStockRows) ở frontend, tách sẵn dòng nào là
    // "chuyển CN" (isTransfer). Backend SET tồn thực tế (không cộng dồn) hoặc cộng dồn chuyển CN.
    applyStock: async (rows: NxtStockBatchRow[], loginCode: string, userName?: string) => {
        const response = await api.post<Envelope<{ rowCount: number }>>("/Nxt/stock", { rows, loginCode, userName });
        return response.data;
    },

    // Hủy giỏ — giống hệt Gói ra về cấu trúc, chỉ khác field đích (cancelBasket) + loại log.
    applyCancelBasket: async (rows: NxtBatchRow[], loginCode: string, userName?: string) => {
        const response = await api.post<Envelope<{ rowCount: number }>>("/Nxt/cancel-basket", { rows, loginCode, userName });
        return response.data;
    },

    // Sai mã — chỉ Admin/Trưởng ca (sales.nxt.edit) gọi được, backend áp dụng thật + ghi log.
    applyWrongCode: async (dto: NxtApplyWrongCodeRequest) => {
        const response = await api.post<Envelope<{ detail: string; message: string }>>("/Nxt/wrong-code/apply", dto);
        return response.data;
    },

    // Nhân viên không có sales.nxt.edit chỉ gửi đề xuất — dùng lại endpoint log chung có sẵn
    // (KHÔNG mutate dữ liệu Tổng quan), đúng hành vi applyWrongCode nhánh !isAdminUser() cũ.
    proposeWrongCode: async (dto: NxtProposeWrongCodeRequest) => {
        const response = await api.post<Envelope<{ success: boolean; id: number }>>("/Nxt/logs", dto);
        return response.data;
    },

    // Lịch sử điều chỉnh — lọc sẵn ở backend theo ngày/CN/loại/user.
    getAdjustmentLogs: async (filter: AdjustmentLogFilter) => {
        const response = await api.get<Envelope<AdjustmentLog[]>>("/Nxt/logs", { params: filter });
        return response.data;
    },

    clearAdjustmentLogs: async () => {
        const response = await api.delete<Envelope<{ success: boolean }>>("/Nxt/logs");
        return response.data;
    },

    // Hoàn tác 1 log — backend tự đảo ngược đúng thao tác + xóa log trong 1 transaction.
    rollbackLog: async (id: number) => {
        const response = await api.post<Envelope<{ success: boolean }>>(`/Nxt/logs/${id}/rollback`);
        return response.data;
    },

    // Sửa SL — sửa nhanh ĐÚNG 1 field, cùng permission gate sales.nxt.edit_quatity_nxt với nút
    // "Sửa" ở Tổng quan.
    applyEditQty: async (dto: NxtEditQtyRequest) => {
        const response = await api.post<Envelope<{ detail: string; message: string }>>("/Nxt/edit-qty", dto);
        return response.data;
    },

    // Sapo treo — GET dùng endpoint mới (DTO PascalCase->camelCase khớp NxtSapoPendingDto), tách
    // biệt với xntApi.getSapoPending() cũ (/NxtSapoPending) mà XntCellHistoryDialog.tsx vẫn dùng
    // riêng để đối chiếu khi truy vết 1 ô.
    getSapoPendingList: async () => {
        const response = await api.get<Envelope<SapoPendingItem[]>>("/Nxt/sapo-pending");
        return response.data;
    },

    createSapoPending: async (dto: NxtSapoPendingCreateRequest) => {
        const response = await api.post<Envelope<SapoPendingItem>>("/Nxt/sapo-pending", dto);
        return response.data;
    },

    completeSapoPending: async (id: number, dto: NxtSapoPendingCompleteRequest) => {
        const response = await api.post<Envelope<SapoPendingItem>>(`/Nxt/sapo-pending/${id}/complete`, dto);
        return response.data;
    },

    deleteSapoPending: async (id: number, loginCode: string, displayName?: string) => {
        const response = await api.delete<Envelope<{ success: boolean }>>(`/Nxt/sapo-pending/${id}`, {
            params: { loginCode, displayName },
        });
        return response.data;
    },

    applyLateDelivery: async (dto: NxtLateDeliveryRequest) => {
        const response = await api.post<Envelope<{ detail: string; message: string }>>("/Nxt/late-delivery/apply", dto);
        return response.data;
    },
};

export type NxtBatchRow = { closeDate: string; branch: string; itemCode: string; qty: number };

export type NxtStockBatchRow = {
    closeDate: string;
    itemCode: string;
    isTransfer: boolean;
    // Dòng tồn thường
    branch?: string;
    actualStock?: number;
    soldNotPicked?: number;
    stockStatus?: string;
    // Dòng chuyển CN
    fromBranch?: string;
    toBranch?: string;
    qty?: number;
};

export type SapoPendingRecord = {
    id: number;
    closeDate: string;
    branch: string;
    itemCode: string;
    qty: number;
    status: "pending" | "completed";
    completedAt?: string;
};

export type NxtApplyWrongCodeRequest = {
    closeDate: string;
    branch: string;
    type: string; // "Đổi mã tạm / nhập nhầm" | "Sai mã Sapo / check đơn"
    source?: string;
    wrongCode: string;
    rightCode: string;
    qty: number;
    note?: string;
    loginCode: string;
    userName?: string;
};

export type NxtProposeWrongCodeRequest = {
    closeDate: string;
    branch: string;
    type: string; // "Đề xuất - {type gốc}"
    source?: string;
    wrongCode: string;
    rightCode: string;
    qty: number;
    note?: string;
    loginCode: string;
    userName?: string;
    status: string;
    detail?: string;
};

export type AdjustmentLogFilter = {
    branch?: string;
    type?: string;
    user?: string;
    dateFrom?: string; // DD/MM/YYYY
    dateTo?: string; // DD/MM/YYYY
};

export type AdjustmentLog = {
    id: number;
    createdAt: string;
    closeDate: string;
    branch: string;
    type: string;
    source: string;
    wrongCode: string;
    rightCode: string;
    qty: number | null;
    note: string;
    user: string;
    status: string;
    detail: string;
};

export type NxtEditQtyRequest = {
    closeDate: string;
    branch: string;
    itemCode: string;
    field: string; // giftIn | receiveBranch | transferBranch | cancelBasket | actualStock | soldNotPicked | adjustment
    newValue: number;
    reason: string;
    counterBranch?: string; // bắt buộc khi field = transferBranch/receiveBranch
    loginCode: string;
    userName?: string;
};

export type SapoPendingItem = {
    id: number;
    closeDate: string;
    branch: string;
    itemCode: string;
    qty: number;
    reason: string;
    note: string;
    status: 'pending' | 'completed';
    createdBy: string;
    createdByName: string;
    createdAt: string | null;
    createdAtRaw: string | null;
    sapoDate: string;
    sapoOrderCode: string;
    completedBy: string;
    completedByName: string;
    completedAt: string | null;
    completionNote: string;
    positiveAdjDate: string;
};

export type NxtSapoPendingCreateRequest = {
    closeDate: string;
    branch: string;
    itemCode: string;
    qty: number;
    reason?: string;
    note?: string;
    loginCode: string;
    displayName?: string;
};

export type NxtSapoPendingCompleteRequest = {
    sapoDate?: string;
    sapoOrderCode?: string;
    completionNote?: string;
    loginCode: string;
    displayName?: string;
};

export type NxtLateDeliveryRequest = {
    itemCode: string;
    saleDate: string;       // DD/MM/YYYY — ngày Sapo ghi nhận bán
    deliveryDate?: string;  // DD/MM/YYYY — ngày giao thật (chỉ để log)
    branch: string;
    qty: number;
    note?: string;
    loginCode: string;
    userName?: string;
};

export type CellLog = {
    id: number;
    createdAt: string;
    closeDate: string;
    branch: string;
    type: string;
    source: string;
    wrongCode: string;
    rightCode: string;
    qty: number | null;
    note: string;
    user: string;
    status: string;
    detail: string;
    staffCode?: string;
    ipAddress?: string;
    userAgent?: string;
};
