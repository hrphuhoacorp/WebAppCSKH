import { api } from "@/services/axios";

export const userApi = {
    getUsers: async (params: {
        search?: string;
        role?: string;
        branchId?: number;
        page: number;
        pageSize: number;
    }) => {
        const response = await api.get('/User/GetAllUsersAsync', {
            params,
        });

        return response.data;
    },
    getUserById: async (id: number) => {
        const response = await api.get(`/User/GetUserByIdAsync/${id}`);
        return response.data;
    },

    updateUser: async (id: number, data: any) => {
        const response = await api.put(`/User/UpdateUserAsync/${id}`, data);
        return response.data;
    },

    deleteUser: async (id: number, updatedAt: string) => {
        const response = await api.delete(`/Auth/DeleteAccount?userId=${id}`, {
            params: { updatedAt },
        });
        return response.data;
    },

    restoreAccount: async (userId: number) => {
        const response = await api.post(`/Auth/RestoreAccount/${userId}`);
        return response.data;
    },

    getRoles: async () => {
        const response = await api.get('/User/GetAllRolesAsync');
        return response.data;
    },

    getActivityLogs: async (params: {
        page: number;
        pageSize: number;
        search?: string;
        fromDate?: string;
        toDate?: string;
    }) => {
        const response = await api.get('/User/GetAllActivityLogAsync', {
            params,
        });

        return response.data;
    },

    getImportHistory: async (params: {
        page: number;
        pageSize: number;
        search?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
    }) => {
        const response = await api.get('/ImportHistory/GetAllImportHistoryAsync', {
            params,
        });

        return response.data;
    },

    rollbackImportExcel: async (id: number) => {
        const response = await api.post(`/Order/RollbackImportAsync/${id}`);
        return response.data;
    },

    restoreImportExcel: async (id: number) => {
        const response = await api.post(`/Order/RestoreImportAsync/${id}`);
        return response.data;
    },

    importStaff: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/User/ImportStaff', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data as {
            content: {
                successCount: number;
                errorCount: number;
                errors: { row: number; staffCode?: string; error: string }[];
            };
            status: string;
            message?: string;
        };
    },

    downloadImportTemplate: async () => {
        const response = await api.get('/User/ImportStaffTemplate', { responseType: 'blob' });
        const url = URL.createObjectURL(new Blob([response.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mau-import-nhan-su.xlsx';
        a.click();
        URL.revokeObjectURL(url);
    },
}