import { api } from '@/services/axios';

export interface ReconciliationRunSummaryDto {
    id: number;
    periodMonth: number;
    periodYear: number;
    sourceFileName: string;
    runBy: number;
    runByName?: string | null;
    runAt?: string | null;
    totalExcessRows: number;
    totalExcessAmount: number;
    totalMissingRows: number;
    totalMissingAmount: number;
    totalMismatchRows: number;
    totalMismatchAmount: number;
}

export interface ReconciliationExcessRowDto {
    id: number;
    orderId?: number | null;
    orderItemId?: number | null;
    orderCode: string;
    purchaseDate: string;
    sku?: string | null;
    serviceName?: string | null;
    quantity: number;
    revenue: number;
    sourceQuantity?: number | null;
    sourceRevenue?: number | null;
    matchType: 'duplicate' | 'not_in_source' | 'value_mismatch' | 'possible_date_typo' | 'possible_sku_typo';
    duplicateOfOrderId?: number | null;
    duplicateOfImportHistoryId?: number | null;
    note?: string | null;
    isDeleted: boolean;
    importHistoryId?: number | null;
    branchId?: number | null;
    source?: string | null;
    branchName?: string | null;
    importedByName?: string | null;
    importBatchStatus?: string | null;
    wasEverRestored: boolean;
}

export interface ReconciliationMissingRowDto {
    id: number;
    orderCode: string;
    purchaseDate: string;
    sku?: string | null;
    serviceName?: string | null;
    quantity: number;
    revenue: number;
    source?: string | null;
    branchName?: string | null;
    note?: string | null;
}

export interface ReconciliationBreakdownItemDto {
    name: string;
    count: number;
    amount: number;
}

export interface ReconciliationRunDetailDto {
    run: ReconciliationRunSummaryDto;
    excessRows: ReconciliationExcessRowDto[];
    missingRows: ReconciliationMissingRowDto[];
    byBranch: ReconciliationBreakdownItemDto[];
    bySource: ReconciliationBreakdownItemDto[];
    byImporter: ReconciliationBreakdownItemDto[];
}

export interface ConfirmDeleteExcessRowsResultDto {
    deletedCount: number;
    totalAmountReversed: number;
}

export const reconciliationApi = {
    run: async (month: number, year: number, file: File): Promise<ReconciliationRunSummaryDto> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('month', String(month));
        formData.append('year', String(year));
        const response = await api.post('/Reconciliation/Run', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.content;
    },

    getRuns: async (params?: { month?: number; year?: number }): Promise<ReconciliationRunSummaryDto[]> => {
        const response = await api.get('/Reconciliation/Runs', { params });
        return response.data.content ?? [];
    },

    getTrend: async (): Promise<ReconciliationRunSummaryDto[]> => {
        const response = await api.get('/Reconciliation/Trend');
        return response.data.content ?? [];
    },

    getRunDetail: async (id: number): Promise<ReconciliationRunDetailDto> => {
        const response = await api.get(`/Reconciliation/Runs/${id}`);
        return response.data.content;
    },

    confirmDelete: async (id: number, excessRowIds: number[]): Promise<ConfirmDeleteExcessRowsResultDto> => {
        const response = await api.post(`/Reconciliation/Runs/${id}/ConfirmDelete`, { excessRowIds });
        return response.data.content;
    },
};
