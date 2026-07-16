import { api } from "@/services/axios";

export const facebookApi = {
    getCampaigns: async () => {
        const response = await api.get("Facebook/campaigns");
        return response.data.content ?? [];
    },
    getInsights: async (since: string, until: string, level: string = "campaign") => {
        const response = await api.get("Facebook/insights", { params: { since, until, level } });
        return response.data.content ?? [];
    },
    getInsightsBreakdown: async (since: string, until: string, breakdown: string, level: string = "campaign") => {
        const response = await api.get("Facebook/insights/breakdown", { params: { since, until, breakdown, level } });
        return response.data.content ?? [];
    },
    getAdThumbnails: async (adIds: string[]): Promise<{ adId: string; thumbnailUrl: string }[]> => {
        if (adIds.length === 0) return [];
        const response = await api.get("Facebook/ad-thumbnails", { params: { adIds: adIds.join(',') } });
        return response.data.content ?? [];
    },
};
