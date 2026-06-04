import { api } from "@/services/axios";

export const customerApi = {
    getCustomers: async (data: {
        page: number;
        pageSize: number;
        search?: string;
    }) => {
        const response = await api.get('/Customer/GetAllCustomersAsync', { params: data });
        return response.data;

    },

    updateCustomer: async (id: number, data: {
        name: string;
        phone: string;
        dayOfBirth?: string | null;
        updatedAt: string;
    }) => {
        const response = await api.put(`/Customer/UpdateCustomerAsync/${id}`,data);
        return response.data;

    }

}