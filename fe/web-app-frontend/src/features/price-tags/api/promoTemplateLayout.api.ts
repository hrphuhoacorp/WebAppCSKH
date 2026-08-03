import { api } from '@/services/axios';
import { FieldConfig, PromoCardLayout, PromoTemplateKind } from '../promoLayout';

export interface PromoTemplateLayoutDTO {
    templateKind: string;
    displayName?: string;
    badge?: string;
    fieldConfigJson?: string;
    layoutJson: string;
    updatedAt?: string;
}

export interface PromoTemplateKindUpsertPayload {
    displayName: string;
    badge: FieldConfig['badge'];
    fieldConfig: FieldConfig;
    layout: PromoCardLayout;
}

export const promoTemplateLayoutApi = {
    getAll: async (): Promise<PromoTemplateLayoutDTO[]> => {
        const response = await api.get('/promo-template-layouts');
        return response.data.content;
    },
    upsert: async (kind: PromoTemplateKind, payload: PromoTemplateKindUpsertPayload): Promise<PromoTemplateLayoutDTO> => {
        const response = await api.put(`/promo-template-layouts/${kind}`, {
            displayName: payload.displayName,
            badge: payload.badge,
            fieldConfigJson: JSON.stringify(payload.fieldConfig),
            layoutJson: JSON.stringify(payload.layout),
        });
        return response.data.content;
    },
    delete: async (kind: PromoTemplateKind): Promise<void> => {
        await api.delete(`/promo-template-layouts/${kind}`);
    },
};
