"use client"
import LoginForm from '@/features/auth/components/LoginForm';
import { CssBaseline, Stack } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
    const router = useRouter();
    useEffect(() => {
        const token = localStorage.getItem('token');

        if (token) {
            router.replace('/dashboard');
        }
    }, [router]);
    return (
        <>
            <CssBaseline enableColorScheme />

            <Stack
                component="main"
                sx={{
                    justifyContent: 'center',
                    minHeight: '100vh',
                    position: 'relative',

                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        zIndex: -1,
                        backgroundImage:
                            'radial-gradient(circle at center, #e8fff2 0%, #ffffff 70%)',
                    },
                }}
            >
                <LoginForm />
            </Stack>
        </>
    );
}