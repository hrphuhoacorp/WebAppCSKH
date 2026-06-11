import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    /** @deprecated kept for backward compatibility — ignored */
    gradient?: string;
    /** @deprecated kept for backward compatibility — ignored */
    shadowColor?: string;
}

export default function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
    return (
        <Box sx={{ mb: 2.5 }}>
            {/* Hero banner */}
            <Box
                sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '18px',
                    px: { xs: 2.5, md: 3.5 },
                    py: { xs: 2, md: 2.5 },
                    mb: actions ? 1.5 : 0,
                    background: 'linear-gradient(135deg, #065f2d 0%, #086839 55%, #4a9e2f 100%)',
                    boxShadow: '0 18px 45px rgba(8,104,57,0.20)',
                    // decorative circle (like GAS .hero:after)
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        right: -60,
                        top: -90,
                        width: 280,
                        height: 280,
                        borderRadius: '50%',
                        background: 'rgba(255,194,14,0.16)',
                        pointerEvents: 'none',
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
                    {icon && (
                        <Box
                            sx={{
                                width: 46,
                                height: 46,
                                borderRadius: '13px',
                                background: 'rgba(255,255,255,0.14)',
                                backdropFilter: 'blur(6px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                '& svg': { fontSize: 24, color: '#fff' },
                            }}
                        >
                            {icon}
                        </Box>
                    )}
                    <Box>
                        <Typography
                            sx={{
                                fontWeight: 900,
                                fontSize: { xs: 20, md: 26 },
                                color: '#fff',
                                lineHeight: 1.2,
                                letterSpacing: '-0.3px',
                            }}
                        >
                            {title}
                        </Typography>
                        <Typography
                            sx={{
                                color: 'rgba(255,255,255,0.88)',
                                fontSize: { xs: 13, md: 14 },
                                mt: 0.4,
                                fontWeight: 700,
                                lineHeight: 1.4,
                            }}
                        >
                            {subtitle}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Actions bar rendered below the banner */}
            {actions && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                    }}
                >
                    {actions}
                </Box>
            )}
        </Box>
    );
}
