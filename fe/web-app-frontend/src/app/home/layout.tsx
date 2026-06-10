'use client';

import Box from '@mui/material/Box';
import ProtectedRoute from '@/providers/ProtectedRoute';
import { SiteHeader, SiteFooter } from '@/features/news/components/SiteChrome';

export default function HomeLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute>
            <Box sx={{ minHeight: '100vh', bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
                <SiteHeader />
                <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {children}
                </Box>
                <SiteFooter />
            </Box>
        </ProtectedRoute>
    );
}
