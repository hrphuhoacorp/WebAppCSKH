'use client';
import { useAuth } from "@/providers/AuthProviders";
import { redirect } from "next/navigation";
import { UserRole } from '../../features/user/schemas/user-profile';

export default function DashboardPage() {
    const { profile } = useAuth();
    const userRoles = profile?.roles.map(r => r.name) ?? [];

    if (userRoles.includes('Super_Admin')) {
        redirect('/dashboard/customer_care/revenue_report');
    }

    if (userRoles.includes('Admin_Online')) {
        redirect('/dashboard/customer_care/revenue_report');
    }

    if (userRoles.includes('Online')) {
        redirect('/dashboard/customer_care/orders');
    }

    if (userRoles.includes('Bán Hàng')) {
        redirect('/dashboard/gift_basket/gifts');
    }

    if (userRoles.includes('Admin_Gift')) {
        redirect('/dashboard/gift_basket/baskets');
    }
    if (userRoles.includes('Gói Quà')) {
        redirect('/dashboard/gift_basket/change_requests');
    }

    redirect('/login')
}
