export interface UserRole {
    id: number;
    name: string;
}

export interface ImportHistory {
    id: number;
    fileName: string;
    status: string;
    importBy: string;
    successCount: number;
    errorCount: number;
    importDate: string;
    rollbackAt?: string;
    rollbackBy?: string;
    fileUrl?: string | null;
}

export interface UserProfile {
    id: number;
    staffCode: string;
    name: string;
    email: string;
    phone: string;

    dayOfBirth: string;

    branchesId: number;
    branchesName: string;

    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;

    roles: UserRole[];

    importHistories: ImportHistory[];
}