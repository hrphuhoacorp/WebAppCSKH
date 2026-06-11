import Sidebar from '@/components/layout/Sidebar';
import ProtectedRoute from '@/providers/ProtectedRoute';
import RouteGuard from '@/providers/RouteGuard';
import Box from '@mui/material/Box';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <RouteGuard>
                <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                    <Sidebar />

                    <Box
                        component="main"
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            overflowX: 'hidden',
                            pt: { xs: '56px', lg: 0 },
                        }}
                    >
                        {children}
                    </Box>
                </Box>
            </RouteGuard>
        </ProtectedRoute>
    );
}
