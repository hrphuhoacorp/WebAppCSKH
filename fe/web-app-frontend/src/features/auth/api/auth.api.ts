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

    changePassword: async (data: {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
    }) => {
        const response = await api.post('/Auth/ChangePassword', data);

        return response.data;
    },

    

    resetPassword: async (userId: number) => {
        const response = await api.post('/Auth/ResetPassword', null, {
            params: { userId },
        });

        return response.data;
    },

    createAccount: async (data: {
        staffCode: string;
        branchesId: number;
        name: string;
        email: string;
        phone: string;
        dayOfBirth: string | null;
        roleId: number;
    }) => {
        const response = await api.post('/Auth/CreateAccount', data);
        return response.data;
    },

 
};
