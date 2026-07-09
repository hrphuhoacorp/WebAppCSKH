// Type khớp đúng với NxtOverviewRowDto/NxtOverviewKpisDto/NxtCheckDayDto ở
// be/WebAppAPI/Services/NxtService.cs — backend đã tính sẵn CompareStock/ExpectedStock/Diff/
// DiffReasonHint, frontend không tự tính lại các công thức này nữa.

export type TransferNote = {
    type: "in" | "out";
    otherBranch: string;
    qty: number;
};

export type XntOverviewRow = {
    id: number;
    closeDate: string; // "DD/MM/YYYY"
    branch: string;
    itemCode: string;
    openingStock: number;
    openingSource: string;
    giftIn: number;
    receiveBranch: number;
    transferBranch: number;
    cancelBasket: number;
    sapoSold: number;
    adjustment: number;
    actualStock: number;
    soldNotPicked: number;
    stockStatus: string;
    stockType: "CTT" | "DTT" | "";
    revenue: number;
    orderCount: number;
    transferNotes: TransferNote[];
    inactive: boolean;
    compareStock: number;
    expectedStock: number;
    diff: number;
    diffReasonHint: string;
    hasInsufficientTransferSource: boolean;
    updatedAt: string | null;
};

export type XntOverviewKpis = {
    openingStock: number;
    giftIn: number;
    receiveBranch: number;
    transferBranch: number;
    cancelBasket: number;
    sapoSold: number;
    actualStock: number;
    soldNotPicked: number;
    revenue: number;
    orderCount: number;
    diffRows: number;
    latestSapoDate: string;
};

export type XntCheckDayCode = { code: string; diff: number };

export type XntCheckDay = {
    date: string;
    branch: string;
    diffRows: number;
    totalDiff: number;
    absDiff: number;
    codes: XntCheckDayCode[];
};

export type XntOverviewFilter = {
    branch?: string; // "Tất cả" | tên chi nhánh
    dateFrom?: string; // ISO yyyy-MM-dd
    dateTo?: string;
    status?: "all" | "diff" | "match" | "soldNotPicked";
};

// 7 trường sửa nhanh được ở nút "Sửa" trong Tổng quan — khớp đúng EDITABLE_FIELDS cũ.
export type XntInlineEditFields = {
    giftIn: number;
    receiveBranch: number;
    transferBranch: number;
    cancelBasket: number;
    adjustment: number;
    actualStock: number;
    soldNotPicked: number;
};

export type XntInlineEditRequest = XntInlineEditFields & {
    closeDate: string;
    branch: string;
    itemCode: string;
    expectedUpdatedAt: string | null;
    loginCode: string;
    userName?: string;
};

export type XntRowKey = { closeDate: string; branch: string; itemCode: string };
