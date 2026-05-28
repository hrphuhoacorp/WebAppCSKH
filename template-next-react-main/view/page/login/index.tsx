// import next
import { CssBaseline, Stack } from '@mui/material';
import { NextPage } from 'next';
import SignInCard from './sign-in-card';

type TProps = {}

const LoginPage: NextPage<TProps> = () => {
    return (
        <>
            <CssBaseline enableColorScheme />
            {/* <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem' }} /> */}
            <Stack
                direction="column"
                component="main"
                sx={[
                    {
                        justifyContent: 'center',
                        height: 'calc((1 - var(--template-frame-height, 0)) * 100%)',
                        marginTop: 'max(40px - var(--template-frame-height, 0px), 0px)',
                        minHeight: '100vh',
                        width: '100%',
                        m:0,
                        p:0,
                    },
                    (theme) => ({
                        '&::before': {
                            content: '""',
                            display: 'block',
                            position: 'absolute',
                            zIndex: -1,
                            inset: 0,
                            // Đổi gradient giống trang SignUp
                            backgroundImage: 'radial-gradient(ellipse at 50% 50%, hsl(226, 100%, 97%), hsl(0, 0%, 100%))',
                            backgroundRepeat: 'no-repeat',
                            ...theme.applyStyles('dark', {
                                backgroundImage: 'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
                            }),
                        },
                    }),
                ]}
            >
                <Stack
                    direction={{ xs: 'column-reverse', md: 'row' }}
                    sx={{
                        justifyContent: 'center',
                        gap: { xs: 6, sm: 12 },
                        p: 2,
                        mx: 'auto',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column-reverse', md: 'row' }}
                        sx={{
                            justifyContent: 'center',
                            gap: { xs: 6, md: 10 },
                            p: { xs: 2, sm: 4 },
                            m: 'auto',
                        }}
                    >
                        <SignInCard />
                    </Stack>
                </Stack>
            </Stack>
        </>
    )
}

export default LoginPage;