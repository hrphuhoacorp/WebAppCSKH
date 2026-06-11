'use client';

import { Box, Button, Typography } from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import { useRouter } from 'next/navigation';

export default function NotFound() {
    const router = useRouter();

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f8fafc',
            px: 2,
            gap: 0,
        }}>
            {/* Big faint number */}
            <Typography sx={{
                fontSize: { xs: 140, md: 200 },
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.06em',
                color: '#e2e8f0',
                userSelect: 'none',
                mb: -4,
            }}>
                404
            </Typography>

            {/* Card */}
            <Box sx={{
                bgcolor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 3,
                px: { xs: 4, md: 6 },
                py: 5,
                maxWidth: 440,
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Icon */}
                <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 64, height: 64,
                    bgcolor: '#f0fdf4',
                    borderRadius: '50%',
                    mb: 2.5,
                }}>
                    <SearchOffRoundedIcon sx={{ fontSize: 32, color: '#086839' }} />
                </Box>

                <Typography sx={{ fontSize: { xs: 20, md: 22 }, fontWeight: 700, color: '#0f172a', mb: 1 }}>
                    Trang này đi đâu mất rồi?
                </Typography>

                <Typography sx={{ fontSize: 14, color: '#64748b', lineHeight: 1.8, mb: 3.5 }}>
                    Chúng tôi đã tìm khắp hệ thống nhưng không thấy trang bạn cần.
                    Có thể đường dẫn bị sai hoặc trang đã được chuyển đi nơi khác.
                </Typography>

                {/* Hint chips */}
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mb: 4 }}>
                    {['Đường dẫn không đúng', 'Trang đã bị xóa', 'Chưa bao giờ tồn tại'].map(hint => (
                        <Box key={hint} sx={{
                            px: 1.5, py: 0.5,
                            bgcolor: '#f1f5f9',
                            borderRadius: '6px',
                            fontSize: 12,
                            color: '#64748b',
                        }}>
                            {hint}
                        </Box>
                    ))}
                </Box>

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

            <Typography sx={{ mt: 3, fontSize: 12, color: '#cbd5e1' }}>
                Mã lỗi: 404 · PhuHoa Fresh Internal
            </Typography>
        </Box>
    );
}
