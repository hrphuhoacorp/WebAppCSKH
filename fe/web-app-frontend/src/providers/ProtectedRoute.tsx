'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Check localStorage flag ngay lập tức — không chờ API
        const hasFlag = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === '1';
        if (!hasFlag) {
            router.replace('/login');
            return;
        }
        // Có flag nhưng API xác thực thất bại (token hết hạn) → xóa flag và về login
        if (!loading && !profile) {
            localStorage.removeItem('isLoggedIn');
            router.replace('/login');
        }
    }, [profile, loading, router]);

    if (!profile) {
        return <LoadingOverlay open text="Đang xác thực tài khoản" />;
    }

    return <>{children}</>;
}
