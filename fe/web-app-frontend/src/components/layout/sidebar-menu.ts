import {
    LayoutDashboard,
    ShoppingCart,
    Users,
} from 'lucide-react';

export const sidebarMenu = [
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
        ],
    },
    {
        title: 'Thông tin cá nhân',
        children: [
            {
                title: 'Thông tin cá nhân',
                href: '/dashboard/profile',
                icon: Users,
            },
        ],

    }
];