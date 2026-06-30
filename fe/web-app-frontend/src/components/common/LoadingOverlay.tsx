'use client';

import { createPortal } from 'react-dom';
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

    if (fullScreen && typeof document !== 'undefined') {
        return createPortal(
            <div style={{
                position: 'fixed',
                top: 0, left: 0,
                width: '100vw', height: '100vh',
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 12,
            }}>
                <CircularProgress sx={{ color: '#086839' }} />
                <span style={{ color: '#086839', fontWeight: 600, fontSize: 14 }}>{text}</span>
            </div>,
            document.body,
        );
    }

    return (
        <Box sx={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(2px)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
        }}>
            <CircularProgress sx={{ color: '#086839' }} />
            <Typography sx={{ color: '#086839', fontWeight: 600, fontSize: 14 }}>{text}</Typography>
        </Box>
    );
}
