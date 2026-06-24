import { api } from '@/services/axios';

// ─── Design tokens (re-exported for pages) ────────────────────────────────────
export const R_GREEN = '#086839';
export const R_BORDER = '#e2e8f0';
export const R_CARD_RADIUS = '20px';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecruitmentCampaignDto {
    id: number;
    name: string;
    position: string;
    quantityNeeded?: number;
    startDate: string;
    endDate: string;
    postContent: string;
    requirements: string;
    note: string;
    status: string;
    createdBy: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CampaignUpsertDto {
    name: string;
    position: string;
    quantityNeeded?: number;
    startDate?: string;
    endDate?: string;
    postContent?: string;
    requirements?: string;
    note?: string;
    status?: string;
    createdBy?: string;
}

export interface RecruitmentCandidateDto {
    id: number;
    campaignId?: number;
    candidateName: string;
    phone: string;
    email: string;
    position: string;
    source: string;
    sourceOtherNote: string;
    cvLink: string;
    cvFileName: string;
    cvFilePath: string;
    cvNote: string;
    status: string;
    waitingFor: string;
    interviewTime: string;
    interviewNote: string;
    result: string;
    offerNote: string;
    onboardDate: string;
    mailInviteSent: boolean;
    mailResultSent: boolean;
    createdBy: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CandidateHistoryDto {
    id: number;
    action: string;
    note: string;
    actedBy: string;
    actedAt: string;
}

export interface RecruitmentCandidateDetailDto {
    candidate: RecruitmentCandidateDto;
    history: CandidateHistoryDto[];
}

export interface CandidateCreateDto {
    campaignId?: number;
    candidateName: string;
    phone?: string;
    email?: string;
    position?: string;
    source?: string;
    sourceOtherNote?: string;
    cvLink?: string;
    cvNote?: string;
    status?: string;
    waitingFor?: string;
    interviewTime?: string;
    interviewNote?: string;
    result?: string;
    offerNote?: string;
    onboardDate?: string;
    actedBy?: string;
}

export type CandidateUpdateDto = CandidateCreateDto;

export interface SendMailDto {
    subject: string;
    htmlBody: string;
    mailType: string;
    actedBy?: string;
}

export interface CvUploadResultDto {
    cvFileName?: string;
    cvFilePath?: string;
}

export interface RecruitmentSettingsDto {
    id: number;
    defaultContact: string;
    defaultPhone: string;
    defaultLocation: string;
    signature: string;
    updatedAt?: string;
}

export interface RecruitmentSettingsUpsertDto {
    defaultContact?: string;
    defaultPhone?: string;
    defaultLocation?: string;
    signature?: string;
}

export interface CategoryItemDto {
    id: number;
    value: string;
    sortOrder: number;
}

export interface CategoryUpsertDto {
    type: string;
    value: string;
    sortOrder: number;
}

export interface MailTemplateDto {
    id: number;
    templateType: string;
    subject: string;
    content: string;
    updatedAt?: string;
}

export interface MailTemplateUpsertDto {
    subject: string;
    content: string;
}

export interface MailTemplateCreateDto {
    templateType: string;
    subject: string;
    content: string;
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const recruitmentCampaignApi = {
    getAll: async (includeDeleted = false) => {
        const res = await api.get('/recruitment/campaigns', { params: { includeDeleted } });
        return res.data as { content: RecruitmentCampaignDto[]; status: string };
    },
    getById: async (id: number) => {
        const res = await api.get(`/recruitment/campaigns/${id}`);
        return res.data as { content: RecruitmentCampaignDto; status: string };
    },
    create: async (dto: CampaignUpsertDto) => {
        const res = await api.post('/recruitment/campaigns', dto);
        return res.data as { content: RecruitmentCampaignDto; status: string; message: string };
    },
    update: async (id: number, dto: CampaignUpsertDto) => {
        const res = await api.put(`/recruitment/campaigns/${id}`, dto);
        return res.data as { content: RecruitmentCampaignDto; status: string; message: string };
    },
    delete: async (id: number) => {
        const res = await api.delete(`/recruitment/campaigns/${id}`);
        return res.data as { status: string; message: string };
    },
};

// ─── Candidates ───────────────────────────────────────────────────────────────

export const recruitmentCandidateApi = {
    getAll: async (params: { campaignId?: number; status?: string; search?: string }) => {
        const res = await api.get('/recruitment/candidates', { params });
        return res.data as { content: RecruitmentCandidateDto[]; status: string };
    },
    getById: async (id: number) => {
        const res = await api.get(`/recruitment/candidates/${id}`);
        return res.data as { content: RecruitmentCandidateDetailDto; status: string };
    },
    create: async (dto: CandidateCreateDto) => {
        const res = await api.post('/recruitment/candidates', dto);
        return res.data as { content: RecruitmentCandidateDto; status: string; message: string };
    },
    update: async (id: number, dto: CandidateUpdateDto) => {
        const res = await api.put(`/recruitment/candidates/${id}`, dto);
        return res.data as { content: RecruitmentCandidateDto; status: string; message: string };
    },
    uploadCv: async (id: number, file: File, actedBy?: string) => {
        const form = new FormData();
        form.append('file', file);
        if (actedBy) form.append('actedBy', actedBy);
        const res = await api.post(`/recruitment/candidates/${id}/upload-cv`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data as { content: CvUploadResultDto; status: string; message: string };
    },
    downloadCv: async (id: number) => {
        return api.get(`/recruitment/candidates/${id}/download-cv`, { responseType: 'blob' });
    },
    sendMail: async (id: number, dto: SendMailDto) => {
        const res = await api.post(`/recruitment/candidates/${id}/send-mail`, dto);
        return res.data as { status: string; message: string };
    },
    delete: async (id: number) => {
        const res = await api.delete(`/recruitment/candidates/${id}`);
        return res.data as { status: string; message: string };
    },
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const recruitmentSettingsApi = {
    getSettings: async () => {
        const res = await api.get('/recruitment/settings');
        return res.data as { content: RecruitmentSettingsDto | null; status: string };
    },
    upsertSettings: async (dto: RecruitmentSettingsUpsertDto) => {
        const res = await api.put('/recruitment/settings', dto);
        return res.data as { content: RecruitmentSettingsDto; status: string; message: string };
    },
    getCategories: async () => {
        const res = await api.get('/recruitment/settings/categories');
        return res.data as { content: Record<string, CategoryItemDto[]>; status: string };
    },
    createCategory: async (dto: CategoryUpsertDto) => {
        const res = await api.post('/recruitment/settings/categories', dto);
        return res.data as { content: CategoryItemDto; status: string; message: string };
    },
    updateCategory: async (id: number, dto: CategoryUpsertDto) => {
        const res = await api.put(`/recruitment/settings/categories/${id}`, dto);
        return res.data as { content: CategoryItemDto; status: string; message: string };
    },
    deleteCategory: async (id: number) => {
        const res = await api.delete(`/recruitment/settings/categories/${id}`);
        return res.data as { status: string; message: string };
    },
    getMailTemplates: async () => {
        const res = await api.get('/recruitment/settings/mail-templates');
        return res.data as { content: MailTemplateDto[]; status: string };
    },
    createMailTemplate: async (dto: MailTemplateCreateDto) => {
        const res = await api.post('/recruitment/settings/mail-templates', dto);
        return res.data as { content: MailTemplateDto; status: string; message: string };
    },
    updateMailTemplate: async (id: number, dto: MailTemplateUpsertDto) => {
        const res = await api.put(`/recruitment/settings/mail-templates/${id}`, dto);
        return res.data as { content: MailTemplateDto; status: string; message: string };
    },
};
