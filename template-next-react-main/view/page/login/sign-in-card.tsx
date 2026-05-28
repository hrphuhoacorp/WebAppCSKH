import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MuiCard from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

// Nhớ import đúng đường dẫn component của bạn
import CustomTextField from 'src/components/text-field';
import ForgotPassword from './forgot-password';
import { FacebookIcon, GoogleIcon } from './custom-icon';

// Import hook auth để gọi hàm login
import { useAuth } from 'src/hooks/useAuth';
import { CircularProgress } from '@mui/material';
import FallbackSpinner from 'src/components/fall-back';
import toast from 'react-hot-toast';
import { t } from 'i18next';
import Image from 'next/image';
import { log } from 'console';

const Card = styled(MuiCard)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    width: '100%',
    padding: theme.spacing(5),
    gap: theme.spacing(3),
    borderRadius: '24px',
    boxShadow: '0px 10px 40px -10px rgba(0,0,0,0.08)',
    border: '1px solid #f3f4f6',
    [theme.breakpoints.up('sm')]: {
        width: '450px',
    },
}));

type FormData = {
    email: string;
    password: string;
};

// Đưa schema ra ngoài để tối ưu hiệu năng
const schema = yup.object({
    email: yup
        .string()
        .trim()
        .required('Vui lòng nhập email của bạn.')
        .email('Email không đúng định dạng. VD: name@domain.com'),
    password: yup
        .string()
        .trim()
        .required('Vui lòng nhập mật khẩu.')
        .min(6, 'Mật khẩu phải có ít nhất 6 ký tự.')
        .max(50, 'Mật khẩu không được vượt quá 50 ký tự.'),
}).required();

export default function SignInCard() {
    const [open, setOpen] = React.useState(false);

    const {
        handleSubmit,
        register,
        formState: { errors, isSubmitting }
    } = useForm<FormData>({
        defaultValues: {
            email: '',
            password: ''
        },
        mode: 'onTouched', // Báo lỗi chính xác khi người dùng blur hoặc thay đổi dữ liệu
        resolver: yupResolver(schema)
    });

    const { login } = useAuth();
    const onSubmit = async (data: FormData) => {
        const result: any = await login({ ...data, rememberMe: true });
        console.log('Login result:', result);
        // Nếu success = true
        if (result?.success) {
            toast.success(result?.data?.message);
        }
        else {
            toast.error(result?.message );
        }
    };

    return (

        <Card>
            <Box sx={{ textAlign: 'center' }}>

                <Image
                    src="/images/Logo/PHF_FALOGO.png"
                    alt="PHF Logo"
                    width={195}
                    height={50}
                />
               
            </Box>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {/* EMAIL */}
                <FormControl fullWidth margin="normal">
                    <CustomTextField
                        label="Email address"
                        type="email"
                        placeholder="your@email.com"
                        {...register('email')}
                        error={!!errors.email}
                        helperText={errors.email?.message}
                    
                    />
                </FormControl>

                {/* PASSWORD */}
                <FormControl fullWidth margin="normal">
                    <CustomTextField
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        {...register('password')}
                        error={!!errors.password}
                        helperText={errors.password?.message}
                    />
                </FormControl>

                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                    <FormControlLabel
                        control={<Checkbox sx={{ color: '#1b8f57', '&.Mui-checked': { color: '#1b8f57' } }} />}
                        label={<Typography variant="body2" sx={{ color: '#4b5563' }}>Remember me</Typography>}
                    />
                    <Link
                        component="button"
                        type="button" // type="button" để tránh việc bấm vào lại tự động Submit form
                        onClick={() => setOpen(true)}
                        sx={{ fontWeight: 600, color: '#1b8f57', textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, fontSize: '0.875rem' }}
                    >
                        Forgot password?
                    </Link>
                </Box>

                <ForgotPassword open={open} handleClose={() => setOpen(false)} />

                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isSubmitting} // Khóa nút khi đang gửi API
                    sx={{
                        mt: 3,
                        py: 1.5,
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 600,
                        backgroundColor: '#1b8f57',
                        boxShadow: '0px 4px 14px 0px rgba(79, 70, 229, 0.35)',
                        '&:hover': { backgroundColor: '#0e4837' }
                    }}
                >
                    {isSubmitting ? (
                        <CircularProgress size={24} color="inherit" /> // Dùng icon loading nhỏ gọn
                    ) : (
                        'Sign in'
                    )}
                </Button>
            </form>


            {/* <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Typography sx={{ textAlign: 'center', mt: 2, color: '#4b5563', fontSize: '0.95rem' }}> Don&apos;t have an account?{' '} <Link href="/sign-up" sx={{ fontWeight: 600, color: '#1b8f57', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }} > Sign up </Link> </Typography>
            </Box> */}
        </Card>
    );
}