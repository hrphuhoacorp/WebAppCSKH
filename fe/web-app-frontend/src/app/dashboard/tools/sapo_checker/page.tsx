'use client';

import { Box, Skeleton } from '@mui/material';
import { useState } from 'react';

export default function SapoCheckerPage() {
    const [loading, setLoading] = useState(true);

    return (
        <Box sx={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)' }}>
            {loading && (
                <Box sx={{ p: 2 }}>
                    <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                    <Skeleton sx={{ mt: 2 }} height={44} />
                    <Skeleton sx={{ mt: 1 }} height={44} />
                    <Skeleton sx={{ mt: 1 }} height={44} />
                </Box>
            )}
            <iframe
                src="/tools/sapo-product-checker.html"
                title="Kiểm tra mã hàng Sapo"
                width="100%"
                height="100%"
                style={{ border: 'none', display: loading ? 'none' : 'block' }}
                onLoad={() => setLoading(false)}
            />
        </Box>
    );
}
