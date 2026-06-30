import axios from 'axios';

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_DOTNET_API_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

api.interceptors.response.use(
    res => res,
    err => {
        const serverMsg = err?.response?.data?.Message || err?.response?.data?.message;
        if (serverMsg) err.message = serverMsg;
        return Promise.reject(err);
    }
);
