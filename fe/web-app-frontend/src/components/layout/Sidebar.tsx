'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { sidebarMenu } from './sidebar-menu';
import { Box, Collapse, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { ChevronDown, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { authApi } from '@/features/auth/api/auth.api';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function Sidebar() {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (title: string) => {
        setOpenGroups((prev) => ({
            ...prev,
            [title]: !prev[title],
        }));
    };
    const router = useRouter();
    //lấy profile để hiển thị tên người dùng ở sidebar
    const [profile, setProfile] = useState<{ name: string, email: string, roles: string, id: number, brandName: string } | null>(null);
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await authApi.getProfile();
                console.log(response);
                setProfile(response.content);
            } catch (error: any) {
                toast.error(error?.response?.data?.Message);
            }
        };

        fetchProfile();
    },[]);


    const handleLogout = async () => {
        try {
            const response = await authApi.logout();

            toast.success(response.message);

            router.replace('/login');
        } catch {
            toast.error('Đăng xuất thất bại');
        }
    };
    return (
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
                position: 'sticky',
                top: 0,
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
                alignItems: 'center', gap: 1.5, px: 1, pb: 2, mb: 2, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {/* <Box sx={{ width: 32, height: 32, borderRadius: 2, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, boxShadow: '0 0 16px rgba(34,197,94,0.35)' }}>
                    🌿
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>PHF CRM</Typography>
                    <Typography sx={{ fontSize: 9, color: '#4ade80', fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 }}>Dashboard</Typography>
                </Box> */}
                <Image src="/images/Logo/PHF_FALOGO2.png" alt="Logo" width={180}
                    height={43} />

                <Typography
                    variant="h1"
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

            {/* Menu */}
            {sidebarMenu.map((group) => {
                const isOpen = !!openGroups[group.title];

                return (
                    <Box key={group.title} sx={{ mb: 0.5 }}>
                        {/* Group header */}
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

                        {/* Children */}
                        <Collapse in={isOpen} timeout={280}>
                            <List disablePadding>
                                {group.children.map((item) => {
                                    const Icon = item.icon;
                                    const selected = pathname === item.href;

                                    return (
                                        <ListItemButton
                                            key={item.href}
                                            component={Link}
                                            href={item.href}
                                            selected={selected}
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
                                                '&.Mui-selected:hover': {
                                                    background: 'linear-gradient(90deg, rgba(34,197,94,0.22), rgba(34,197,94,0.08))',
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
            <Box sx={{ flex: 1 }} />

            {/* Footer / Logout */}
            <Box sx={{ pt: 2, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
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
                    <LogOut
                        size={15}
                        style={{ flexShrink: 0, marginRight: 10 }}
                    />
                    <ListItemText
                        primary="Đăng xuất"
                        slotProps={{ primary: { style: { fontSize: 13, fontWeight: 500 } } }}
                    />
                </ListItemButton>
            </Box>
        </Box>

    );
}