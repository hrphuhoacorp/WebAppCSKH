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
                src="https://script.google.com/macros/s/AKfycbyu5oP2SH7FablV3cDQVQrXTso6Pg7WZNgz3_FsXjOkZmAxggPqARJH9HqXU_xJ-ac7/exec"
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