import { api } from "@/services/axios";

export const dashboardApi = {
    getDashboard: async (data: {
        fromDate?: string | null;
        toDate?: string | null;
        month?: number;
        year?: number;
        source?: string;
        branchId?: number;
        revenueGroupBy?: string
    }) => {
        const response = await api.get("Dashboard/GetDashboardAsync", { params: data });
        return response.data;

    }
}