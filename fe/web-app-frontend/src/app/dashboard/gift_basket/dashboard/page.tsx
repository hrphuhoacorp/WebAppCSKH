'use client';

import { Box, CircularProgress, Skeleton } from '@mui/material';
import { useState } from 'react';

export default function ExternalPage() {
    const [loading, setLoading] = useState(true);

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                height: 'calc(100vh - 64px)',
            }}
        >
            {loading && (
                <Box sx={{ p: 2 }}>
                    <Skeleton variant="rectangular" height={80} />
                    <Skeleton sx={{ mt: 2 }} height={40} />
                    <Skeleton sx={{ mt: 1 }} height={40} />
                    <Skeleton sx={{ mt: 1 }} height={40} />
                </Box>
            )}

            <iframe
                src="https://script.google.com/macros/s/AKfycbwwM108CGav4cTp0Att6OGYQ9p-4gYlnGLf4v-lfuXxnqh2QmzNB0pJs8SHJx6P56g9/exec"
                title="External Website"
                width="100%"
                height="100%"
                style={{
                    border: 'none',
                    visibility: loading ? 'hidden' : 'visible',
                }}
                onLoad={() => setLoading(false)}
            />
        </Box>
    );
}