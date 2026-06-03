import { Box, CircularProgress, Typography } from '@mui/material';

type LoadingOverlayProps = {
    open: boolean;
    text?: string;
    fullScreen?: boolean;
};

export default function LoadingOverlay({
    open,
    text = 'Đang tải dữ liệu...',
    fullScreen = false,
}: LoadingOverlayProps) {
    if (!open) return null;

    return (
        <Box
            sx={{
                position: fullScreen ? 'fixed' : 'absolute',
                inset: 0,
                bgcolor: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(2px)',
                zIndex: fullScreen ? 9999 : 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
            }}
        >
            <CircularProgress sx={{ color: '#086839' }} />

            <Typography
                sx={{
                    color: '#086839',
                    fontWeight: 600,
                    fontSize: 14,
                }}
            >
                {text}
            </Typography>
        </Box>
    );
}

//