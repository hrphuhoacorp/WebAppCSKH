'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { sidebarMenu } from './sidebar-menu';
import { Box, Collapse, List, ListItemButton, ListItemText, Typography, Drawer, IconButton } from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import { ChevronDown, LogOut, Menu as MenuIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { authApi } from '@/features/auth/api/auth.api';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { useAuth } from '@/providers/AuthProviders';

export default function Sidebar() {
    const pathname = usePathname();                                                                                                             
    const router = useRouter();
    const { profile } = useAuth();

    // State quản lý việc đóng/mở các nhóm menu cha
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    // State quản lý trạng thái đóng/mở menu Mobile Hamburger
    const [mobileOpen, setMobileOpen] = useState(false);

    // Tự động kích hoạt mở Group cha có chứa đường dẫn con đang Active
    useEffect(() => {
        sidebarMenu.forEach((group) => {
            const hasActiveChild = group.children.some((item) => pathname === item.href);
            if (hasActiveChild) {
                setOpenGroups((prev) => ({ ...prev, [group.title]: true }));
            }
        });
    }, [pathname]);

    const toggleGroup = (title: string) => {
        setOpenGroups((prev) => ({
            ...prev,
            [title]: !prev[title],
        }));
    };

    const handleLogout = async () => {
        try {
            const response = await authApi.logout();
            toast.success(response.Message ?? 'Đăng xuất thành công');
            localStorage.removeItem('isLoggedIn');
            router.replace('/login');
        } catch (error: any) {
            toast.error(error?.response?.data?.Message ?? 'Đăng xuất thất bại');
        }
    };

    const userRoles = profile?.roles.map(role => role.name) ?? [];

    const filteredSidebarMenu = sidebarMenu.map((group) => ({
        ...group,
        children: group.children.filter((item) => {
            if (!item.roles || item.roles.length === 0) return true;
            return item.roles.some(role => userRoles.includes(role));
        }),

    })).filter((group) => group.children.length > 0);

    // Nội dung Sidebar được bóc tách riêng để tái sử dụng cho cả giao diện Desktop và Mobile
    const renderSidebarContent = () => (
        <Box
            sx={{
                width: 260,
                background: 'linear-gradient(160deg, #0d2b1e 0%, #0b1f17 60%, #091a12 100%)',
                color: '#fff',
                height: '100vh',
                p: '20px 12px',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                overflowY: 'auto', // Đảm bảo menu dài không bị khuất trên màn hình nhỏ
                position: 'relative',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -80, left: -80,
                    width: 220, height: 220,
                    background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
                    pointerEvents: 'none',
                },
            }}
        >
            {/* Logo */}
            <Box sx={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', gap: 1.5, px: 1, pb: 2, mb: 2, borderBottom: '1px solid rgba(255,255,255,0.07)'
            }}>
                <Image src="/images/Logo/PHF_FALOGO2.png" alt="Logo" width={180} height={43} priority />

                <Typography
                    variant="h2"
                    sx={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.7)',
                        px: 1.5,
                        mb: 1.5,
                        lineHeight: 1.4,
                        marginTop: 2,
                        textAlign: 'center',
                    }}
                >
                    Xin chào, <b>{profile?.name}</b>
                </Typography>
            </Box>

            {/* Menu List */}
            <Box sx={{ flex: 1 }}>
                {filteredSidebarMenu.map((group) => {
                    const isOpen = !!openGroups[group.title];
                    const isSingleChild = group.children.length === 1;

                    // TRƯỜNG HỢP 1: Nhóm chỉ có DUY NHẤT 1 phần tử con -> Hiển thị trực tiếp cấp 1, không xổ Dropdown
                    if (isSingleChild) {
                        const singleItem = group.children[0];
                        const Icon = singleItem.icon;
                        const selected = pathname === singleItem.href;

                        return (
                            <ListItemButton
                                key={singleItem.href}
                                component={singleItem.isExternal ? 'a' : Link}
                                href={singleItem.href}
                                target={singleItem.isExternal ? '_blank' : undefined}
                                rel={singleItem.isExternal ? 'noopener noreferrer' : undefined}
                                selected={selected}
                                onClick={() => setMobileOpen(false)}
                                sx={{
                                    borderRadius: 2.2,
                                    py: '10px',
                                    px: 1.5,
                                    mb: 0.5,
                                    color: selected ? '#4ade80' : 'rgba(255,255,255,0.7)',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    position: 'relative',
                                    transition: 'all 0.18s ease',
                                    border: selected ? '1px solid rgba(74,222,128,0.15)' : '1px solid transparent',
                                    '&.Mui-selected': {
                                        background: 'linear-gradient(90deg, rgba(34,197,94,0.18), rgba(34,197,94,0.06))',
                                        color: '#4ade80', // Giữ màu chữ active ổn định
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: 0, top: '20%', bottom: '20%',
                                            width: 3,
                                            background: '#22c55e',
                                            borderRadius: '0 3px 3px 0',
                                            boxShadow: '0 0 8px rgba(34,197,94,0.6)',
                                        },
                                    },
                                    '&:hover': {
                                        background: 'rgba(255,255,255,0.07)',
                                        color: 'rgba(255,255,255,0.85)',
                                        transform: 'translateX(2px)',
                                    },
                                }}
                            >
                                <Icon size={16} style={{ flexShrink: 0, marginRight: 10, opacity: selected ? 1 : 0.6 }} />
                                <ListItemText
                                    primary={singleItem.title}
                                    slotProps={{ primary: { style: { fontSize: 13, fontWeight: 500 } } }}
                                />
                            </ListItemButton>
                        );
                    }

                    // TRƯỜNG HỢP 2: Nhóm có TỪ 2 phần tử con trở lên -> Giữ nguyên cấu trúc Accordion xổ xuống
                    return (
                        <Box key={group.title} sx={{ mb: 0.5 }}>
                            {/* Group Header Button */}
                            <ListItemButton
                                onClick={() => toggleGroup(group.title)}
                                sx={{
                                    borderRadius: 2.5,
                                    py: '9px',
                                    px: 1.5,
                                    color: isOpen ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    letterSpacing: '0.8px',
                                    textTransform: 'uppercase',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        background: 'rgba(255,255,255,0.06)',
                                        color: 'rgba(255,255,255,0.9)',
                                    },
                                }}
                            >
                                <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(74,222,128,0.5)', mr: 1, flexShrink: 0 }} />
                                <ListItemText
                                    primary={group.title}
                                    slotProps={{ primary: { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.8px' } } }}
                                />
                                <ChevronDown
                                    size={15}
                                    style={{
                                        opacity: 0.5,
                                        transition: 'transform 0.25s ease',
                                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        flexShrink: 0,
                                    }}
                                />
                            </ListItemButton>

                            {/* Group Sub-Items */}
                            <Collapse in={isOpen} timeout={280}>
                                <List disablePadding>
                                    {group.children.map((item) => {
                                        const Icon = item.icon;
                                        const selected = pathname === item.href;

                                        return (
                                            <ListItemButton
                                                key={item.href}
                                                component={item.isExternal ? 'a' : Link}
                                                href={item.href}
                                                target={item.isExternal ? '_blank' : undefined}
                                                rel={item.isExternal ? 'noopener noreferrer' : undefined}
                                                selected={selected}
                                                onClick={() => setMobileOpen(false)}
                                                sx={{
                                                    pl: 2.5,
                                                    py: '8px',
                                                    borderRadius: 2.2,
                                                    my: '1px',
                                                    color: selected ? '#4ade80' : 'rgba(255,255,255,0.45)',
                                                    fontSize: 13,
                                                    fontWeight: 500,
                                                    position: 'relative',
                                                    transition: 'all 0.18s ease',
                                                    border: selected ? '1px solid rgba(74,222,128,0.15)' : '1px solid transparent',
                                                    '&.Mui-selected': {
                                                        background: 'linear-gradient(90deg, rgba(34,197,94,0.18), rgba(34,197,94,0.06))',
                                                        color: '#4ade80',
                                                        '&::before': {
                                                            content: '""',
                                                            position: 'absolute',
                                                            left: 0, top: '20%', bottom: '20%',
                                                            width: 3,
                                                            background: '#22c55e',
                                                            borderRadius: '0 3px 3px 0',
                                                            boxShadow: '0 0 8px rgba(34,197,94,0.6)',
                                                        },
                                                    },
                                                    '&:hover': {
                                                        background: 'rgba(255,255,255,0.07)',
                                                        color: 'rgba(255,255,255,0.85)',
                                                        transform: 'translateX(2px)',
                                                    },
                                                }}
                                            >
                                                <Icon size={15} style={{ flexShrink: 0, marginRight: 10, opacity: selected ? 1 : 0.6 }} />
                                                <ListItemText
                                                    primary={item.title}
                                                    slotProps={{ primary: { style: { fontSize: 13, fontWeight: 500 } } }}
                                                />
                                            </ListItemButton>
                                        );
                                    })}
                                </List>
                            </Collapse>
                        </Box>
                    );
                })}
            </Box>

            {/* Footer */}
            <Box sx={{ pt: 2, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <ListItemButton
                    component={Link}
                    href="/home"
                    onClick={() => setMobileOpen(false)}
                    sx={{
                        borderRadius: 2.2,
                        py: '9px',
                        px: 1.5,
                        mb: 0.5,
                        color: 'rgba(255,255,255,0.7)',
                        transition: 'all 0.18s ease',
                        '&:hover': {
                            background: 'rgba(34,197,94,0.12)',
                            color: '#4ade80',
                        },
                    }}
                >
                    <HomeRoundedIcon sx={{ fontSize: 18, flexShrink: 0, mr: '10px', opacity: 0.7 }} />
                    <ListItemText
                        primary="Trang chủ"
                        slotProps={{ primary: { style: { fontSize: 13, fontWeight: 500 } } }}
                    />
                </ListItemButton>
                <ListItemButton
                    onClick={handleLogout}
                    sx={{
                        borderRadius: 2.2,
                        py: '9px',
                        px: 1.5,
                        color: 'rgba(255,255,255,0.45)',
                        transition: 'all 0.18s ease',
                        '&:hover': {
                            background: 'rgba(239,68,68,0.12)',
                            color: '#f87171',
                        },
                    }}
                >
                    <LogOut size={15} style={{ flexShrink: 0, marginRight: 10 }} />
                    <ListItemText
                        primary="Đăng xuất"
                        slotProps={{ primary: { style: { fontSize: 13, fontWeight: 500 } } }}
                    />
                </ListItemButton>
            </Box>
        </Box>
    );

    return (
        <>
            {/* NÚT HAMBURGER MOBILE: Chỉ hiển thị trên màn hình nhỏ (xs, sm, md bứt phá từ lg trở xuống) */}
            <Box
                sx={{
                    display: { xs: 'block', lg: 'none' },
                    position: 'fixed',
                    top: 12,
                    left: 12,
                    zIndex: 1100,
                }}
            >
                <IconButton
                    onClick={() => setMobileOpen(!mobileOpen)}
                    sx={{
                        bgcolor: '#0d2b1e',
                        color: '#fff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                        '&:hover': { bgcolor: '#0b1f17' },
                    }}
                >
                    <MenuIcon size={20} />
                </IconButton>
            </Box>

            {/* DI ĐỘNG (MOBILE DRAWER): Menu vuốt trượt từ cạnh trái màn hình */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }} // Tối ưu hiệu năng render trên thiết bị di động
                sx={{
                    display: { xs: 'block', lg: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 260, border: 'none' },
                }}
            >
                {renderSidebarContent()}
            </Drawer>

            {/* MÁY TÍNH (DESKTOP SIDEBAR): Hiển thị cố định từ màn hình kích thước lớn (lg) trở lên */}
            <Box
                component="aside"
                sx={{
                    display: { xs: 'none', lg: 'block' },
                    width: 260,
                    flexShrink: 0,
                    position: 'sticky',
                    top: 0,
                    height: '100vh',
                }}
            >
                {renderSidebarContent()}
            </Box>
        </>
    );
}