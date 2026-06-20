import { api } from '@/services/axios';

export interface PermissionDTO {
    id: number;
    code: string;
    name: string;
}

export interface PermissionGroupDTO {
    module: string;
    permissions: PermissionDTO[];
}

export interface UserPermissionDetailDTO {
    userId: number;
    userName: string;
    rolePermissionCodes: string[];
    extraPermissionIds: number[];
}

export const permissionApi = {
    getAll: async (): Promise<PermissionGroupDTO[]> => {
        const res = await api.get('/Permission/All');
        return res.data.content;
    },

    getUser: async (userId: number): Promise<UserPermissionDetailDTO> => {
        const res = await api.get(`/Permission/User/${userId}`);
        return res.data.content;
    },

    updateUser: async (userId: number, extraPermissionIds: number[]): Promise<void> => {
        await api.put(`/Permission/User/${userId}`, { extraPermissionIds });
    },
};
