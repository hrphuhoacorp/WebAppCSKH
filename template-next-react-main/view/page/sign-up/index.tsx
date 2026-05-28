import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import { styled } from '@mui/material/styles';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import { FacebookIcon, GoogleIcon } from '../login/custom-icon';
import CustomTextField from 'src/components/text-field';
import { registerAuth } from 'src/services/auth';
import toast from 'react-hot-toast';

// --- STYLED COMPONENTS ---
const Card = styled(MuiCard)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    width: '100%',
    padding: theme.spacing(4),
    gap: theme.spacing(3),
    margin: 'auto',
    borderRadius: '24px',
    boxShadow: '0px 10px 40px -10px rgba(0,0,0,0.08)',
    border: '1px solid #f3f4f6',
    [theme.breakpoints.up('sm')]: {
        width: '600px',
    },
    ...theme.applyStyles('dark', {
        boxShadow: 'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
        border: '1px solid hsla(220, 25%, 20%, 0.5)',
    }),
}));

const SignUpContainer = styled(Stack)(({ theme }) => ({
    minHeight: '100vh',
    width: '100%',
    padding: theme.spacing(2),
    justifyContent: 'center',
    alignItems: 'center',
    '&::before': {
        content: '""',
        display: 'block',
        position: 'absolute',
        zIndex: -1,
        inset: 0,
        backgroundImage: 'radial-gradient(ellipse at 50% 50%, hsl(226, 100%, 97%), hsl(0, 0%, 100%))',
        backgroundRepeat: 'no-repeat',
        ...theme.applyStyles('dark', {
            backgroundImage: 'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
        }),
    },
}));

// --- TYPES & SCHEMA ---
type FormData = {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    homeBranchId: string;
    address: {
        province: string;
        district: string;
        ward: string;
        detail: string;
    };
};

const schema = yup.object({
    fullName: yup.string().trim().required('Vui lòng nhập họ và tên'),
    email: yup.string().trim().email('Email không hợp lệ').required('Vui lòng nhập email'),
    password: yup.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').required('Vui lòng nhập mật khẩu'),
    phone: yup.string().matches(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, 'Số điện thoại không hợp lệ').required('Vui lòng nhập số điện thoại'),
    dateOfBirth: yup.string().required('Vui lòng chọn ngày sinh'),
    gender: yup.string().required('Vui lòng chọn giới tính'),
    homeBranchId: yup.string().required('Vui lòng chọn chi nhánh'),
    address: yup.object({
        province: yup.string().required('Bắt buộc nhập'),
        district: yup.string().required('Bắt buộc nhập'),
        ward: yup.string().required('Bắt buộc nhập'),
        detail: yup.string().required('Vui lòng nhập địa chỉ cụ thể'),
    })
}).required();

// Data mẫu cho Dropdown
const GENDER_OPTIONS = [
    { value: 'Male', label: 'Nam' },
    { value: 'Female', label: 'Nữ' },
    { value: 'Other', label: 'Khác' },
];

const BRANCH_OPTIONS = [
    { value: '73497884-b247-4ed8-8eb0-2855b4473cc9', label: 'Chi nhánh Hồ Chí Minh' },
];

