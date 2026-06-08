export interface MediaFolderDto {
    id: number;
    name: string;
    parentId: number | null;
    isPublic: boolean;
    createdAt: string;
    createdBy: string;
    children: MediaFolderDto[];
    count?: number;
}