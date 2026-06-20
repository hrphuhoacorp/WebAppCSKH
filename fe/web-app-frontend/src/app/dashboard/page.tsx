'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProviders';

const REDIRECT_PRIORITY = [
    { permission: 'cskh.dashboard.view', href: '/dashboard/customer_care/revenue_report' },
    { permission: 'sales.dashboard.view', href: '/dashboard/sales/revenue_report' },
    { permission: 'cskh.order.view_list', href: '/dashboard/customer_care/orders' },
    { permission: 'sales.order.view_list', href: '/dashboard/sales/orders' },
    { permission: 'gift.basket.view', href: '/dashboard/gift_basket/gifts' },
    { permission: 'gift.change_request.view', href: '/dashboard/gift_basket/change_requests' },
    { permission: 'staff.view_list', href: '/dashboard/staff/staff_list' },
    { permission: 'news.create', href: '/dashboard/news' },
    { permission: 'sales.nxt.view', href: '/dashboard/sales/xnt' },
];

export default function DashboardPage() {
    const { profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!profile) {
            router.replace('/login');
            return;
        }

        const permissions = profile.permissions ?? [];

        for (const { permission, href } of REDIRECT_PRIORITY) {
            if (permissions.includes(permission)) {
                router.replace(href);
                return;
            }
        }

        router.replace('/dashboard/profile');
    }, [loading, profile]);

    return null;
}
