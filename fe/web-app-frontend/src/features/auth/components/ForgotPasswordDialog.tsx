'use client';

import { useState } from 'react';
import {
    Box, Button, CircularProgress, Dialog, DialogContent,
    DialogTitle, IconButton, TextField, Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth.api';

const GREEN = '#086839';

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function ForgotPasswordDialog({ open, onClose }: Props) {
    const [step, setStep] = useState<'email' | 'otp' | 'done'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const handleClose = () => {
        onClose();
        setTimeout(() => { setStep('email'); setEmail(''); setOtp(''); }, 300);
    };

    const handleSendOtp = async () => {
        if (!email.trim()) return toast.error('Vui lòng nhập email');
        setLoading(true);
        try {
            await authApi.forgotPassword(email.trim().toLowerCase());
            toast.success('Mã OTP đã gửi về email của bạn');
            setStep('otp');
        } catch (err: any) {
            toast.error(err?.response?.data?.Message || 'Gửi OTP thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length < 6) return toast.error('Vui lòng nhập đủ 6 chữ số');
        setLoading(true);
        try {
            await authApi.resetPasswordByOtp(email, otp.trim());
            setStep('done');
        } catch (err: any) {
            toast.error(err?.response?.data?.Message || 'Mã OTP không đúng hoặc đã hết hạn');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3 } } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LockResetRoundedIcon sx={{ color: GREEN }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Quên mật khẩu</Typography>
                </Box>
                <IconButton size="small" onClick={handleClose}>
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
                {step === 'email' && (
                    <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 4 }}>
                            Nhập email tài khoản. Chúng tôi sẽ gửi mã OTP để xác thực.
                        </Typography>
                        <TextField
                            fullWidth
                            label="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                            slotProps={{ input: { startAdornment: <EmailOutlinedIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /> } }}
                            sx={{ mb: 2.5 }}
                        />
                        <Button fullWidth variant="contained" onClick={handleSendOtp} disabled={loading}
                            sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#0e4837' }, borderRadius: 2, py: 1.2 }}>
                            {loading ? <CircularProgress size={20} color="inherit" /> : 'Gửi mã OTP'}
                        </Button>
                    </Box>
                )}

                {step === 'otp' && (
                    <Box>
                        {/* Email badge */}
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1,
                            bgcolor: 'rgba(8,104,57,0.07)',
                            border: '1px solid rgba(8,104,57,0.18)',
                            borderRadius: 2, px: 1.5, py: 1, mb: 3,
                        }}>
                            <EmailOutlinedIcon sx={{ fontSize: 17, color: GREEN, flexShrink: 0 }} />
                            <Box>
                                <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3 }}>
                                    Mã OTP đã gửi đến
                                </Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: GREEN }}>
                                    {email}
                                </Typography>
                            </Box>
                        </Box>

                        {/* OTP Input */}
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center', mb: 1.5 }}>
                            Nhập mã 6 chữ số — hiệu lực trong 10 phút
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="0  0  0  0  0  0"
                            value={otp}
                            onChange={e => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val.length <= 6) setOtp(val);
                            }}
                            onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                            slotProps={{
                                htmlInput: {
                                    maxLength: 6,
                                    style: {
                                        letterSpacing: 14,
                                        fontSize: 30,
                                        fontWeight: 700,
                                        textAlign: 'center',
                                        paddingTop: 14,
                                        paddingBottom: 14,
                                        paddingLeft: 20,
                                    },
                                },
                            }}
                            sx={{
                                mb: 2.5,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2.5,
                                    '&.Mui-focused fieldset': { borderColor: GREEN, borderWidth: 2 },
                                },
                                '& input::placeholder': {
                                    color: 'rgba(0,0,0,0.18)',
                                    letterSpacing: 10,
                                    fontSize: 22,
                                },
                            }}
                        />

                        <Button
                            fullWidth variant="contained"
                            onClick={handleVerifyOtp}
                            disabled={loading || otp.length < 6}
                            sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#0e4837' }, borderRadius: 2, py: 1.2, mb: 1 }}
                        >
                            {loading ? <CircularProgress size={20} color="inherit" /> : 'Xác nhận'}
                        </Button>
                        <Button fullWidth variant="text" size="small"
                            onClick={() => { setStep('email'); setOtp(''); }}
                            sx={{ color: 'text.secondary', fontSize: 12 }}>
                            Đổi email / Gửi lại OTP
                        </Button>
                    </Box>
                )}

                {step === 'done' && (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                        <CheckCircleRoundedIcon sx={{ fontSize: 56, color: GREEN, mb: 1.5 }} />
                        <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1 }}>Thành công!</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 3 }}>
                            Mật khẩu mới đã được gửi về email <b>{email}</b>.<br />
                            Vui lòng kiểm tra hộp thư và đổi mật khẩu sau khi đăng nhập.
                        </Typography>
                        <Button fullWidth variant="contained" onClick={handleClose}
                            sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#0e4837' }, borderRadius: 2, py: 1.2 }}>
                            Đóng
                        </Button>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}
