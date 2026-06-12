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

export const BASKET_GROUPS: { code: string; name: string }[] = [
    { code: '200-000-000', name: 'Giỏ trái cây' },
    { code: '200-000-001', name: 'Giỏ trái cây có hoa' },
    { code: '200-000-002', name: 'Giỏ trái cây có bánh kẹo' },
    { code: '200-000-003', name: 'Giỏ trái cây có hoa và bánh kẹo' },
    { code: '200-000-004', name: 'Giỏ trái cây bó hoa' },
    { code: '200-000-005', name: 'Giỏ trái cây tráp cưới hỏi' },
    { code: '200-001', name: 'Giỏ bánh kẹo' },
    { code: '200-002', name: 'Giỏ rượu trái cây' },
    { code: '200-003', name: 'Giỏ rau củ' },
];

export interface GiftCodeChangeRequestDTO {
    id: number;
    batchId: string;
    batchNote?: string;
    requestUid: string;
    branchId?: number;
    branchName?: string;
    basketCodeOrName?: string;
    reason?: string;
    note?: string;
    priority: string;
    groupCode?: string;
    price?: number;
    sentZaloPhoto: boolean;
    frontImageUrl?: string;
    backImageUrl?: string;
    status: string;
    handledBy?: number;
    handledByName?: string;
    handledAt?: string;
    oldCode?: string;
    newCode?: string;
    approvedDate?: string;
    resultNote?: string;
    createdBy?: number;
    createdByName?: string;
    createdAt?: string;
    isActive: boolean;
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

  

    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/GiftBasket/UploadImage', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data as { content: string; status: string; message?: string };
    },



    // ─── CODE CHANGE REQUESTS ─────────────────────────────────────────────────

    getChangeRequests: async (params: {
        page?: number;
        pageSize?: number;
        status?: string;
        branchId?: number;
        isActive?: boolean;
    }) => {
        const res = await api.get('/GiftBasket/ChangeRequests', { params });
        return res.data as { content: PagedResult<GiftCodeChangeRequestDTO>; status: string };
    },

    createChangeRequest: async (data: {
        batchNote?: string;
        branchId?: number;
        basketCodeOrName?: string;
        reason?: string;
        note?: string;
        priority?: string;
        groupCode?: string;
        price?: number;
        sentZaloPhoto?: boolean;
        frontImageUrl?: string;
        backImageUrl?: string;
    }) => {
        const res = await api.post('/GiftBasket/ChangeRequest/Create', data);
        return res.data as { content: GiftCodeChangeRequestDTO; status: string; message?: string };
    },

    handleChangeRequest: async (data: {
        id: number;
        status: string;
        oldCode?: string;
        newCode?: string;
        price?: number;
        approvedDate?: string;
        resultNote?: string;
        frontImageUrl?: string;
        backImageUrl?: string;
    }) => {
        const res = await api.put('/GiftBasket/ChangeRequest/Handle', data);
        return res.data as { content: GiftCodeChangeRequestDTO; status: string; message?: string };
    },

    updateChangeRequestActive: async (id: number, isActive: boolean) => {
        const res = await api.put(`/GiftBasket/ChangeRequest/${id}/Active`, isActive);
        return res.data;
    },

    activateChangeRequest: async (id: number, data: {
        oldCode?: string; newCode?: string; price?: number;
        approvedDate?: string; resultNote?: string; note?: string;
        groupCode?: string; isActive: boolean;
    }) => {
        const res = await api.put(`/GiftBasket/ChangeRequest/${id}/Activate`, data);
        return res.data;
    },

    deleteChangeRequest: async (id: number) => {
        const res = await api.delete(`/GiftBasket/ChangeRequest/${id}`);
        return res.data;
    },

    exportChangeRequests: async (params?: { month?: string; isActive?: boolean }) => {
        const response = await api.get('/GiftBasket/ChangeRequests/Export', {
            params,
            responseType: 'blob',
        });
        const suffix = params?.month ? params.month.replace('-', '') : new Date().toISOString().slice(0, 7).replace('-', '');
        const url = URL.createObjectURL(new Blob([response.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `doi-ma-gio-${suffix}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    },
};
