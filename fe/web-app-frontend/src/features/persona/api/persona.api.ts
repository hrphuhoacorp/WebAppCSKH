import { api } from '@/services/axios';

export interface PersonaTagDto {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    color: string;
    hasAutoRule: boolean;
    isActive: boolean;
    displayOrder: number;
    activeAssignmentCount: number;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface CreatePersonaTagInput {
    name: string;
    description?: string;
    color: string;
}

export interface UpdatePersonaTagInput {
    name: string;
    description?: string;
    color: string;
    isActive: boolean;
    displayOrder: number;
}

export interface PersonaTagAssignmentDto {
    id: number;
    customerId: number;
    tagId: number;
    tagName: string;
    tagColor: string;
    source: 'auto' | 'manual';
    note?: string | null;
    assignedByName?: string | null;
    assignedAt?: string | null;
}

export interface CustomerWithTagsDto {
    id: number;
    customerCode: string;
    name: string;
    phone?: string | null;
    tags: PersonaTagAssignmentDto[];
}

export interface PagedResult<T> {
    totalItems: number;
    page: number;
    pageSize: number;
    items: T[];
}

export interface CategoryRevenueShareCondition {
    type: 'category_revenue_share';
    categories: string[];
    minSharePercent: number;
    lookbackDays?: number | null;
}

export interface OrderFrequencyCondition {
    type: 'order_frequency';
    minOrderCount: number;
    lookbackDays: number;
    categories?: string[] | null;
}

export interface LunarDateRecurrenceCondition {
    type: 'lunar_date_recurrence';
    lunarDays: number[];
    windowDays: number;
    minOccurrences: number;
    lookbackMonths: number;
}

export type PersonaCondition = CategoryRevenueShareCondition | OrderFrequencyCondition | LunarDateRecurrenceCondition;

export interface PersonaRuleConfig {
    combinator: 'AND';
    conditions: PersonaCondition[];
}

export interface PersonaCustomerSample {
    id: number;
    customerCode: string;
    name: string;
    phone?: string | null;
    totalRevenue: number;
}

export interface PersonaRulePreview {
    matchedCount: number;
    sample: PersonaCustomerSample[];
}

export interface PersonaClassificationRun {
    id: number;
    tagId: number;
    tagName: string;
    runByName: string;
    runAt?: string | null;
    matchedCustomerCount: number;
    newlyAddedCount: number;
    removedCount: number;
    unchangedCount: number;
}

export interface PersonaClassificationRunDetail extends PersonaClassificationRun {
    addedCustomers: PersonaCustomerSample[];
    removedCustomers: PersonaCustomerSample[];
}

export type PersonaInteractionType = 'note' | 'call' | 'complaint' | 'care_action';
export type PersonaInteractionChannel = 'phone' | 'zalo' | 'email' | 'in_person' | 'other';
export type PersonaComplaintStatus = 'open' | 'in_progress' | 'resolved';

export interface PersonaInteractionDto {
    id: number;
    customerId: number;
    customerName: string;
    customerCode: string;
    type: PersonaInteractionType;
    channel?: PersonaInteractionChannel | null;
    content: string;
    complaintStatus?: PersonaComplaintStatus | null;
    occurredAt: string;
    createdByName: string;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface CreatePersonaInteractionInput {
    customerId: number;
    type: PersonaInteractionType;
    channel?: PersonaInteractionChannel;
    content: string;
    complaintStatus?: PersonaComplaintStatus;
    occurredAt: string;
}

export interface UpdatePersonaInteractionInput {
    type: PersonaInteractionType;
    channel?: PersonaInteractionChannel;
    content: string;
    complaintStatus?: PersonaComplaintStatus;
    occurredAt: string;
}

export type PersonaOccasionType = 'lunar_recurring' | 'solar_recurring' | 'customer_birthday';

export interface PersonaCareScheduleDto {
    id: number;
    tagId?: number | null;
    tagName?: string | null;
    name: string;
    occasionType: PersonaOccasionType;
    lunarDay?: number | null;
    lunarMonth?: number | null;
    solarMonth?: number | null;
    solarDay?: number | null;
    leadDays: number;
    isActive: boolean;
    createdAt?: string | null;
}

export interface CreatePersonaCareScheduleInput {
    tagId?: number | null;
    name: string;
    occasionType: PersonaOccasionType;
    lunarDay?: number | null;
    lunarMonth?: number | null;
    solarMonth?: number | null;
    solarDay?: number | null;
    leadDays: number;
}

export interface UpdatePersonaCareScheduleInput extends CreatePersonaCareScheduleInput {
    isActive: boolean;
}

export interface PersonaReminderDto {
    scheduleId?: number | null;
    occasionName: string;
    customerId?: number | null;
    customerCode: string;
    customerName: string;
    phone?: string | null;
    occasionDate: string;
    daysAway: number;
    alreadyContacted: boolean;
}

export interface PersonaTagDistribution {
    tagName: string;
    tagColor: string;
    count: number;
}

export interface PersonaOverview {
    totalCustomers: number;
    taggedCustomers: number;
    untaggedCustomers: number;
    openComplaints: number;
    upcomingReminders7Days: number;
    tagDistribution: PersonaTagDistribution[];
}

export const personaApi = {
    getTags: async (): Promise<PersonaTagDto[]> => {
        const res = await api.get('/PersonaTag/Tags');
        return res.data.content ?? [];
    },

    createTag: async (input: CreatePersonaTagInput): Promise<PersonaTagDto> => {
        const res = await api.post('/PersonaTag/Tags', input);
        return res.data.content;
    },

    updateTag: async (id: number, input: UpdatePersonaTagInput): Promise<PersonaTagDto> => {
        const res = await api.put(`/PersonaTag/Tags/${id}`, input);
        return res.data.content;
    },

    deleteTag: async (id: number): Promise<boolean> => {
        const res = await api.delete(`/PersonaTag/Tags/${id}`);
        return res.data.content;
    },

    assignTag: async (customerId: number, tagId: number, note?: string): Promise<PersonaTagAssignmentDto> => {
        const res = await api.post('/PersonaTag/Assignments', { customerId, tagId, note });
        return res.data.content;
    },

    removeAssignment: async (assignmentId: number): Promise<boolean> => {
        const res = await api.delete(`/PersonaTag/Assignments/${assignmentId}`);
        return res.data.content;
    },

    getCustomerTags: async (customerId: number): Promise<PersonaTagAssignmentDto[]> => {
        const res = await api.get(`/PersonaTag/Customers/${customerId}/Tags`);
        return res.data.content ?? [];
    },

    getCustomersWithTags: async (params: { search?: string; page: number; pageSize: number }): Promise<PagedResult<CustomerWithTagsDto>> => {
        const res = await api.get('/PersonaTag/CustomersWithTags', { params });
        return res.data.content ?? { totalItems: 0, page: 1, pageSize: params.pageSize, items: [] };
    },

    getDistinctCategories: async (search?: string): Promise<string[]> => {
        const res = await api.get('/PersonaTag/Categories/Distinct', { params: { search } });
        return res.data.content ?? [];
    },

    getTagRule: async (tagId: number): Promise<PersonaRuleConfig | null> => {
        const res = await api.get(`/PersonaTag/Tags/${tagId}/Rule`);
        return res.data.content ?? null;
    },

    setTagRule: async (tagId: number, config: PersonaRuleConfig | null): Promise<boolean> => {
        const res = await api.put(`/PersonaTag/Tags/${tagId}/Rule`, config);
        return res.data.content;
    },

    previewRule: async (tagId: number, config: PersonaRuleConfig): Promise<PersonaRulePreview> => {
        const res = await api.post(`/PersonaTag/Tags/${tagId}/Preview`, config);
        return res.data.content;
    },

    runClassification: async (tagId: number): Promise<PersonaClassificationRun> => {
        const res = await api.post(`/PersonaTag/Tags/${tagId}/Run`);
        return res.data.content;
    },

    getRuns: async (params: { tagId?: number; page: number; pageSize: number }): Promise<PagedResult<PersonaClassificationRun>> => {
        const res = await api.get('/PersonaTag/Runs', { params });
        return res.data.content ?? { totalItems: 0, page: 1, pageSize: params.pageSize, items: [] };
    },

    getRunDetail: async (runId: number): Promise<PersonaClassificationRunDetail> => {
        const res = await api.get(`/PersonaTag/Runs/${runId}`);
        return res.data.content;
    },

    getInteractions: async (params: { customerId?: number; type?: string; page: number; pageSize: number }): Promise<PagedResult<PersonaInteractionDto>> => {
        const res = await api.get('/PersonaCare/Interactions', { params });
        return res.data.content ?? { totalItems: 0, page: 1, pageSize: params.pageSize, items: [] };
    },

    createInteraction: async (input: CreatePersonaInteractionInput): Promise<PersonaInteractionDto> => {
        const res = await api.post('/PersonaCare/Interactions', input);
        return res.data.content;
    },

    updateInteraction: async (id: number, input: UpdatePersonaInteractionInput): Promise<PersonaInteractionDto> => {
        const res = await api.put(`/PersonaCare/Interactions/${id}`, input);
        return res.data.content;
    },

    deleteInteraction: async (id: number): Promise<boolean> => {
        const res = await api.delete(`/PersonaCare/Interactions/${id}`);
        return res.data.content;
    },

    searchCustomers: async (search?: string): Promise<PersonaCustomerSample[]> => {
        const res = await api.get('/PersonaCare/Customers/Search', { params: { search } });
        return res.data.content ?? [];
    },

    getSchedules: async (): Promise<PersonaCareScheduleDto[]> => {
        const res = await api.get('/PersonaCare/Schedules');
        return res.data.content ?? [];
    },

    createSchedule: async (input: CreatePersonaCareScheduleInput): Promise<PersonaCareScheduleDto> => {
        const res = await api.post('/PersonaCare/Schedules', input);
        return res.data.content;
    },

    updateSchedule: async (id: number, input: UpdatePersonaCareScheduleInput): Promise<PersonaCareScheduleDto> => {
        const res = await api.put(`/PersonaCare/Schedules/${id}`, input);
        return res.data.content;
    },

    deleteSchedule: async (id: number): Promise<boolean> => {
        const res = await api.delete(`/PersonaCare/Schedules/${id}`);
        return res.data.content;
    },

    getReminders: async (daysAhead: number): Promise<PersonaReminderDto[]> => {
        const res = await api.get('/PersonaCare/Reminders', { params: { daysAhead } });
        return res.data.content ?? [];
    },

    getOverview: async (): Promise<PersonaOverview> => {
        const res = await api.get('/PersonaCare/Overview');
        return res.data.content;
    },
};
