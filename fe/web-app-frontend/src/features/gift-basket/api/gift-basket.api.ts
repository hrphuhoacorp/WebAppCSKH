import { api } from '@/services/axios';

export interface GiftBasketDTO {
    id: number;
    basketUid: string;
    branchId?: number;
    branchName?: string;
    baseCode: string;
    basketName: string;
    currentCode: string;
    price: number;
    effectiveDate?: string;
    status: string;
    frontImageUrl?: string;
    backImageUrl?: string;
    imageOverlayText?: string;
    notice?: string;
    note?: string;
    updatedBy?: number;
    updatedAt?: string;
    createdAt?: string;
}

export interface GiftCodeMappingDTO {
    id: number;
    code: string;
    baseCode: string;
    basketName: string;
    branchId?: number;
    branchName?: string;
    basketId?: number;
    active: boolean;
    source: string;
    updatedAt?: string;
}

export interface SapoImportDTO {
    id: number;
    reportDate: string;
    importBatchId: string;
    uploadedBy?: number;
    uploadedAt?: string;
    rowCount: number;
    netRevenue: number;
    orders: number;
    qty: number;
    note?: string;
}

export interface SapoBucketDTO {
    key: string;
    label: string;
    netRevenue: number;
    revenue: number;
    orders: number;
    qty: number;
}

export interface SapoDashboardDTO {
    filterKey: string;
    totalNetRevenue: number;
    totalRevenue: number;
    totalOrders: number;
    totalQty: number;
    byCode: SapoBucketDTO[];
    byDay: SapoBucketDTO[];
    byBranch: SapoBucketDTO[];
    recentImports: SapoImportDTO[];
}

export interface GiftCodeChangeRequestDTO {
    id: number;
    batchId: string;
    batchNote?: string;
    requestUid: string;
    branchId?: number;
    branchName?: string;
    basketCodeOrName: string;
    reason: string;
    note?: string;
    priority: string;
    frontImageUrl?: string;
    backImageUrl?: string;
    status: string;
    handledBy?: number;
    handledByName?: string;
    handledAt?: string;
    resultNote?: string;
    createdBy?: number;
    createdByName?: string;
    createdAt?: string;
}

export interface PagedResult<T> {
    totalItems: number;
    page: number;
    pageSize: number;
    items: T[];
}

export const giftBasketApi = {
    // ─── BASKETS ──────────────────────────────────────────────────────────────

    getList: async (params: {
        page?: number;
        pageSize?: number;
        search?: string;
        branchId?: number;
        status?: string;
    }) => {
        const res = await api.get('/GiftBasket/List', { params });
        return res.data as { content: PagedResult<GiftBasketDTO>; status: string; message?: string };
    },

    create: async (data: {
        branchId?: number;
        baseCode: string;
        basketName: string;
        currentCode: string;
        price: number;
        effectiveDate?: string;
        status?: string;
        frontImageUrl?: string;
        backImageUrl?: string;
        imageOverlayText?: string;
        notice?: string;
        note?: string;
    }) => {
        const res = await api.post('/GiftBasket/Create', data);
        return res.data as { content: GiftBasketDTO; status: string; message?: string };
    },

    update: async (data: {
        id: number;
        branchId?: number;
        baseCode: string;
        basketName: string;
        currentCode: string;
        price: number;
        effectiveDate?: string;
        status?: string;
        frontImageUrl?: string;
        backImageUrl?: string;
        imageOverlayText?: string;
        notice?: string;
        note?: string;
    }) => {
        const res = await api.put('/GiftBasket/Update', data);
        return res.data as { content: GiftBasketDTO; status: string; message?: string };
    },

    delete: async (id: number) => {
        const res = await api.delete(`/GiftBasket/${id}`);
        return res.data;
    },

    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/GiftBasket/UploadImage', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data as { content: string; status: string; message?: string };
    },

    // ─── CODE MAPPINGS ────────────────────────────────────────────────────────

    getCodeMappings: async (branchId?: number) => {
        const res = await api.get('/GiftBasket/CodeMappings', {
            params: branchId ? { branchId } : {},
        });
        return res.data as { content: GiftCodeMappingDTO[]; status: string };
    },

    // ─── SAPO ─────────────────────────────────────────────────────────────────

    importSapo: async (file: File, reportDate: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('reportDate', reportDate);
        const res = await api.post('/GiftBasket/ImportSapo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data as { content: SapoDashboardDTO; status: string; message?: string };
    },

    deleteSapoImport: async (importBatchId: string) => {
        const res = await api.delete(`/GiftBasket/SapoImport/${importBatchId}`);
        return res.data;
    },

    getSapoDashboard: async (filterKey?: string) => {
        const res = await api.get('/GiftBasket/SapoDashboard', {
            params: { filterKey: filterKey ?? 'all' },
        });
        return res.data as { content: SapoDashboardDTO; status: string };
    },

    // ─── CODE CHANGE REQUESTS ─────────────────────────────────────────────────

    getChangeRequests: async (params: {
        page?: number;
        pageSize?: number;
        status?: string;
        branchId?: number;
    }) => {
        const res = await api.get('/GiftBasket/ChangeRequests', { params });
        return res.data as { content: PagedResult<GiftCodeChangeRequestDTO>; status: string };
    },

    createChangeRequest: async (data: {
        batchNote?: string;
        branchId?: number;
        basketCodeOrName: string;
        reason: string;
        note?: string;
        priority?: string;
        frontImageUrl?: string;
        backImageUrl?: string;
    }) => {
        const res = await api.post('/GiftBasket/ChangeRequest/Create', data);
        return res.data as { content: GiftCodeChangeRequestDTO; status: string; message?: string };
    },

    handleChangeRequest: async (data: {
        id: number;
        status: string;
        resultNote?: string;
    }) => {
        const res = await api.put('/GiftBasket/ChangeRequest/Handle', data);
        return res.data as { content: GiftCodeChangeRequestDTO; status: string; message?: string };
    },
};
