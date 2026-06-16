import { Checklist, CampaignRounded, TrendingUp } from '@mui/icons-material';
import {
    LayoutDashboard,
    ShoppingCart,
    Users,
    User,
    Link2,
    History,
    GiftIcon,
    MailCheck,
    ArrowLeftRight,
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
                roles: ['Super_Admin', 'Admin_Online', 'Online'],
            },
            {
                title: 'Danh sách đơn hàng',
                href: '/dashboard/customer_care/orders',
                icon: ShoppingCart,
                roles: ['Super_Admin', 'Admin_Online', 'Online'],
            },
            {
                title: 'Danh sách khách hàng',
                href: '/dashboard/customer_care/customers',
                icon: Users,
                roles: ['Super_Admin', 'Admin_Online', 'Online'],
            },
            {
                title: 'Tỉ lệ quay lại',
                href: '/dashboard/customer_care/return_rate',
                icon: TrendingUp,
                roles: ['Super_Admin', 'Admin_Online', 'Online'],
            },

        ],
    },
    {
        title: 'Giỏ Quà',
        children: [
            {
                title: 'Dashboard',
                href: '/dashboard/gift_basket/dashboard',
                icon: LayoutDashboard,
                // roles: ['Super_Admin', 'Admin_Online', 'Online', 'Staff'],
            },
            {
                title: 'Kho Ảnh Giỏ Quà',
                href: '/dashboard/gift_basket/gifts',
                icon: GiftIcon,
                // roles: ['Super_Admin', 'Admin_Online', 'Online', 'Staff'],
            },
            {
                title: 'Danh sách quy đổi mã',
                href: '/dashboard/gift_basket/baskets',
                icon: Library,
            },
            {
                title: 'Yêu cầu đổi mã',
                href: '/dashboard/gift_basket/change_requests',
                icon: ArrowLeftRight,
                roles: ['Super_Admin', 'Admin_Gift', 'Gói Quà', 'Bán Hàng'],
            },
            {
                title: 'Duyệt mã cần đổi',
                href: '/dashboard/gift_basket/code_mappings',
                icon: Checklist,
                roles: ['Super_Admin', 'Admin_Gift'],
            },
        ],
    },
    {
        title: 'Bán Hàng',
        children: [
            {
                title: 'Danh sách đơn hàng',
                href: '/dashboard/sales/orders',
                icon: ShoppingCart,
                roles: ['Super_Admin', 'Bán Hàng'],
            }

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