export default function SignUpPage() {
    const {
        handleSubmit,
        register,
        formState: { errors, isSubmitting }
    } = useForm<FormData>({
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            phone: '',
            dateOfBirth: '',
            gender: '',
            homeBranchId: '',
            address: {
                province: '',
                district: '',
                ward: '',
                detail: ''
            }
        },
        mode: 'onTouched',
        resolver: yupResolver(schema)
    });

    const onSubmit = async (data: FormData) => {
        // Xử lý dữ liệu trước khi gửi cho API
        try {

            const payload = {
                ...data,
                // Chuyển ngày sinh từ format YYYY-MM-DD sang ISO string
                dateOfBirth: new Date(data.dateOfBirth).toISOString(),
                // Tự động gộp chuỗi address.full
                address: {
                    ...data.address,
                    full: `${data.address.detail}, ${data.address.ward}, ${data.address.district}, ${data.address.province}`
                }
            };

            console.log('Payload gửi API:', payload);
            const response = await registerAuth(payload);

            // 3. Nếu thành công (API trả về HTTP Status 200/201)
            if (response.status === 200 || response.message === "Success") {
                toast.success("Đăng ký tài khoản thành công! Vui lòng đăng nhập.");

                // Đợi một chút để người dùng đọc Toast rồi mới chuyển trang
                setTimeout(() => {
                    // router.push('/login');
                }, 1500);
            }
            else {
                toast.error(response.message || "Đăng ký thất bại. Vui lòng thử lại!");
            }
        } catch (error: any) {
            console.error("Lỗi đăng ký:", error);

            const errorMsg =
                error.response?.data?.Message ||
                error.response?.data?.message ||
                "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin!";

            toast.error(errorMsg);
        }
    };

    return (
        <>
            <CssBaseline enableColorScheme />
            <SignUpContainer>
                <Card variant="elevation">
                    <Box sx={{ mb: 1, textAlign: 'center' }}>
                        <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#111827' }}>
                            Create an account
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#6b7280' }}>
                            Join us today! Please enter your details below.
                        </Typography>
                    </Box>

                    <Box
                        component="form"
                        onSubmit={handleSubmit(onSubmit)}
                        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
                    >
                        {/* Chia 2 cột bằng CSS Grid trên màn hình lớn */}
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 2.5
                        }}>
                            {/* THÔNG TIN CÁ NHÂN */}
                            <FormControl>
                                <CustomTextField
                                    label="Full Name"
                                    placeholder="Nguyễn Văn A"
                                    {...register('fullName')}
                                    error={!!errors.fullName}
                                    helperText={errors.fullName?.message}
                                />
                            </FormControl>

                            <FormControl>
                                <CustomTextField
                                    label="Phone Number"
                                    placeholder="0901234567"
                                    {...register('phone')}
                                    error={!!errors.phone}
                                    helperText={errors.phone?.message}
                                />
                            </FormControl>

                            <FormControl>
                                <CustomTextField
                                    label="Email address"
                                    type="email"
                                    placeholder="your@email.com"
                                    {...register('email')}
                                    error={!!errors.email}
                                    helperText={errors.email?.message}
                                />
                            </FormControl>

                            <FormControl>
                                <CustomTextField
                                    label="Password"
                                    type="password"
                                    placeholder="••••••••"
                                    {...register('password')}
                                    error={!!errors.password}
                                    helperText={errors.password?.message}
                                />
                            </FormControl>

                            <FormControl>
                                <CustomTextField
                                    label="Date of Birth"
                                    type="date"
                                    InputLabelProps={{ shrink: true }} // Bắt buộc shrink để hiển thị đúng input date
                                    {...register('dateOfBirth')}
                                    error={!!errors.dateOfBirth}
                                    helperText={errors.dateOfBirth?.message}
                                />
                            </FormControl>

                            <FormControl>
                                <CustomTextField
                                    select
                                    label="Gender"
                                    defaultValue=""
                                    inputProps={register('gender')}
                                    error={!!errors.gender}
                                    helperText={errors.gender?.message}
                                >
                                    <MenuItem value="" disabled>Chọn giới tính</MenuItem>
                                    {GENDER_OPTIONS.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </CustomTextField>
                            </FormControl>
                        </Box>

                        <Divider sx={{ my: 1 }}><Typography variant="caption" color="textSecondary">Address Info</Typography></Divider>

                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 2.5
                        }}>
                            <FormControl>
                                <CustomTextField
                                    label="Province / City"
                                    placeholder="Tỉnh/Thành phố"
                                    {...register('address.province')}
                                    error={!!errors.address?.province}
                                    helperText={errors.address?.province?.message}
                                />
                            </FormControl>

                            <FormControl>
                                <CustomTextField
                                    label="District"
                                    placeholder="Quận/Huyện"
                                    {...register('address.district')}
                                    error={!!errors.address?.district}
                                    helperText={errors.address?.district?.message}
                                />
                            </FormControl>

                            <FormControl>
                                <CustomTextField
                                    label="Ward"
                                    placeholder="Phường/Xã"
                                    {...register('address.ward')}
                                    error={!!errors.address?.ward}
                                    helperText={errors.address?.ward?.message}
                                />
                            </FormControl>

                            <FormControl>
                                <CustomTextField
                                    label="Street Detail"
                                    placeholder="Số nhà, Tên đường..."
                                    {...register('address.detail')}
                                    error={!!errors.address?.detail}
                                    helperText={errors.address?.detail?.message}
                                />
                            </FormControl>
                        </Box>

                        <Divider sx={{ my: 1 }}><Typography variant="caption" color="textSecondary">Branch Info</Typography></Divider>

                        <FormControl>
                            <CustomTextField
                                select
                                label="Home Branch"
                                defaultValue=""
                                inputProps={register('homeBranchId')}
                                error={!!errors.homeBranchId}
                                helperText={errors.homeBranchId?.message}
                            >
                                <MenuItem value="" disabled>Chọn chi nhánh</MenuItem>
                                {BRANCH_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </CustomTextField>
                        </FormControl>

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={isSubmitting}
                            sx={{
                                py: 1.5,
                                mt: 2,
                                fontSize: '1rem',
                                fontWeight: 600,
                                borderRadius: '12px',
                                textTransform: 'none',
                                backgroundColor: '#4f46e5',
                                boxShadow: '0px 4px 14px 0px rgba(79, 70, 229, 0.35)',
                                '&:hover': {
                                    backgroundColor: '#4338ca',
                                    boxShadow: '0px 6px 20px 0px rgba(79, 70, 229, 0.4)',
                                },
                            }}
                        >
                            {isSubmitting ? 'Creating account...' : 'Sign up'}
                        </Button>
                    </Box>

                    <Box sx={{ textAlign: 'center', mt: 1 }}>
                        <Typography sx={{ color: '#4b5563', fontSize: '0.95rem' }}>
                            Already have an account?{' '}
                            <Link href="/login" sx={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                Sign in
                            </Link>
                        </Typography>
                    </Box>
                </Card>
            </SignUpContainer>
        </>
    );
}