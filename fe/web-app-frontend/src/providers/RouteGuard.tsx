'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProviders';
import { sidebarMenu } from '@/components/layout/sidebar-menu';

function checkAccess(pathname: string, userRoles: string[]): boolean {
    for (const group of sidebarMenu) {
        for (const item of group.children) {
            if (item.isExternal) continue;

            const matches = pathname === item.href || pathname.startsWith(item.href + '/');
            if (!matches) continue;

           
            if (!item.roles || item.roles.length === 0) return true; 
            return item.roles.some(r => userRoles.includes(r));
        }
    }
    return true; // route không có trong menu → không chặn
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
    const { profile, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const userRoles = profile?.roles.map(r => r.name) ?? [];
    const allowed = loading || !profile || checkAccess(pathname, userRoles);

    useEffect(() => {
        if (!loading && profile && !allowed) {
            router.replace('/forbidden');
        }
    }, [pathname, profile, loading, allowed, router]);

    if (!allowed) return null;

    return <>{children}</>;
}
