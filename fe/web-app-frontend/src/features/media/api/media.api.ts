import { api } from "@/services/axios"

export const mediaApi = {
    getFolder: async () => {
        const response = await api.get('/Media/GetFolder')

        return response.data

    },

    createFolder: async (data: {
        name: string;
        parentId?: number | null;
    }) => {
        const response = await api.post('/Media/CreateFolder', data);
        return response.data;
    },

    deleteFolder: async (id: number) => {
        const response = await api.delete(`/Media/DeleteFolder/${id}`);
        return response.data;
    },

    restoreFolder: async (id: number) => {
        const response = await api.put(`/Media/RestoreFolder/${id}`);
        return response.data;
    },

    renameFolder: async (id: number, data: {
        name: string;
    }) => {
        const response = await api.put(`/Media/RenameFolder/${id}`, data);
        return response.data;
    },


    getFiles: async (params: {
        forderId?: number;
        search?: string

    }) => {
        const response = await api.get('/Media/GetFiles', {
            params
        });
        return response.data;
    },


    upload: async (data: {
        folderId: number;
        files: File[];
    }) => {
        const formData = new FormData();
        formData.append('folderId', data.folderId.toString());
        data.files.forEach(file => {
            formData.append('files', file);
        })
        const response = await api.post('/Media/Upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;

    },

    recycleBin: async () => {
        const response = await api.get('/Media/RecycleBin')
        return response.data;

    },

    moveFile: async (data: {
        fileId: number;
        folderId: number;
    }) => {
        const response = await api.put(`/Media/MoveFile?id=${data.fileId}`, data);
        return response.data;
    },

    deleteFiles: async (ids: number[]) => {
        const response = await api.post('/Media/DeleteFiles', ids);
        return response.data;
    },

    restoreFile: async (id: number) => {
        const response = await api.put(`/Media/RestoreFile/${id}`);
        return response.data;
    },




}