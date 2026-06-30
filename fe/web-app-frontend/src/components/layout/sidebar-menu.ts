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
    Briefcase,
    Package,
    ClipboardList,
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
                title: 'Tổng Quan CSKH',
                href: '/dashboard/customer_care/revenue_report',
                icon: LayoutDashboard,
                permissions: ['cskh.dashboard.view'],
            },
            {
                title: 'Danh Sách Đơn Hàng',
                href: '/dashboard/customer_care/orders',
                icon: ShoppingCart,
                permissions: ['cskh.order.view_list'],
            },
            {
                title: 'Danh Sách Khách Hàng',
                href: '/dashboard/customer_care/customers',
                icon: Users,
                permissions: ['cskh.customer.view_list'],
            },
        ],
    },
    {
        title: 'Bán Hàng',
        children: [
            {
                title: 'Tổng Quan Bán Hàng',
                href: '/dashboard/sales/revenue_report',
                icon: LayoutDashboard,
                permissions: ['sales.dashboard.view'],
            },
            {
                title: 'Danh Sách Đơn Hàng',
                href: '/dashboard/sales/orders',
                icon: ShoppingCart,
                permissions: ['sales.order.view_list'],
            },
            {
                title: 'Danh Sách Khách Hàng',
                href: '/dashboard/customer_care/customers',
                icon: Users,
                permissions: ['cskh.customer.view_list'],
            },
            {
                title: 'Kiểm Giỏ Quà',
                href: '/dashboard/sales/xnt',
                icon: Import,
                permissions: ['sales.nxt.view'],
            },
            {
                title: 'Tỉ Lệ Quay Lại',
                href: '/dashboard/sales/return_rate',
                icon: TrendingUp,
                permissions: ['cskh.customer.return_rate'],
            },
        ],
    },
    {
        title: 'Giỏ Quà',
        children: [
            {
                title: 'Tổng Quan Giỏ Quà',
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
                title: 'Danh Sách Quy Đổi Mã',
                href: '/dashboard/gift_basket/baskets',
                icon: Library,
                permissions: ['gift.basket.view'],
            },
            {
                title: 'Yêu Cầu Đổi Mã',
                href: '/dashboard/gift_basket/change_requests',
                icon: ArrowLeftRight,
                permissions: ['gift.change_request.view'],
            },
            {
                title: 'Duyệt Mã Cần Đổi',
                href: '/dashboard/gift_basket/code_mappings',
                icon: Checklist,
                permissions: ['gift.change_request.handle'],
            },
        ],
    },
  
    {
        title: 'Quản Trị Tổng Hợp',
        children: [
            {
                title: 'Quản Lý VPP',
                href: '/dashboard/administration/vpp',
                icon: Package,
                permissions: ['vpp.manage'],
            },
            {
                title: 'Tuyển Dụng',
                href: '/dashboard/administration/recruitment',
                icon: Briefcase,
                permissions: ['recruitment.view'],
            },
            {
                title: 'Danh Sách Nhân Viên',
                href: '/dashboard/administration/staff_list',
                icon: Users,
                permissions: ['staff.view_list'],
            },
            {
                title: 'Lịch Sử Thao Tác',
                href: '/dashboard/administration/history',
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
                title: 'Đề Nghị Cấp Phát VPP',
                href: '/dashboard/links/vpp-request',
                icon: ClipboardList,
            },
            {
                title: 'Tổng Hợp Link',
                href: '/dashboard/links',
                icon: Link2,
            },
        ],
    },
    {
        title: 'Nội Bộ',
        children: [
            {
                title: 'Quản Lý Tin Nội Bộ',
                href: '/dashboard/news',
                icon: CampaignRounded,
                permissions: ['news.create'],
            },
        ],
    },
    {
        title: 'Thông Tin Cá Nhân',
        children: [
            {
                title: 'Thông Tin Cá Nhân',
                href: '/dashboard/profile',
                icon: User,
            },
        ],
    },
];
