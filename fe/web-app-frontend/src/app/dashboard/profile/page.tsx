'use client';

import { useEffect, useState } from 'react';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import PageHeader from '@/components/common/PageHeader';
import { AccountCircleRounded } from '@mui/icons-material';
import { authApi } from '@/features/auth/api/auth.api';
import toast from 'react-hot-toast';
import ChangePasswordDialog from '@/features/user/components/ChangePasswordDialog';

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const formatDate = (value?: string | null) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(new Date(value));
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const response = await authApi.getProfile();
                setProfile(response.content);
            } catch (error: any) {
                toast.error(
                    error?.response?.data?.message ?? 'Không tải được thông tin cá nhân'
                );
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (!profile) {
        return <LoadingOverlay open={loading} fullScreen text="Đang tải thông tin cá nhân..." />;
    }

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                bgcolor: '#f0f7f3',
                height: { xs: 'calc(100vh - 56px)', lg: '100vh' },
                overflow: 'auto',
                backgroundImage: `
                    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(8,104,57,0.08) 0%, transparent 70%)
                `,
            }}
        >
            <LoadingOverlay open={loading} fullScreen text="Đang tải thông tin cá nhân..." />

            <PageHeader
                title="Thông Tin Cá Nhân"
                subtitle="Xem và quản lý thông tin tài khoản của bạn"
                icon={<AccountCircleRounded />}
                gradient="linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)"
                shadowColor="rgba(15,118,110,0.28)"
            />

            {/* Hero Card */}
            <Card
                sx={{
                    borderRadius: '20px',
                    border: 'none',
                    mb: 3,
                    background: 'linear-gradient(135deg, #086839 0%, #0a8a4a 50%, #05522d 100%)',
                    boxShadow: '0 8px 32px rgba(8,104,57,0.25)',
                    overflow: 'visible',
                    position: 'relative',
                }}
            >
                {/* Decorative circles */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -30,
                        right: 40,
                        width: 120,
                        height: 120,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.05)',
                        pointerEvents: 'none',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -20,
                        right: 120,
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.04)',
                        pointerEvents: 'none',
                    }}
                />

                <CardContent sx={{ p: { xs: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Box sx={{ position: 'relative' }}>
                            <Avatar
                                sx={{
                                    width: 96,
                                    height: 96,
                                    bgcolor: 'rgba(255,255,255,0.15)',
                                    border: '3px solid rgba(255,255,255,0.4)',
                                    fontSize: 38,
                                    fontWeight: 800,
                                    color: '#fff',
                                    backdropFilter: 'blur(10px)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                }}
                            >
                                {profile.name?.charAt(0)}
                            </Avatar>
                            {/* Online dot */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 4,
                                    right: 4,
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    bgcolor: '#4ade80',
                                    border: '2px solid #086839',
                                }}
                            />
                        </Box>

                        <Box sx={{ flex: 1 }}>
                            <Typography
                                variant="h5"
                                sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', mb: 0.5 }}
                            >
                                {profile.name}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', mb: 1.5, fontSize: 14 }}>
                                {profile.staffCode} &nbsp;•&nbsp; {profile.branchesName}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {profile.roles?.map((role: any) => (
                                    <Chip
                                        key={role.id}
                                        label={role.name}
                                        size="small"
                                        sx={{
                                            bgcolor: 'rgba(255,255,255,0.15)',
                                            color: '#fff',
                                            fontWeight: 700,
                                            border: '1px solid rgba(255,255,255,0.25)',
                                            backdropFilter: 'blur(6px)',
                                            fontSize: 12,
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>

                        <Button
                            variant="contained"
                            onClick={() => setChangePasswordOpen(true)}
                            sx={{
                                bgcolor: '#fff',
                                color: '#086839',
                                fontWeight: 700,
                                borderRadius: '12px',
                                px: 3,
                                py: 1.2,
                                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                                '&:hover': {
                                    bgcolor: '#f0fdf4',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                },
                                textTransform: 'none',
                                fontSize: 14,
                            }}
                        >
                            🔐 Đổi mật khẩu
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* Info Cards */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 3,
                    mb: 3,
                }}
            >
                <InfoCard title="Thông tin cơ bản" icon="🪪">
                    <InfoRow label="Mã nhân viên" value={profile.staffCode} />
                    <InfoRow label="Họ tên" value={profile.name} />
                    <InfoRow label="Email" value={profile.email} />
                    <InfoRow label="Số điện thoại" value={profile.phone} />
                    <InfoRow label="Ngày sinh" value={formatDate(profile.dayOfBirth)} />
                </InfoCard>

                <InfoCard title="Thông tin hệ thống" icon="⚙️">
                    <InfoRow label="Chi nhánh" value={profile.branchesName} />
                    <InfoRow
                        label="Vai trò"
                        value={profile.roles?.map((x: any) => x.name).join(', ') || '-'}
                    />
                    <InfoRow label="Ngày tạo" value={formatDate(profile.createdAt)} />
                    <InfoRow label="Cập nhật gần nhất" value={formatDate(profile.updatedAt)} />
                </InfoCard>
            </Box>

            {/* Import History Table */}
            <Paper
                sx={{
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 2px 16px rgba(8,104,57,0.06)',
                    bgcolor: '#fff',
                }}
            >
                {/* Table Header */}
                <Box
                    sx={{
                        p: 2.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        borderBottom: '1px solid #f1f5f9',
                        background: 'linear-gradient(90deg, #f0fdf4 0%, #fff 100%)',
                    }}
                >
                    <Box
                        sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '10px',
                            bgcolor: '#dcfce7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                        }}
                    >
                        📂
                    </Box>
                    <Typography sx={{ fontWeight: 800, color: '#086839', fontSize: 16 }}>
                        Lịch sử nhập file
                    </Typography>
                </Box>

                {/* Scrollable table wrapper with max height */}
                <Box
                    sx={{
                        maxHeight: 380,
                        overflowY: 'auto',
                        overflowX: 'auto',
                        '&::-webkit-scrollbar': { width: 6, height: 6 },
                        '&::-webkit-scrollbar-track': { bgcolor: '#f8fafc' },
                        '&::-webkit-scrollbar-thumb': {
                            bgcolor: '#cbd5e1',
                            borderRadius: 3,
                            '&:hover': { bgcolor: '#94a3b8' },
                        },
                    }}
                >
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                        bgcolor: '#f8fafc',
                                        color: '#475569',
                                        fontSize: 13,
                                        borderBottom: '2px solid #e2e8f0',
                                        py: 1.5,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Tên file
                                </TableCell>
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                        bgcolor: '#f8fafc',
                                        color: '#475569',
                                        fontSize: 13,
                                        borderBottom: '2px solid #e2e8f0',
                                        py: 1.5,
                                        whiteSpace: 'nowrap',
                                    }}
                                    align="right"
                                >
                                    Thành công
                                </TableCell>
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                        bgcolor: '#f8fafc',
                                        color: '#475569',
                                        fontSize: 13,
                                        borderBottom: '2px solid #e2e8f0',
                                        py: 1.5,
                                        whiteSpace: 'nowrap',
                                    }}
                                    align="right"
                                >
                                    Lỗi
                                </TableCell>
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                        bgcolor: '#f8fafc',
                                        color: '#475569',
                                        fontSize: 13,
                                        borderBottom: '2px solid #e2e8f0',
                                        py: 1.5,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Ngày nhập
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {profile.importHistories?.length ? (
                                profile.importHistories.map((item: any, index: number) => (
                                    <TableRow
                                        key={item.id}
                                        sx={{
                                            bgcolor: index % 2 === 0 ? '#fff' : '#fafcfb',
                                            '&:hover': { bgcolor: '#f0fdf4' },
                                            transition: 'background-color 0.15s',
                                        }}
                                    >
                                        <TableCell
                                            sx={{
                                                fontWeight: 600,
                                                color: '#1e293b',
                                                fontSize: 13,
                                                maxWidth: 260,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        display: 'inline-flex',
                                                        width: 26,
                                                        height: 26,
                                                        borderRadius: '6px',
                                                        bgcolor: '#f0fdf4',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 13,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    📄
                                                </Box>
                                                {item.fileName || '-'}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Chip
                                                label={item.successCount}
                                                size="small"
                                                sx={{
                                                    bgcolor: '#dcfce7',
                                                    color: '#15803d',
                                                    fontWeight: 700,
                                                    fontSize: 12,
                                                    border: 'none',
                                                    minWidth: 44,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Chip
                                                label={item.errorCount}
                                                size="small"
                                                sx={{
                                                    bgcolor: item.errorCount > 0 ? '#fee2e2' : '#f1f5f9',
                                                    color: item.errorCount > 0 ? '#dc2626' : '#94a3b8',
                                                    fontWeight: 700,
                                                    fontSize: 12,
                                                    border: 'none',
                                                    minWidth: 44,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell
                                            sx={{ color: '#64748b', fontSize: 13, whiteSpace: 'nowrap' }}
                                        >
                                            {formatDate(item.importDate)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        align="center"
                                        sx={{ py: 6, color: '#94a3b8' }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}
                                        >
                                            <Typography sx={{ fontSize: 32 }}>📭</Typography>
                                            <Typography
                                                sx={{
                                                    fontWeight: 600,
                                                    color: '#94a3b8',
                                                    fontSize: 14,
                                                }}
                                            >
                                                Chưa có lịch sử nhập file
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Box>
            </Paper>
            <ChangePasswordDialog
                
                open={changePasswordOpen}
                onClose={() => setChangePasswordOpen(false)}
            />
        </Box>
    );
}

function InfoCard({
    title,
    icon,
    children,
}: {
    title: string;
    icon?: string;
    children: React.ReactNode;
}) {
    return (
        <Card
            sx={{
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 16px rgba(8,104,57,0.06)',
                bgcolor: '#fff',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                    boxShadow: '0 4px 24px rgba(8,104,57,0.1)',
                },
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    {icon && (
                        <Box
                            sx={{
                                width: 34,
                                height: 34,
                                borderRadius: '10px',
                                bgcolor: '#dcfce7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 16,
                            }}
                        >
                            {icon}
                        </Box>
                    )}
                    <Typography sx={{ fontWeight: 800, color: '#086839', fontSize: 16 }}>
                        {title}
                    </Typography>
                </Box>
                <Divider sx={{ mb: 0.5, borderColor: '#f1f5f9' }} />
                {children}
            </CardContent>
        </Card>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
                py: 1.25,
                borderBottom: '1px dashed #f1f5f9',
                '&:last-child': { borderBottom: 'none' },
            }}
        >
            <Typography sx={{ color: '#94a3b8', fontWeight: 500, fontSize: 13, flexShrink: 0 }}>
                {label}
            </Typography>
            <Typography
                sx={{
                    fontWeight: 700,
                    textAlign: 'right',
                    fontSize: 13,
                    color: '#1e293b',
                    maxWidth: '60%',
                    wordBreak: 'break-word',
                }}
            >
                {value || '-'}
            </Typography>
        </Box>
    );
}