'use client';

import { Box, Button, Typography } from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useRouter } from 'next/navigation';

export default function ForbiddenPage() {
    const router = useRouter();

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#fafafa',
            px: 2,
        }}>
            {/* Big faint number */}
            <Typography sx={{
                fontSize: { xs: 140, md: 200 },
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.06em',
                color: '#fee2e2',
                userSelect: 'none',
                mb: -4,
            }}>
                403
            </Typography>

            {/* Card */}
            <Box sx={{
                bgcolor: '#fff',
                border: '1px solid #fecaca',
                borderRadius: 3,
                px: { xs: 4, md: 6 },
                py: 5,
                maxWidth: 440,
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 4px 24px rgba(220,38,38,0.06)',
                position: 'relative',
                zIndex: 1,
                overflow: 'hidden',
            }}>
                {/* Top accent line */}
                <Box sx={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 4,
                    bgcolor: '#dc2626',
                    borderRadius: '12px 12px 0 0',
                }} />

                {/* Icon */}
                <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 64, height: 64,
                    bgcolor: '#fef2f2',
                    borderRadius: '50%',
                    mb: 2.5,
                    mt: 1,
                }}>
                    <LockOutlinedIcon sx={{ fontSize: 32, color: '#dc2626' }} />
                </Box>

                <Typography sx={{ fontSize: { xs: 20, md: 22 }, fontWeight: 700, color: '#0f172a', mb: 1 }}>
                    Bạn không có quyền vào đây
                </Typography>

                <Typography sx={{ fontSize: 14, color: '#64748b', lineHeight: 1.8, mb: 1.5 }}>
                    Tài khoản của bạn chưa được cấp quyền truy cập tính năng này.
                </Typography>

                <Typography sx={{
                    display: 'inline-block',
                    fontSize: 13,
                    color: '#b91c1c',
                    bgcolor: '#fef2f2',
                    px: 2, py: 0.8,
                    borderRadius: '8px',
                    mb: 4,
                    fontWeight: 500,
                }}>
                    Liên hệ quản trị viên nếu bạn cần được cấp quyền
                </Typography>

                <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        startIcon={<HomeRoundedIcon />}
                        onClick={() => router.push('/home')}
                        sx={{
                            bgcolor: '#086839',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: 13.5,
                            px: 3,
                            borderRadius: 2,
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#065c30', boxShadow: 'none' },
                        }}
                    >
                        Về trang chủ
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackRoundedIcon />}
                        onClick={() => router.back()}
                        sx={{
                            borderColor: '#cbd5e1',
                            color: '#475569',
                            fontWeight: 600,
                            fontSize: 13.5,
                            px: 3,
                            borderRadius: 2,
                            '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                        }}
                    >
                        Quay lại
                    </Button>
                </Box>
            </Box>

            <Typography sx={{ mt: 3, fontSize: 12, color: '#fca5a5' }}>
                Mã lỗi: 403 · PhuHoa Fresh Internal
            </Typography>
        </Box>
    );
}
