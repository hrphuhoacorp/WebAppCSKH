import { api } from '@/services/axios';

export interface MonthlyReturnRateDTO {
    year: number;
    month: number;
    newCustomers: number;
    returningCustomers: number;
    totalBuyers: number;
    returnRate: number;
}

export interface FrequencyDistributionDTO {
    once: number;
    twoToThree: number;
    fourToTen: number;
    moreThanTen: number;
}

export interface DormancySegmentDTO {
    active30: number;
    dormant30To60: number;
    dormant60To90: number;
    dormant90Plus: number;
    neverBought: number;
}

export interface LoyalCustomerDTO {
    id: number;
    name: string;
    customerCode: string;
    orderCount: number;
    totalRevenue: number;
    lastOrderAt?: string;
    daysSinceLastOrder: number;
}

export interface ReturnRateStatsDTO {
    monthlyReturnRate: MonthlyReturnRateDTO[];
    frequencyDistribution: FrequencyDistributionDTO;
    dormancySegments: DormancySegmentDTO;
    topLoyalCustomers: LoyalCustomerDTO[];
}

export const returnRateApi = {
    getStats: async (months = 12): Promise<ReturnRateStatsDTO> => {
        const response = await api.get('/Customer/GetReturnRateStats', { params: { months } });
        return response.data.content;
    },
};
