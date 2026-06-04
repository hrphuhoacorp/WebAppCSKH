import { Box, CircularProgress, Typography } from '@mui/material';

export default function Loading() {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
            }}
        >
            <CircularProgress />
            <Typography>Đang tải dữ liệu...</Typography>
        </Box>
    );
}