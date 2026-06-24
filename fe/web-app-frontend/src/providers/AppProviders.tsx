'use client';

import { CssBaseline, ThemeProvider } from '@mui/material';

import { Toaster } from 'react-hot-toast';
import { theme } from '../theme/theme';
import { AuthProvider } from './AuthProviders';
import QueryProvider from './QueryProvider';

export default function AppProviders({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <QueryProvider>
            <AuthProvider>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    {children}
                    <Toaster position="top-right" />
                </ThemeProvider>
            </AuthProvider>
        </QueryProvider>
    );
}