'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProviders';
import { sidebarMenu } from '@/components/layout/sidebar-menu';

function checkAccess(pathname: string, userPermissions: string[]): boolean {
    for (const group of sidebarMenu) {
        for (const item of group.children) {
            if (item.isExternal) continue;

            const matches = pathname === item.href || pathname.startsWith(item.href + '/');
            if (!matches) continue;

            if (!item.permissions || item.permissions.length === 0) return true;
            return item.permissions.some(p => userPermissions.includes(p));
        }
    }
    return true; // route không có trong menu → không chặn
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
    const { profile, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const userPermissions = profile?.permissions ?? [];
    const allowed = loading || !profile || checkAccess(pathname, userPermissions);

    useEffect(() => {
        if (!loading && profile && !allowed) {
            router.replace('/forbidden');
        }
    }, [pathname, profile, loading, allowed, router]);

    if (!allowed) return null;

    return <>{children}</>;
}
