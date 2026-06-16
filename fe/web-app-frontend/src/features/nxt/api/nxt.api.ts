import { api } from '@/services/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NxtBootstrap { branches: string[]; today: string; }

export interface NxtGiftRow {
    id?: number; date?: string; branch?: string;
    itemCode: string; qty: number; note?: string; codeType?: string;
}

export interface NxtStockRow {
    id?: number; date: string; branch: string;
    itemCode: string; qty: number;
    stockStatus?: string; transferToBranch?: string;
    note?: string; raw?: string;
}

export interface NxtSaveResult { rowsSaved: number; transfersSaved?: number; }

export interface NxtSapoImportResult {
    importId: string; rowsRead: number; rowsSaved: number;
    dateMin?: string; dateMax?: string;
    totalNetQty: number; totalRevenue: number; replacedRows: number;
}

export interface NxtAdjInput {
    date: string; branch: string; wrongCode: string; rightCode?: string;
    qty: number; reason?: string; note?: string;
}

export interface NxtAdjLog {
    id: number; importId: string; date: string; branch: string;
    wrongCode: string; rightCode?: string; qty: number;
    reason?: string; note?: string; createdAt: string; createdBy?: string;
}

export interface NxtDashboardRow {
    date: string; branch: string; itemCode: string;
    beginQty: number; inQty: number; transferInQty: number; transferOutQty: number;
    outQty: number; cancelQty: number; adjustQty: number;
    stockQty: number; dttQty: number; cttQty: number;
    expectedQty: number; compareQty: number; diff: number;
    revenue: number; orderCount: number; labels: string[]; notes: string[]; diffReason: string;
}

export interface NxtDashboardSummary {
    beginQty: number; inQty: number; transferInQty: number; transferOutQty: number;
    cancelQty: number; outQty: number; stockQty: number;
    dttQty: number; cttQty: number; revenue: number; diffLines: number; orderCount: number;
}

export interface NxtBranchChart {
    branch: string; inQty: number; outQty: number; stockQty: number;
    transferInQty: number; transferOutQty: number; cancelQty: number;
    diffLines: number; revenue: number;
}

export interface NxtCheckDay {
    date: string; branch: string; diffLines: number; absDiff: number; totalDiff: number; topCodes: string[];
}

export interface NxtDashboard {
    dateFrom: string; dateTo: string; prev: string; branch: string; rowFilter: string;
    sapoUpdatedTo: string;
    summary: NxtDashboardSummary;
    branchCharts: NxtBranchChart[];
    checkDays: NxtCheckDay[];
    rows: NxtDashboardRow[];
}

export interface NxtSapoPreviewRow {
    date: string; branch: string; itemCode: string;
    sku: string; variantName: string;
    netSoldQty: number; revenue: number; orderCount: number;
}

export interface NxtCheckCodeResult {
    code: string; date: string; branch: string;
    giftIns: string[]; sapoSales: string[]; stocks: string[]; adjustments: string[];
}

export interface NxtSapoImportLog {
    importId: string; fileName?: string; importDate: string;
    rowsRead: number; rowsSaved: number;
    dateMin?: string; dateMax?: string;
    totalNetQty: number; totalRevenue: number; status: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const nxtApi = {
    bootstrap: () => api.get<NxtBootstrap>('/nxt/bootstrap').then(r => r.data),

    // Dashboard
    dashboard: (params: { dateFrom?: string; dateTo?: string; branch?: string; rowFilter?: string }) =>
        api.get<NxtDashboard>('/nxt/dashboard', { params }).then(r => r.data),

    // Gói ra
    parseGiftOut: (text: string, branch: string, date: string, note?: string) =>
        api.post<NxtGiftRow[]>('/nxt/gift-out/parse', { text, branch, date, note }).then(r => r.data),
    saveGiftOut: (rows: NxtGiftRow[], date: string, branch: string, codeType?: string, note?: string) =>
        api.post<NxtSaveResult>('/nxt/gift-out', { rows, date, branch, codeType, note }).then(r => r.data),

    // Tồn CN
    parseStock: (text: string, branch: string, date: string) =>
        api.post<NxtStockRow[]>('/nxt/stock/parse', { text, branch, date }).then(r => r.data),
    saveStock: (rows: NxtStockRow[], sourceText?: string) =>
        api.post<NxtSaveResult>('/nxt/stock', { rows, sourceText }).then(r => r.data),
    getStock: (date: string, branch: string) =>
        api.get<NxtStockRow[]>('/nxt/stock', { params: { date, branch } }).then(r => r.data),

    // Hủy giỏ
    parseCancel: (text: string, branch: string, date: string) =>
        api.post<NxtGiftRow[]>('/nxt/cancel/parse', { text, branch, date }).then(r => r.data),
    saveCancel: (rows: NxtGiftRow[], date: string, branch: string, reason: string, note?: string) =>
        api.post<NxtSaveResult>('/nxt/cancel', { rows, date, branch, reason, note }).then(r => r.data),

    // Sai mã
    saveAdjustment: (input: NxtAdjInput) =>
        api.post<{ importId: string }>('/nxt/adjustment', input).then(r => r.data),
    getAdjustments: (dateFrom?: string, dateTo?: string, branch?: string) =>
        api.get<NxtAdjLog[]>('/nxt/adjustments', { params: { dateFrom, dateTo, branch } }).then(r => r.data),

    // Sapo
    previewSapo: (file: File, date?: string) => {
        const form = new FormData();
        form.append('file', file);
        if (date) form.append('date', date);
        return api.post<NxtSapoPreviewRow[]>('/nxt/sapo/preview', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(r => r.data);
    },
    importSapo: (file: File, date?: string) => {
        const form = new FormData();
        form.append('file', file);
        if (date) form.append('date', date);
        return api.post<NxtSapoImportResult>('/nxt/sapo/import', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(r => r.data);
    },
    undoSapo: (importId: string) =>
        api.post<{ message: string }>(`/nxt/sapo/undo/${importId}`).then(r => r.data),
    getSapoImports: () =>
        api.get<NxtSapoImportLog[]>('/nxt/sapo/imports').then(r => r.data),

    // Kiểm tra mã
    checkCode: (code: string, date?: string, branch?: string) =>
        api.get<NxtCheckCodeResult>('/nxt/check-code', { params: { code, date, branch } }).then(r => r.data),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];

export const CODE_TYPES = ['Mã Sapo có sẵn', 'Mã SON/đơn khách tự lựa', 'Mã tạm/chưa có Sapo'];

export const CANCEL_REASONS = ['Hủy giỏ do lỗi', 'Rã giỏ bán lẻ', 'Gói sai mẫu', 'Khách đổi mẫu', 'Khác'];

export const ADJ_REASONS = ['Đổi mã tạm/nhập nhầm', 'Sai mã Sapo / check đơn'];

export const OCR_URL = 'https://script.google.com/macros/s/AKfycbzRaxdoT45hrrJ9V0MwdPDLr59zRIp6CAbGYjr3AHlsAz3DBbBuLsadDShtJG75nf_D/exec';

export function fmtRevenue(v: number) {
    const abs = Math.abs(v), sign = v < 0 ? '-' : '';
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(abs >= 10e9 ? 1 : 2).replace(/\.?0+$/, '') + ' Tỷ';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(abs >= 10e6 ? 1 : 2).replace(/\.?0+$/, '') + ' Tr';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(abs >= 10e3 ? 0 : 1).replace(/\.?0+$/, '') + 'K';
    return sign + abs.toLocaleString('vi-VN') + 'đ';
}
