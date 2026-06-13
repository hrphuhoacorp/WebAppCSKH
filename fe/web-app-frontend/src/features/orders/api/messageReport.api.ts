import { api } from '@/services/axios';

export interface MessageReportDTO {
    id: number;
    reportDate: string; // 'YYYY-MM-DD'
    type: string;
    count: number;
    note?: string;
    createdByName?: string;
    createdAt?: string;
}

export interface MessageReportCreateDTO {
    reportDate: string;
    type: string;
    count: number;
    note?: string;
}

export interface MessageReportFilter {
    month?: number;
    year?: number;
    type?: string;
}

export const messageReportApi = {
    getList: async (filter: MessageReportFilter) => {
        const response = await api.get('/MessageReport/GetList', { params: filter });
        return response.data;
    },
    create: async (dto: MessageReportCreateDTO) => {
        const response = await api.post('/MessageReport/Create', dto);
        return response.data;
    },
    delete: async (id: number) => {
        const response = await api.delete(`/MessageReport/Delete/${id}`);
        return response.data;
    },
};
