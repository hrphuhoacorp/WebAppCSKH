import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    gradient?: string;
    shadowColor?: string;
    actions?: React.ReactNode;
}

export default function PageHeader({
    title,
    subtitle,
    icon,
    gradient = 'linear-gradient(135deg, #086839 0%, #16a34a 100%)',
    shadowColor = 'rgba(8,104,57,0.28)',
    actions,
}: PageHeaderProps) {
    return (
        <Box
            sx={{
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                    sx={{
                        width: 52,
                        height: 52,
                        borderRadius: '16px',
                        background: gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 6px 20px ${shadowColor}`,
                        flexShrink: 0,
                        '& svg': { fontSize: 28, color: '#fff' },
                    }}
                >
                    {icon}
                </Box>

                <Box>
                    <Typography
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: 20, md: 26 },
                            color: '#0f172a',
                            letterSpacing: '-0.5px',
                            lineHeight: 1.2,
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography
                        sx={{
                            color: '#64748b',
                            fontSize: 13.5,
                            mt: 0.4,
                            lineHeight: 1.4,
                        }}
                    >
                        {subtitle}
                    </Typography>
                </Box>
            </Box>

            {actions && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {actions}
                </Box>
            )}
        </Box>
    );
}
