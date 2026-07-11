import { api } from '@/services/axios';

export interface PersonalFolderDto {
    id: number;
    name: string;
    parentId?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface PersonalFileDto {
    id: number;
    folderId?: number | null;
    fileName: string;
    originalName?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface BreadcrumbItemDto {
    id: number;
    name: string;
}

export interface PersonalItemsDto {
    folders: PersonalFolderDto[];
    files: PersonalFileDto[];
    breadcrumb: BreadcrumbItemDto[];
}

export interface PersonalRecycleItemDto {
    id: number;
    name: string;
    isFolder: boolean;
    deletedAt?: string | null;
}

export interface ItemsSelection {
    folderIds: number[];
    fileIds: number[];
}

export function personalFileContentUrl(id: number): string {
    return `${process.env.NEXT_PUBLIC_DOTNET_API_URL}/PersonalFile/Files/${id}/Content`;
}
export function personalFileDownloadUrl(id: number): string {
    return `${process.env.NEXT_PUBLIC_DOTNET_API_URL}/PersonalFile/Files/${id}/Download`;
}

export const personalFilesApi = {
    getFolders: async (): Promise<PersonalFolderDto[]> => {
        const res = await api.get('/PersonalFile/Folders');
        return res.data.content ?? [];
    },

    getItems: async (folderId: number | null, search?: string): Promise<PersonalItemsDto> => {
        const res = await api.get('/PersonalFile/Items', { params: { folderId: folderId ?? undefined, search: search || undefined } });
        return res.data.content ?? { folders: [], files: [], breadcrumb: [] };
    },

    createFolder: async (name: string, parentId: number | null): Promise<PersonalFolderDto> => {
        const res = await api.post('/PersonalFile/Folders', { name, parentId });
        return res.data.content;
    },

    renameFolder: async (id: number, newName: string): Promise<PersonalFolderDto> => {
        const res = await api.put(`/PersonalFile/Folders/${id}/Rename`, { newName });
        return res.data.content;
    },

    renameFile: async (id: number, newName: string): Promise<PersonalFileDto> => {
        const res = await api.put(`/PersonalFile/Files/${id}/Rename`, { newName });
        return res.data.content;
    },

    upload: async (folderId: number | null, files: File[], onProgress?: (pct: number) => void): Promise<PersonalFileDto[]> => {
        const formData = new FormData();
        if (folderId != null) formData.append('folderId', String(folderId));
        files.forEach(f => formData.append('files', f));
        const res = await api.post('/PersonalFile/Upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: e => {
                if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
            },
        });
        return res.data.content ?? [];
    },

    move: async (selection: ItemsSelection, targetFolderId: number | null): Promise<boolean> => {
        const res = await api.post('/PersonalFile/Move', { ...selection, targetFolderId });
        return res.data.content;
    },

    copy: async (selection: ItemsSelection, targetFolderId: number | null): Promise<boolean> => {
        const res = await api.post('/PersonalFile/Copy', { ...selection, targetFolderId });
        return res.data.content;
    },

    delete: async (selection: ItemsSelection): Promise<boolean> => {
        const res = await api.post('/PersonalFile/Delete', selection);
        return res.data.content;
    },

    getTrash: async (): Promise<PersonalRecycleItemDto[]> => {
        const res = await api.get('/PersonalFile/Trash');
        return res.data.content ?? [];
    },

    restore: async (selection: ItemsSelection): Promise<boolean> => {
        const res = await api.post('/PersonalFile/Trash/Restore', selection);
        return res.data.content;
    },

    permanentDelete: async (selection: ItemsSelection): Promise<boolean> => {
        const res = await api.post('/PersonalFile/Trash/PermanentDelete', selection);
        return res.data.content;
    },
};
