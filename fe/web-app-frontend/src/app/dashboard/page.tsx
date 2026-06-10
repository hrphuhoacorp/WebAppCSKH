'use client';
import { useAuth } from "@/providers/AuthProviders";
import { redirect } from "next/navigation";

export default function DashboardPage() {
    const { profile } = useAuth();
    const userRoles = profile?.roles.map(r => r.name) ?? [];

    if (userRoles.includes('Super_Admin')) {
        redirect('/dashboard/customer_care/revenue_report');
    }

    if (userRoles.includes('Admin_Media')) {
        redirect('/dashboard/customer_care/revenue_report');
    }

    if (userRoles.includes('Online')) {
        redirect('/dashboard/customer_care/orders');
    }

    if (userRoles.includes('Staff')) {
        redirect('/dashboard/customer_care/gifts');
    }

    redirect('/login')
}