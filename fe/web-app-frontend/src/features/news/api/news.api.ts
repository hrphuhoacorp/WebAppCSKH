import { api } from "@/services/axios";

export const newsApi = {
    getPaged: async (params?: {
        search?: string;
        type?: string;
        status?: string;
        isPinned?: boolean;
        page?: number;
        pageSize?: number;
    }) => {
        const response = await api.get("/InternalNews/GetPaged", { params });
        return response.data;
    },

    getById: async (id: number) => {
        const response = await api.get(`/InternalNews/GetById/${id}`);
        return response.data;
    },

    create: async (data: {
        title: string;
        content: string;
        thumbnailUrl?: string;
        type?: string;
        status?: string;
        isPinned?: boolean;
    }) => {
        const response = await api.post("/InternalNews/Create", data);
        return response.data;
    },

    update: async (id: number, data: {
        title: string;
        content: string;
        thumbnailUrl?: string;
        type?: string;
        status?: string;
        isPinned?: boolean;
    }) => {
        const response = await api.put(`/InternalNews/Update/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await api.delete(`/InternalNews/Delete/${id}`);
        return response.data;
    },

    togglePin: async (id: number) => {
        const response = await api.patch(`/InternalNews/TogglePin/${id}`);
        return response.data;
    },

    publish: async (id: number) => {
        const response = await api.patch(`/InternalNews/Publish/${id}`);
        return response.data;
    },

    unpublish: async (id: number) => {
        const response = await api.patch(`/InternalNews/Unpublish/${id}`);
        return response.data;
    },

    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await api.post("/InternalNews/UploadImage", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },
};