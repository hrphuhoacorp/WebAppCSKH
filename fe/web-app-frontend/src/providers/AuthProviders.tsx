'use client';

import { authApi } from '@/features/auth/api/auth.api';
import { UserProfile } from '@/features/user/schemas/user-profile';
import * as signalR from '@microsoft/signalr';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

type AuthContextType = {
    profile: UserProfile | null;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
    loading: boolean;
    loadProfile: (silent?: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true); // THÊM DÒNG NÀY: Mặc định ban đầu là đang tải (true)

    const loadProfile = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await authApi.getProfile();
            setProfile(res.content);
        } catch (error: any) {
            console.error('Failed to load profile:', error?.response?.data?.Message || error?.message);
            setProfile(null);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        const origin = process.env.NEXT_PUBLIC_DOTNET_API_ORIGIN ?? '';
        const conn = new signalR.HubConnectionBuilder()
            .withUrl(`${origin}/hubs/notification`, { withCredentials: true })
            .withAutomaticReconnect()
            .build();

        conn.on('PermissionsChanged', async () => {
            console.log('[SignalR] PermissionsChanged received — refreshing token...');
            await fetch(`${origin}/api/Auth/RefreshToken`, {
                method: 'POST',
                credentials: 'include',
            });
            window.location.reload();
        });

        conn.start().catch(() => {});
        return () => { conn.stop(); };
    }, []);

    return (
        // Đưa loading vào value truyền xuống cho toàn hệ thống sử dụng
        <AuthContext.Provider value={{ profile, setProfile, loading, loadProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider');
    }

    return context;
}