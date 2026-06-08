import { Task } from '@mui/icons-material';
import {
    LayoutDashboard,
    ShoppingCart,
    Users,
    User,
    Link2,
    History,
} from 'lucide-react';
import React from 'react';


export interface SidebarSubItem {
    title: string;
    href: string;
    icon: React.ComponentType<any>;
    isExternal?: boolean;
}

export interface SidebarGroup {
    title: string;
    children: SidebarSubItem[];
}
export const sidebarMenu: SidebarGroup[] = [
    {
        title: 'Chăm sóc khách hàng',
        children: [
            {
                title: 'Dashboard',
                href: '/dashboard/customer_care/revenue_report',
                icon: LayoutDashboard,
            },
            {
                title: 'Danh sách đơn hàng',
                href: '/dashboard/customer_care/orders',
                icon: ShoppingCart,
            },
            {
                title: 'Danh sách khách hàng',
                href: '/dashboard/customer_care/customers',
                icon: Users,
            },
        ],
    },
    {
        title: 'Nhân sự',
        children: [
            {
                title: 'Danh sách nhân viên',
                href: '/dashboard/staff/staff_list',
                icon: Users,
            },
            {
                title: 'Lịch Sử Thao Tác',
                href: '/dashboard/staff/history',
                icon: History
            }
        ],
    },
    {
        title: 'Thông tin cá nhân',
        children: [
            {
                title: 'Thông tin cá nhân',
                href: '/dashboard/profile',
                icon: User,
            },
        ],
    },
    {
        title: 'PHF Stask',
        children: [
            {
                title: 'Tổng hợp link',
                href: 'https://script.google.com/macros/s/AKfycbwRHLO6YAMGpzVdItrypOV-GiVnVz-P8vK_b8VV77JDs2bviAdzdkK2iXugVbKXGdXCAQ/exec',
                icon: Task,
                isExternal: true,
            }
        ],
    },
    {
        title: 'Tổng hợp link',
        children: [
            {
                title: 'Tổng hợp link',
                href: '/dashboard/links',
                icon: Link2,
            },
        ],
    },
];