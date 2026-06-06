'use client';

import { authApi } from '@/features/auth/api/auth.api';
import { UserProfile } from '@/features/user/schemas/user-profile';
import {
    createContext,
    useContext,
    useEffect,
    useState,
} from 'react';

type AuthContextType = {
    profile: UserProfile | null;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
    loading: boolean; // THÊM DÒNG NÀY
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true); // THÊM DÒNG NÀY: Mặc định ban đầu là đang tải (true)

    useEffect(() => {
        const loadProfile = async () => {
            try {
                setLoading(true); // Bắt đầu gọi API thì bật loading
                const res = await authApi.getProfile();
                setProfile(res.content);
            } catch {
                setProfile(null);
            } finally {
                setLoading(false); // Gọi API xong (dù thành công hay lỗi) thì tắt loading đi
            }
        };

        loadProfile();
    }, []);

    return (
        // Đưa loading vào value truyền xuống cho toàn hệ thống sử dụng
        <AuthContext.Provider value={{ profile, setProfile, loading }}>
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