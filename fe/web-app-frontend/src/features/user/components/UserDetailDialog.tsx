'use client';

import { useEffect, useState } from 'react';
import { userApi } from '../api/user.api';
import { Box, Dialog, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow, Typography, IconButton, Grid, Paper, Divider, alpha, TableContainer } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { sidebarMenu } from '../../../components/layout/sidebar-menu';
import toast from 'react-hot-toast';

function UserDetailDialog({ open, userId, onClose }: any) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !userId) {
            setUser(null);
            setLoading(false);
            return;
        }

        const fetchUser = async () => {
            try {
                setLoading(true);

                const res = await userApi.getUserById(userId);
                setUser(res.content);
            } catch (error: any) {
                console.error(error);
                toast.error(error?.response?.data?.Message ?? 'Không tải được thông tin nhân sự');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [open, userId]);

    const formatDate = (value?: string | null) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{
            paper: {
                sx: {
                    borderRadius: '14px',
                },
            },
        }}>
            <DialogTitle sx={{ fontWeight: 800, color: '#086839', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                Chi tiết nhân sự
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <Divider />
            <LoadingOverlay open={loading} text="Đang tải thông tin nhân sự..." />
            <DialogContent sx={{ p: 3 }}>
                {user && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Khu vực thông tin chi tiết cá nhân */}
                        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography sx={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Mã nhân viên</Typography>
                                    <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{user.staffCode}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography sx={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Họ và tên</Typography>
                                    <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{user.name}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography sx={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Ngày sinh</Typography>
                                    <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{formatDate(user.dayOfBirth)}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography sx={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Địa chỉ Email</Typography>
                                    <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>{user.email || '-'}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography sx={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Số điện thoại</Typography>
                                    <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>{user.phone || '-'}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography sx={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Chi nhánh trực thuộc</Typography>
                                    <Typography sx={{ fontWeight: 600, color: '#086839' }}>{user.branchesName || '-'}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography sx={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Vai trò</Typography>
                                    <Typography sx={{ fontWeight: 600, color: '#086839' }}>{user.roles?.length ? user.roles.map((item: any) => item.name).join(', ') : '-'}</Typography>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Khu vực lịch sử Import */}
                        <Box>
                            <Typography sx={{ fontWeight: 800, color: '#086839', mb: 1.5, fontSize: '1.05rem', display: 'flex', alignItems: 'center' }}>
                                Lịch sử import tập tin
                            </Typography>

                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Tên tập tin</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#16a34a' }} align="center">Thành công</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#dc2626' }} align="center">Lỗi</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Ngày xử lý</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {user.importHistories?.map((item: any) => (
                                            <TableRow key={item.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <TableCell sx={{ fontWeight: 500, color: '#334155' }}>{item.fileName}</TableCell>
                                                <TableCell sx={{ color: '#16a34a', fontWeight: 700 }} align="center">{item.successCount}</TableCell>
                                                <TableCell sx={{ color: '#dc2626', fontWeight: 700 }} align="center">{item.errorCount}</TableCell>
                                                <TableCell sx={{ color: '#64748b' }}>{formatDate(item.importDate)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {!user.importHistories?.length && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#64748b', fontStyle: 'italic' }}>
                                                    Chưa có lịch sử dữ liệu nhập.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default UserDetailDialog;