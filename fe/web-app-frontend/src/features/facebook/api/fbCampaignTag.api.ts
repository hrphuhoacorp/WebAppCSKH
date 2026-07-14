import { api } from '@/services/axios';
import type { CustomerWithTagsDto, PagedResult } from '@/features/persona/api/persona.api';

export interface FbCampaignTagDto {
    id: number;
    campaignId: string;
    campaignName: string;
    categories: string[];
    /** Rỗng = tất cả chi nhánh. */
    branchIds: number[];
    dateFrom: string;
    dateTo: string;
    note?: string | null;
    createdByName?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface CreateFbCampaignTagInput {
    campaignId: string;
    campaignName: string;
    categories: string[];
    branchIds: number[];
    dateFrom: string;
    dateTo: string;
    note?: string;
}

export interface UpdateFbCampaignTagInput {
    categories: string[];
    branchIds: number[];
    dateFrom: string;
    dateTo: string;
    note?: string;
}

export interface FbCampaignPerformance {
    tagId: number;
    campaignId: string;
    campaignName: string;
    categories: string[];
    branchIds: number[];

    periodFrom: string;
    periodTo: string;
    periodOrderCount: number;
    periodRevenue: number;
    periodCustomerCount: number;

    baselineFrom: string;
    baselineTo: string;
    baselineOrderCount: number;
    baselineRevenue: number;

    orderCountLiftPercent?: number | null;
    revenueLiftPercent?: number | null;

    fbSpend: number;
    fbImpressions: number;
    fbClicks: number;
    fbReach: number;
    costPerOrderInCategory?: number | null;
}

export const fbCampaignTagApi = {
    getTags: async (campaignId?: string): Promise<FbCampaignTagDto[]> => {
        const res = await api.get('/FbCampaignTag/Tags', { params: { campaignId } });
        return res.data.content ?? [];
    },

    createTag: async (input: CreateFbCampaignTagInput): Promise<FbCampaignTagDto> => {
        const res = await api.post('/FbCampaignTag/Tags', input);
        return res.data.content;
    },

    updateTag: async (id: number, input: UpdateFbCampaignTagInput): Promise<FbCampaignTagDto> => {
        const res = await api.put(`/FbCampaignTag/Tags/${id}`, input);
        return res.data.content;
    },

    deleteTag: async (id: number): Promise<boolean> => {
        const res = await api.delete(`/FbCampaignTag/Tags/${id}`);
        return res.data.content;
    },

    getPerformance: async (id: number): Promise<FbCampaignPerformance> => {
        const res = await api.get(`/FbCampaignTag/Tags/${id}/Performance`);
        return res.data.content;
    },

    getMatchedCustomers: async (id: number, params: { personaTagId?: number; page: number; pageSize: number }): Promise<PagedResult<CustomerWithTagsDto>> => {
        const res = await api.get(`/FbCampaignTag/Tags/${id}/MatchedCustomers`, { params });
        return res.data.content ?? { totalItems: 0, page: 1, pageSize: params.pageSize, items: [] };
    },
};
