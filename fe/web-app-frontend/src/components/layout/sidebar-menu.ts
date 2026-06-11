import { Checklist, CampaignRounded } from '@mui/icons-material';
import {
    LayoutDashboard,
    ShoppingCart,
    Users,
    User,
    Link2,
    History,
    GiftIcon,
    MailCheck,
    BarChart2,
    ArrowLeftRight,
    Table2,
    Library,
} from 'lucide-react';
import React from 'react';


export interface SidebarSubItem {
    title: string;
    href: string;
    icon: React.ComponentType<any>;
    isExternal?: boolean;
    roles?: string[];
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
                roles: ['Super_Admin', 'Admin_Media', 'Online'],
            },
            {
                title: 'Danh sách đơn hàng',
                href: '/dashboard/customer_care/orders',
                icon: ShoppingCart,
                roles: ['Super_Admin', 'Admin_Media', 'Online'],
            },
            {
                title: 'Danh sách khách hàng',
                href: '/dashboard/customer_care/customers',
                icon: Users,
                roles: ['Super_Admin', 'Admin_Media', 'Online'],
            },
            {
                title: 'Kho Ảnh Giỏ Quà',
                href: '/dashboard/customer_care/gifts',
                icon: GiftIcon,
                roles: ['Super_Admin', 'Admin_Media', 'Online', 'Staff'],
            },
        ],
    },
    {
        title: 'Giỏ Quà',
        children: [
            {
                title: 'Thư viện giỏ',
                href: '/dashboard/gift_basket/baskets',
                icon: Library,
            },
            {
                title: 'Dashboard Sapo',
                href: '/dashboard/gift_basket/sapo',
                icon: BarChart2,
            },
            {
                title: 'Yêu cầu đổi mã',
                href: '/dashboard/gift_basket/change_requests',
                icon: ArrowLeftRight,
            },
            {
                title: 'Bảng quy đổi mã',
                href: '/dashboard/gift_basket/code_mappings',
                icon: Table2,
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
                roles: ['Super_Admin'],

            },
            {
                title: 'Lịch Sử Thao Tác',
                href: '/dashboard/staff/history',
                icon: History,
                roles: ['Super_Admin'],
            }
        ],
    },
 

    {
        title: 'Tiện Ích',
        children: [
            {
                title: 'PHF Stask',
                href: 'https://script.google.com/macros/s/AKfycbwRHLO6YAMGpzVdItrypOV-GiVnVz-P8vK_b8VV77JDs2bviAdzdkK2iXugVbKXGdXCAQ/exec',
                icon: Checklist,
                isExternal: true,
            },
            {
                title: 'PHF AppMail',
                href: 'https://script.google.com/macros/s/AKfycbyHFuZlHGDkPN1Be44vgGNxsm5cijRn8RbpQHA3hBj8a6ZmbAe_A7LXkDrStJTtSoDA/exec',
                icon: MailCheck,
                isExternal: true,
                roles: ['Super_Admin'],
            },
            {
                title: 'Tổng hợp link',
                href: '/dashboard/links',
                icon: Link2,
            },
        ],
    },
    {
        title: 'Nội Bộ',
        children: [
            {
                title: 'Quản lý tin nội bộ',
                href: '/dashboard/news',
                icon: CampaignRounded,
                roles: ['Super_Admin', 'Admin_Media'],
            }
        ]
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
];