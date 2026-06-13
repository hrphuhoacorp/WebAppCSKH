'use client';

import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useAuth } from '@/providers/AuthProviders';
import { authApi } from '@/features/auth/api/auth.api';
import toast from 'react-hot-toast';
import { TYPE_LABEL } from '../news.shared';

const NAV_ITEMS = [
    { key: 'all', label: 'Tất cả' },
    ...Object.entries(TYPE_LABEL).map(([key, info]) => ({ key, label: info.label })),
];

// ─── Header ───────────────────────────────────────────────────
export function SiteHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { profile } = useAuth();

    const activeCat = searchParams.get('category') ?? 'all';
    const isHome = pathname === '/home';

    // Auto-hide on scroll down, show on scroll up
    const [hidden, setHidden] = useState(false);
    const lastY = useRef(0);
    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            if (y > lastY.current && y > 90) setHidden(true);
            else setHidden(false);
            lastY.current = y;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleLogout = async () => {
        try {
            const res = await authApi.logout();
            toast.success(res.message);
            router.replace('/login');
        } catch {
            toast.error('Đăng xuất thất bại');
        }
    };

    return (
        <Box
            component="header"
            sx={{
                position: 'sticky',
                top: 0,
                zIndex: 200,
                background: '#0d2b1e',
                boxShadow: hidden ? 'none' : '0 2px 20px rgba(0,0,0,0.25)',
                transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
                transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s',
                height: { xs: 52, md: 58 },
                display: 'flex',
                alignItems: 'stretch',
            }}
        >
            {/* ── Logo ── */}
            <Box
                onClick={() => router.push('/home')}
                sx={{
                    pl: { xs: 2.5, md: 4, lg: 6 },
                    pr: { xs: 2, md: 2.5 },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    cursor: 'pointer',
                    flexShrink: 0,
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <Image
                    src="/images/Logo/PHF_FALOGO2.png"
                    alt="PHF"
                    width={150}
                    height={30}
                    style={{ objectFit: 'contain' }}
                    priority
                />
            </Box>

            {/* ── Category nav (scrollable) ── */}
            <Box sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'stretch',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
            }}>
                {NAV_ITEMS.map(({ key, label }) => {
                    const active = isHome && key === activeCat;
                    return (
                        <Box
                            key={key}
                            onClick={() => router.push(key === 'all' ? '/home' : `/home?category=${key}`)}
                            sx={{
                                px: { xs: 1.6, md: 2 },
                                display: 'flex',
                                alignItems: 'center',
                                flexShrink: 0,
                                cursor: 'pointer',
                                position: 'relative',
                                fontSize: { xs: 13, md: 13.5 },
                                fontWeight: active ? 700 : 400,
                                color: active ? '#fff' : 'rgba(255,255,255,0.42)',
                                transition: 'color 0.15s',
                                '&:hover': { color: 'rgba(255,255,255,0.85)' },
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    bgcolor: '#4ade80',
                                    transform: active ? 'scaleX(1)' : 'scaleX(0)',
                                    transformOrigin: 'left center',
                                    transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
                                },
                            }}
                        >
                            {label}
                        </Box>
                    );
                })}

                {/* Divider */}
                <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.1)', my: 1.2, mx: 1, flexShrink: 0 }} />

                {/* Vận Hành button — nằm trong thanh category */}
                <Box
                    onClick={() => router.push('/dashboard')}
                    sx={{
                        px: { xs: 1.8, md: 2.2 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.9,
                        flexShrink: 0,
                        cursor: 'pointer',
                        position: 'relative',
                        fontSize: { xs: 13, md: 13.5 },
                        fontWeight: 600,
                        color: '#4ade80',
                        transition: 'color 0.15s',
                        '&:hover': { color: '#86efac' },
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '2px',
                            bgcolor: '#4ade80',
                            transform: 'scaleX(0)',
                            transformOrigin: 'left center',
                            transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
                        },
                        '&:hover::after': { transform: 'scaleX(1)' },
                    }}
                >
                    <DashboardRoundedIcon sx={{ fontSize: 14 }} />
                    Vận Hành
                </Box>
            </Box>

            {/* ── Actions ── */}
            <Box sx={{
                px: { xs: 2, md: 2.5, lg: 4 },
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, md: 1.5 },
                flexShrink: 0,
                borderLeft: '1px solid rgba(255,255,255,0.07)',
            }}>
                {profile?.name && (
                    <Typography sx={{
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.5)',
                        display: { xs: 'none', lg: 'block' },
                        mr: 0.5,
                    }}>
                        <Box component="b" sx={{ color: '#4ade80', fontWeight: 700 }}>{profile.name}</Box>
                    </Typography>
                )}

                <Tooltip title="Đăng xuất">
                    <IconButton
                        onClick={handleLogout}
                        size="small"
                        sx={{
                            color: 'rgba(255,255,255,0.38)',
                            borderRadius: '7px',
                            width: 32, height: 32,
                            '&:hover': { color: '#fca5a5', bgcolor: 'rgba(248,113,113,0.1)' },
                        }}
                    >
                        <LogoutRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
}

