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
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const res = await authApi.getProfile();
                setProfile(res.content);
            } catch {
                setProfile(null);
            }
        };

        loadProfile();
    }, []);

    return (
        <AuthContext.Provider value={{ profile, setProfile }}>
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