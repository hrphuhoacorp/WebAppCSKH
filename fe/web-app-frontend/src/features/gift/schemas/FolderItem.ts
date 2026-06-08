export type FolderItem = {
    id: number
    name: string
    parentId: number | null
    count: number
}

export type MediaFile = {
    id: number
    folderId: number
    fileName: string
    fileUrl: string
    size: string
    createdAt: string
    tags: string[]
}