// ─── Footer ───────────────────────────────────────────────────
export function SiteFooter() {
    const router = useRouter();
    const year = new Date().getFullYear();

    return (
        <Box component="footer" sx={{ background: '#071a10', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <Box sx={{
                px: { xs: 2.5, md: 5, lg: 8 },
                pt: { xs: 5, md: 7 },
                pb: { xs: 4, md: 6 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.6fr 1fr 1fr 1.3fr' },
                gap: { xs: 4, md: 6 },
            }}>
                {/* Brand */}
                <Box>
                    <Image src="/images/Logo/PHF_FALOGO2.png" alt="PHF" width={160} height={36} style={{ objectFit: 'contain', opacity: 0.82 }} />
                    <Typography sx={{ mt: 2.5, fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.9, maxWidth: 230 }}>
                        Kênh thông tin nội bộ chính thức của PhuHoa Fresh — cập nhật tin tức, thông báo và sự kiện toàn công ty.
                    </Typography>
                </Box>

                {/* Danh mục */}
                <Box>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: '#4ade80', mb: 2.5 }}>
                        Danh mục tin
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.6 }}>
                        {Object.entries(TYPE_LABEL).map(([key, info]) => (
                            <Box key={key} onClick={() => router.push(`/home?category=${key}`)}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1.2, fontSize: 13, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'color 0.15s', '&:hover': { color: info.color }, '&:hover .dot': { bgcolor: info.color } }}>
                                <Box className="dot" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', flexShrink: 0, transition: 'background-color 0.15s' }} />
                                {info.label}
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Liên kết */}
                <Box>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: '#4ade80', mb: 2.5 }}>
                        Liên kết nhanh
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.6 }}>
                        {[
                            { label: 'Trang chủ', href: '/home' },
                            { label: 'Dashboard', href: '/dashboard' },
                            { label: 'Hồ sơ cá nhân', href: '/dashboard/profile' },
                        ].map(({ label, href }) => (
                            <Box key={href} onClick={() => router.push(href)}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 13, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'color 0.15s', '&:hover': { color: 'rgba(255,255,255,0.8)' }, '&:hover .arr': { transform: 'translateX(3px)', color: '#4ade80' } }}>
                                <Box className="arr" sx={{ fontSize: 13, transition: 'all 0.15s', color: 'rgba(255,255,255,0.18)' }}>›</Box>
                                {label}
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Liên hệ */}
                <Box>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: '#4ade80', mb: 2.5 }}>
                        Liên hệ
                    </Typography>
                    {[
                        { icon: '🏢', text: 'Phòng Quản Trị Tổng Hợp' },
                        { icon: '✉️', text: 'hr.phuhoacorp@gmail.com' },
                        { icon: '📍', text: '342 Phú Lợi, Phường Phú Lợi, TP. HCM' },
                        { icon: '🕐', text: 'T2 – T7  ·  08:00 – 17:00' },
                    ].map(({ icon, text }) => (
                        <Box key={text} sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'flex-start' }}>
                            <Typography sx={{ fontSize: 13.5, lineHeight: 1.7, flexShrink: 0 }}>{icon}</Typography>
                            <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.32)', lineHeight: 1.75 }}>{text}</Typography>
                        </Box>
                    ))}
                </Box>
            </Box>

            <Box sx={{ mx: { xs: 2.5, md: 5, lg: 8 }, height: 1, bgcolor: 'rgba(255,255,255,0.05)' }} />

            <Box sx={{ px: { xs: 2.5, md: 5, lg: 8 }, py: 2.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.16)' }}>
                    © {year} PhuHoa Fresh · Thông Tin Nội Bộ
                </Typography>
             
            </Box>
        </Box>
    );
}
