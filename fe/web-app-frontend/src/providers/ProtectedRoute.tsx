'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { profile, loading } = useAuth(); // Bây giờ bạn đã có thể lấy 'loading' ra dùng thoải mái
    const router = useRouter();

    useEffect(() => {
        // CHỈ ĐẨY VỀ LOGIN KHI: Đã gọi xong API (loading = false) và không lấy được profile
        if (!loading && !profile) {
            router.push('/login');
        }
    }, [profile, loading, router]);

    // Trong lúc API đang chạy, giữ người dùng ở lại giao diện chờ để tránh bị đá văng nhầm
    if (loading) {
        return (
            <LoadingOverlay open={loading} text="Đang xác thực tài khoản" />

        );
    }

    return profile ? <>{children}</> : null;
}