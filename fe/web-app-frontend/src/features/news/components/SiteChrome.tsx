'use client';

import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useAuth } from '@/providers/AuthProviders';
import { authApi } from '@/features/auth/api/auth.api';
import toast from 'react-hot-toast';
import { TYPE_LABEL } from '../news.shared';

// ─── Header trang tin nội bộ ───────────────────────────────────
export function SiteHeader() {
    const router = useRouter();
    const { profile } = useAuth();

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
            component="header"
            sx={{
                position: 'sticky',
                top: 0,
                zIndex: 200,
                background: '#0d2b1e',
                boxShadow: '0 2px 12px rgba(8,104,57,0.18)',
                borderBottom: '1px solid rgba(74,222,128,0.08)',
            }}
        >
            <Box sx={{
                px: { xs: 2.5, md: 6, lg: 10 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: { xs: 58, md: 68 },
            }}>
                <Box
                    onClick={() => router.push('/home')}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.8, cursor: 'pointer' }}
                >
                    <Image
                        src="/images/Logo/PHF_FALOGO2.png"
                        alt="PHF"
                        width={130}
                        height={34}
                        style={{ objectFit: 'contain' }}
                        priority
                    />
                    <Box sx={{
                        width: '1px',
                        height: 22,
                        bgcolor: 'rgba(255,255,255,0.15)',
                        display: { xs: 'none', sm: 'block' },
                    }} />
                    <Typography sx={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: 2.5,
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.6)',
                        display: { xs: 'none', sm: 'block' },
                    }}>
                        BẢN TIN NỘI BỘ
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1.5 } }}>
                    <Typography sx={{
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.75)',
                        display: { xs: 'none', md: 'block' },
                        mr: 0.5,
                    }}>
                        Xin chào, <Box component="b" sx={{ color: '#4ade80' }}>{profile?.name}</Box>
                    </Typography>

                    <Button
                        startIcon={<DashboardRoundedIcon sx={{ fontSize: '17px !important' }} />}
                        onClick={() => router.push('/dashboard')}
                        sx={{
                            color: '#fff',
                            bgcolor: 'rgba(255,255,255,0.14)',
                            borderRadius: '999px',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: 13,
                            px: 2.2,
                            height: 36,
                            boxShadow: 'none',
                            border: '1px solid rgba(255,255,255,0.2)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                        }}
                    >
                        Dashboard
                    </Button>

                    <Tooltip title="Đăng xuất">
                        <IconButton
                            onClick={handleLogout}
                            size="small"
                            sx={{
                                color: 'rgba(255,255,255,0.55)',
                                '&:hover': { color: '#f87171', bgcolor: 'rgba(248,113,113,0.12)' },
                            }}
                        >
                            <LogoutRoundedIcon sx={{ fontSize: 19 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        </Box>
    );
}

// ─── Footer trang tin nội bộ ───────────────────────────────────
export function SiteFooter() {
    const router = useRouter();
    const year = new Date().getFullYear();

    return (
        <Box component="footer" sx={{ mt: 'auto', background: '#0d2b1e', borderTop: '1px solid rgba(74,222,128,0.08)' }}>
            <Box sx={{
                px: { xs: 2.5, md: 6, lg: 10 },
                py: { xs: 4, md: 6 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.2fr' }, // ← cân lại tỉ lệ
                gap: { xs: 4, md: 8 },
                alignItems: 'start',
            }}>
                {/* Brand */}
                <Box>
                    <Image src="/images/Logo/PHF_FALOGO2.png" alt="PHF" width={140} height={36}
                        style={{ objectFit: 'contain', opacity: 0.9 }} />
                    <Typography sx={{ mt: 2, fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8, maxWidth: 220 }}>
                        Kênh thông tin nội bộ chính thức — cập nhật tin tức, thông báo và sự kiện.
                    </Typography>
                </Box>

                {/* Danh mục */}
                <Box>
                    <Typography sx={{
                        fontSize: 10.5, fontWeight: 700, letterSpacing: 2.5,
                        textTransform: 'uppercase', color: '#4ade80', mb: 2.5,
                    }}>
                        Danh mục
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 1.2, columnGap: 2 }}>
                        {Object.entries(TYPE_LABEL).map(([key, info]) => (
                            <Typography
                                key={key}
                                onClick={() => router.push(`/home?category=${key}`)}
                                sx={{
                                    fontSize: 13,
                                    color: 'rgba(255,255,255,0.45)',
                                    cursor: 'pointer',
                                    transition: 'color 0.2s',
                                    '&:hover': { color: info.color },
                                }}
                            >
                                {info.label}
                            </Typography>
                        ))}
                    </Box>
                </Box>

                {/* Liên hệ */}
                <Box>
                    <Typography sx={{
                        fontSize: 10.5, fontWeight: 700, letterSpacing: 2.5,
                        textTransform: 'uppercase', color: '#4ade80', mb: 2.5,
                    }}>
                        Liên hệ
                    </Typography>
                    {[
                        { icon: '🏢', text: 'Phòng Quản Trị Tổng Hợp' },
                        { icon: '✉️', text: 'hr.phuhoacorp@gmail.com' },
                        { icon: '📍', text: '342 Phú Lợi, Phường Phú Lợi, TP Hồ Chí Minh' },
                    ].map(({ icon, text }) => (
                        <Box key={text} sx={{ display: 'flex', gap: 1.2, mb: 1.5, alignItems: 'flex-start' }}>
                            <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{icon}</Typography>
                            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                                {text}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Bottom bar */}
            <Box sx={{
                px: { xs: 2.5, md: 6, lg: 10 },
                py: 2,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
            }}>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
                    © {year} Phu Hoa Fresh. Tài liệu nội bộ — không phát tán ra ngoài.
                </Typography>
                <Typography sx={{
                    fontSize: 11, color: 'rgba(74,222,128,0.3)',
                    letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600,
                }}>
                    Bản tin nội bộ
                </Typography>
            </Box>
        </Box>
    );
}