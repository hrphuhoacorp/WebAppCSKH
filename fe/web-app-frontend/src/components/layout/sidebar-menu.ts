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
    Import,
} from 'lucide-react';
import React from 'react';


export interface SidebarSubItem {
    title: string;
    href: string;
    icon: React.ComponentType<any>;
    isExternal?: boolean;
    permissions?: string[]; // show if user has ANY of these; empty = show always
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
                permissions: ['cskh.dashboard.view'],
            },
            {
                title: 'Danh sách đơn hàng',
                href: '/dashboard/customer_care/orders',
                icon: ShoppingCart,
                permissions: ['cskh.order.view_list'],
            },
            {
                title: 'Danh sách khách hàng',
                href: '/dashboard/customer_care/customers',
                icon: Users,
                permissions: ['cskh.customer.view_list'],
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
                permissions: ['gift.basket.view', 'gift.change_request.view'],
            },
            {
                title: 'Kho Ảnh Giỏ Quà',
                href: '/dashboard/gift_basket/gifts',
                icon: GiftIcon,
                permissions: ['gift.basket.view'],
            },
            {
                title: 'Danh sách quy đổi mã',
                href: '/dashboard/gift_basket/baskets',
                icon: Library,
                permissions: ['gift.basket.view'],
            },
            {
                title: 'Yêu cầu đổi mã',
                href: '/dashboard/gift_basket/change_requests',
                icon: ArrowLeftRight,
                permissions: ['gift.change_request.view'],
            },
            {
                title: 'Duyệt mã cần đổi',
                href: '/dashboard/gift_basket/code_mappings',
                icon: Checklist,
                permissions: ['gift.change_request.handle'],
            },
        ],
    },
    {
        title: 'Bán Hàng',
        children: [
            {
                title: 'Dashboard',
                href: '/dashboard/sales/revenue_report',
                icon: LayoutDashboard,
                permissions: ['sales.dashboard.view'],
            },
            {
                title: 'Danh sách đơn hàng',
                href: '/dashboard/sales/orders',
                icon: ShoppingCart,
                permissions: ['sales.order.view_list'],
            },
            {
                title: 'Kiểm Giỏ Quà',
                href: '/dashboard/sales/xnt',
                icon: Import,
                permissions: ['sales.nxt.view'],
            },
            {
                title: 'Tỉ lệ quay lại',
                href: '/dashboard/sales/return_rate',
                icon: TrendingUp,
                permissions: ['cskh.customer.return_rate'],
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
                permissions: ['staff.view_list'],
            },
            {
                title: 'Lịch Sử Thao Tác',
                href: '/dashboard/staff/history',
                icon: History,
                permissions: ['staff.view_activity_log'],
            },
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
                permissions: ['staff.view_list']
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
                permissions: ['news.create'],
            },
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
];
