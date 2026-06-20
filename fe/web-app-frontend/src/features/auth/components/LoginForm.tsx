'use client';

import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { Box, IconButton, InputAdornment, TextField } from '@mui/material';
import {
    Button,
    Card,
    CircularProgress,
    FormControl,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { LoginFormData, loginSchema } from '../schemas/login.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../api/auth.api';
import toast from 'react-hot-toast';
import { redirect, useRouter } from 'next/navigation';

export default function LoginForm() {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });
    const router = useRouter();
    const onSubmit = async (data: LoginFormData) => {
        try {
            const response = await authApi.login(data);

            toast.success(response.Message ?? 'Đăng nhập thành công');
            window.location.href = '/home';

        } catch (error: any) {
            toast.error(

                error?.response?.data?.Message ??
                'Sai tài khoản hoặc mật khẩu'
            );
        }
    };
    const [showPassword, setShowPassword] = useState(false);
    return (
        <Card
            sx={{
                width: 450,
                mx: 'auto',
                p: 5,
                borderRadius: 4,
            }}
        >
            <Box
                sx={{
                    textAlign: 'center',
                    mb: 4,
                }}
            >
                <Image
                    src="/images/Logo/PHF_FALOGO.png"
                    alt="Logo"
                    width={180}
                    height={43}
                />
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <TextField
                        label="Email"
                        placeholder="Nhập email"
                        error={!!errors.email}
                        helperText={errors.email?.message}
                        {...register('email')}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailOutlinedIcon />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                </FormControl>

                <FormControl fullWidth>
                    <TextField
                        type={showPassword ? 'text' : 'password'}
                        label="Mật khẩu"
                        placeholder="Nhập mật khẩu"
                        {...register('password')}
                        error={!!errors.password}
                        helperText={errors.password?.message as string}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlinedIcon />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            edge="end"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <VisibilityOffOutlinedIcon />
                                            ) : (
                                                <VisibilityOutlinedIcon />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                </FormControl>
                <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                        mt: 3,
                        bgcolor: '#086839',
                        '&:hover': {
                            bgcolor: '#0e4837',
                        },
                    }}
                >
                    {isSubmitting ? (
                        <CircularProgress size={24} color="inherit" />
                    ) : (
                        'Đăng nhập'
                    )}
                </Button>
            </form>
        </Card>
    );
}