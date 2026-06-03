import { api } from '@/services/axios';

export const authApi = {
    login: async (data: {
        email: string;
        password: string;
    }) => {
        const response = await api.post('/Auth/Login', data);

        return response.data;
    },

    logout: async () => {
        const response = await api.post('/Auth/Logout');

        return response.data;
    },

    getProfile: async () => {
        const response = await api.get('/Auth/Profile');

        return response.data;
    },

};