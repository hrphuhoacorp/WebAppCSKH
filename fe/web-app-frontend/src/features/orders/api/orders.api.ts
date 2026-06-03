// public class OrderFilterDTO
// {
//     public int Page { get; set; } = 1;
//     public int PageSize { get; set; } = 20;

import { api } from "@/services/axios";

//     public string ? Search { get; set; } // mã đơn / tên KH / SĐT

//     public DateTime ? FromDate { get; set; }
//     public DateTime ? ToDate { get; set; }

//     public int ? StatusId { get; set; }
//     public int ? BranchId { get; set; }
//     public string ? Source { get; set; }

//     public string SortBy { get; set; } = "purchaseDate"; // purchaseDate | revenue
//     public string SortDir { get; set; } = "desc"; // asc | desc
// }

export const ordersApi = {
    getOrders: async (data: {
        page: number;
        pageSize: number;
        search?: string;
        fromDate?: string;
        toDate?: string;
        statusId?: number;
        branchId?: number;
        source?: string;
        sortBy?: string;
        sortDir?: string;
    }) => {
        // Gọi API để lấy dữ liệu đơn hàng với các tham số lọc
        const reponse = await api.get('/Order/GetAllOrdersAsync', { params: data });
        return reponse.data;
    },

    getStatuses: async () => {
        const reponse = await api.get('/Order/GetAllStatusesAsync');
        return reponse.data;
    },

    getBranches: async () => {
        const reponse = await api.get('/Order/GetAllBranchesAsync');
        return reponse.data;
    },

    importExcel: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post(
            '/Order/ImportExcel',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return response.data;

    },
    getOrderById: async (id: number) => {
        const response = await api.get(`/Order/GetOrderByIdAsync/${id}`);
        return response.data;
    },


};