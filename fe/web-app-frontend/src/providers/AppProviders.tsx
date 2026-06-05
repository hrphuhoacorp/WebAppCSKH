'use client';

import { CssBaseline, ThemeProvider } from '@mui/material';

import { Toaster } from 'react-hot-toast';
import { theme } from '../theme/theme';
import { AuthProvider } from './AuthProviders';

export default function AppProviders({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthProvider>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
                <Toaster position="top-right" />
            </ThemeProvider>
        </AuthProvider>
    );
}