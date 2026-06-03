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
        const response = await api.delete(`/User/DeleteUserAsync/${id}`, {
            params: { updatedAt },
        });
        return response.data;
    },
}