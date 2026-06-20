'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // ✓ Chỉ check profile từ AuthProvider (token được gửi auto via cookie)
        // Middleware đã check token cookie server-side rồi
        if (!loading && !profile) {
            router.replace('/login');
        }
    }, [profile, loading, router]);

    if (loading) {
        return <LoadingOverlay open text="Đang xác thực tài khoản" />;
    }

    if (!profile) {
        return null; // Middleware sẽ redirect nếu không có token
    }

    return <>{children}</>;
}
