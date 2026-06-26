import { api } from '@/services/axios';

export const VPP_GREEN = '#086839';
export const VPP_GROUPS = [
    { value: 'VPP', label: 'Văn phòng phẩm' },
    { value: 'CCDC', label: 'Công cụ – Dụng cụ' },
    { value: 'TB', label: 'Thiết bị' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VppItemDto {
    id: number;
    code: string;
    group: string;
    name: string;
    unit: string;
    unitPrice: number;
    vatRate: number;
    minStock: number;
    maxStock: number;
    note: string;
    createdAt?: string;
}

export interface VppItemUpsertDto {
    group: string;
    name: string;
    unit: string;
    unitPrice: number;
    vatRate: number;
    minStock: number;
    maxStock: number;
    note?: string;
}

export interface VppInventoryRowDto {
    itemId: number;
    code: string;
    group: string;
    name: string;
    unit: string;
    unitPrice: number;
    minStock: number;
    maxStock: number;
    openingQty: number;
    importedQty: number;
    dispatchedQty: number;
    adjustedQty: number;
    closingQty: number;
    totalValue: number;
    stockStatus: 'normal' | 'low' | 'out_of_stock';
}

export interface VppInventorySummaryDto {
    month: number;
    year: number;
    rows: VppInventoryRowDto[];
    totalValue: number;
    outOfStockCount: number;
    lowStockCount: number;
}

export interface VppRequestDto {
    id: number;
    requesterName: string;
    branch: string;
    department: string;
    reason: string;
    status: string;
    dispatchId?: number;
    createdAt?: string;
}

export interface VppRequestLineDto {
    id: number;
    itemId: number;
    itemCode: string;
    itemName: string;
    unit: string;
    unitPrice: number;
    quantity: number;
    note: string;
}

export interface VppRequestDetailDto extends VppRequestDto {
    referencePrice: string;
    adminNote: string;
    lines: VppRequestLineDto[];
}

export interface VppRequestCreateDto {
    department: string;
    reason?: string;
    referencePrice?: string;
    lines: { itemId: number; quantity: number; note?: string }[];
}

export interface VppImportDto {
    id: number;
    importDate: string;
    periodMonth: number;
    periodYear: number;
    note: string;
    createdBy: string;
    totalAmount: number;
    itemCount: number;
    createdAt?: string;
}

export interface VppImportLineDto {
    id: number;
    itemId: number;
    itemCode: string;
    itemName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    vatAmount: number;
    totalAmount: number;
}

export interface VppImportDetailDto extends VppImportDto {
    attachmentInvoice: string;
    attachmentApproval: string;
    lines: VppImportLineDto[];
}

export interface VppImportCreateDto {
    importDate: string;
    attachmentInvoice?: string;
    attachmentApproval?: string;
    note?: string;
    lines: { itemId: number; quantity: number; unitPrice: number }[];
}

export interface VppDispatchDto {
    id: number;
    code: string;
    dispatchDate: string;
    department: string;
    branch: string;
    requestId?: number;
    note: string;
    createdBy: string;
    totalAmount: number;
    itemCount: number;
    createdAt?: string;
}

export interface VppDispatchDetailDto extends VppDispatchDto {
    attachmentInvoice: string;
    attachmentApproval: string;
    lines: VppImportLineDto[];
}

export interface VppDispatchCreateDto {
    dispatchDate: string;
    department?: string;
    branch?: string;
    requestId?: number;
    note?: string;
    lines: { itemId: number; quantity: number; unitPrice: number }[];
}

export interface VppStockCountDto {
    id: number;
    countDate: string;
    periodMonth: number;
    periodYear: number;
    status: string;
    note: string;
    createdBy: string;
    confirmedAt?: string;
    createdAt?: string;
}

export interface VppStockCountLineDto {
    id: number;
    itemId: number;
    itemCode: string;
    itemName: string;
    unit: string;
    systemQty: number;
    actualQty: number;
    difference: number;
    note: string;
}

export interface VppStockCountDetailDto extends VppStockCountDto {
    lines: VppStockCountLineDto[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const vppApi = {
    // Items
    getItems: async (params?: { group?: string; search?: string }) => {
        const res = await api.get('/vpp/items', { params });
        return res.data.data as VppItemDto[];
    },
    getItemById: async (id: number) => {
        const res = await api.get(`/vpp/items/${id}`);
        return res.data.data as VppItemDto;
    },
    createItem: async (dto: VppItemUpsertDto) => {
        const res = await api.post('/vpp/items', dto);
        return res.data.data as VppItemDto;
    },
    updateItem: async (id: number, dto: VppItemUpsertDto) => {
        const res = await api.put(`/vpp/items/${id}`, dto);
        return res.data.data as VppItemDto;
    },
    deleteItem: async (id: number) => {
        await api.delete(`/vpp/items/${id}`);
    },

    // Inventory
    getInventory: async (month: number, year: number) => {
        const res = await api.get('/vpp/inventory', { params: { month, year } });
        return res.data.data as VppInventorySummaryDto;
    },

    // Requests
    getRequests: async (params?: { status?: string; page?: number; pageSize?: number }) => {
        const res = await api.get('/vpp/requests', { params });
        return res.data.data as { items: VppRequestDto[]; totalItems: number; page: number; pageSize: number };
    },
    getRequestById: async (id: number) => {
        const res = await api.get(`/vpp/requests/${id}`);
        return res.data.data as VppRequestDetailDto;
    },
    createRequest: async (dto: VppRequestCreateDto) => {
        const res = await api.post('/vpp/requests', dto);
        return res.data.data as VppRequestDto;
    },
    approveRequest: async (id: number) => {
        const res = await api.post(`/vpp/requests/${id}/approve`);
        return res.data.data as VppRequestDto;
    },
    rejectRequest: async (id: number, adminNote: string) => {
        await api.post(`/vpp/requests/${id}/reject`, { adminNote });
    },

    // Imports
    getImports: async (params?: { month?: number; year?: number }) => {
        const res = await api.get('/vpp/imports', { params });
        return res.data.data as VppImportDto[];
    },
    getImportById: async (id: number) => {
        const res = await api.get(`/vpp/imports/${id}`);
        return res.data.data as VppImportDetailDto;
    },
    createImport: async (dto: VppImportCreateDto) => {
        const res = await api.post('/vpp/imports', dto);
        return res.data.data as VppImportDetailDto;
    },
    deleteImport: async (id: number) => {
        await api.delete(`/vpp/imports/${id}`);
    },

    // Dispatches
    getDispatches: async (params?: { month?: number; year?: number; department?: string }) => {
        const res = await api.get('/vpp/dispatches', { params });
        return res.data.data as VppDispatchDto[];
    },
    getDispatchById: async (id: number) => {
        const res = await api.get(`/vpp/dispatches/${id}`);
        return res.data.data as VppDispatchDetailDto;
    },
    createDispatch: async (dto: VppDispatchCreateDto) => {
        const res = await api.post('/vpp/dispatches', dto);
        return res.data.data as VppDispatchDetailDto;
    },
    deleteDispatch: async (id: number) => {
        await api.delete(`/vpp/dispatches/${id}`);
    },

    // Stock counts
    getStockCounts: async (params?: { month?: number; year?: number }) => {
        const res = await api.get('/vpp/stock-counts', { params });
        return res.data.data as VppStockCountDto[];
    },
    getStockCountById: async (id: number) => {
        const res = await api.get(`/vpp/stock-counts/${id}`);
        return res.data.data as VppStockCountDetailDto;
    },
    createStockCount: async (dto: { countDate: string; periodMonth: number; periodYear: number; note?: string }) => {
        const res = await api.post('/vpp/stock-counts', dto);
        return res.data.data as VppStockCountDetailDto;
    },
    updateStockCountLine: async (id: number, lineId: number, actualQty: number, note?: string) => {
        await api.put(`/vpp/stock-counts/${id}/lines/${lineId}`, { actualQty, note });
    },
    confirmStockCount: async (id: number) => {
        const res = await api.post(`/vpp/stock-counts/${id}/confirm`);
        return res.data.data as VppStockCountDetailDto;
    },
};
