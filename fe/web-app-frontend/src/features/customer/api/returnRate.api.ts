import { api } from '@/services/axios';

export interface MonthlyReturnRateDTO {
    year: number;
    month: number;
    newCustomers: number;
    returningCustomers: number;
    totalBuyers: number;
    returnRate: number;
}

export interface MonthlyRevenueBreakdownDTO {
    year: number;
    month: number;
    returningRevenue: number;
    newRevenue: number;
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
    phone?: string;
    orderCount: number;
    totalRevenue: number;
    avgOrderValue: number;
    avgDaysBetweenOrders: number;
    lastOrderAt?: string;
    firstOrderAt?: string;
    daysSinceLastOrder: number;
}

export interface CategoryStatDTO {
    category: string;
    itemCount: number;
    revenue: number;
}

export interface ProductStatsDTO {
    totalItemsSold: number;
    totalProductRevenue: number;
    avgItemsPerOrder: number;
    uniqueCategories: number;
    topCategory?: string;
    topCategoryCount: number;
    categoryBreakdown: CategoryStatDTO[];
}

export interface ReturnRateStatsDTO {
    monthlyReturnRate: MonthlyReturnRateDTO[];
    monthlyRevenueBreakdown: MonthlyRevenueBreakdownDTO[];
    frequencyDistribution: FrequencyDistributionDTO;
    dormancySegments: DormancySegmentDTO;
    topLoyalCustomers: LoyalCustomerDTO[];
    productStats: ProductStatsDTO;
    avgDaysBetweenOrders: number;
    avgTimeToSecondPurchase: number;
    atRiskCustomers: number;
}

export interface SegmentCustomerDTO {
    id: number;
    name: string;
    customerCode: string;
    phone?: string;
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    lastOrderAt?: string;
    firstOrderAt?: string;
    daysSinceLastOrder: number;
}

export const returnRateApi = {
    getStats: async (months = 12): Promise<ReturnRateStatsDTO> => {
        const response = await api.get('/Customer/GetReturnRateStats', { params: { months } });
        return response.data.content;
    },
    getCustomersBySegment: async (segment: string, page: number, pageSize: number) => {
        const response = await api.get('/Customer/GetCustomersBySegment', { params: { segment, page, pageSize } });
        return response.data.content as { items: SegmentCustomerDTO[]; totalItems: number; page: number; pageSize: number };
    },
};
