'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ordersApi } from '@/features/orders/api/orders.api';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import toast from 'react-hot-toast';

type Props = {
    open: boolean;
    orderId: number | null;
    onClose: () => void;
};


export default function OrderDetailDialog({ open, orderId, onClose }: Props) {
    const [order, setOrder] = useState<OrderSchema | null>(null);
    const [loading, setLoading] = useState(false);

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(value ?? 0);

    const getStatusColor = (statusName: string) => {
        switch (statusName?.toLowerCase()) {
            case 'hoàn thành':
                return '#2e7d32';

            case 'đang giao dịch':
                return '#ed6c02';

            case 'chờ xác nhận':
                return '#0288d1';

            case 'đã hủy':
                return '#d32f2f';

            case 'đang xử lý':
                return '#5c5e05';

            default:
                return '#503636';
        }
    };


    const formatDate = (value: string) =>
        new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(new Date(value));

    useEffect(() => {
        if (!open || !orderId) return;

        const fetchOrderDetail = async () => {
            try {
                setLoading(true);

                const response = await ordersApi.getOrderById(orderId);

                setOrder(response.content);
            } catch (error: any) {
                toast.error(
                    error?.response?.data.Message ??
                    'Không lấy được chi tiết đơn hàng'
                );
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetail();
    }, [open, orderId]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle
                sx={{
                    fontWeight: 800,
                    color: '#086839',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                Chi tiết đơn hàng

                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ position: 'relative', minHeight: 260 }}>
                <LoadingOverlay open={loading} text="Đang tải chi tiết đơn hàng..." />

                {order && (
                    <Box>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    md: 'repeat(3, 1fr)',
                                },
                                gap: 2,
                                mb: 2,
                            }}
                        >
                            <Typography variant="body2">
                                Mã đơn:{' '}
                                <Box component="span" sx={{ fontWeight: 700, color: '#086839' }}>
                                    {order.orderCode}
                                </Box>
                            </Typography>

                            <Typography variant="body2">
                                Ngày mua:{' '}
                                <Box component="span" sx={{ fontWeight: 700, color: '#086839' }}>
                                    {formatDate(order.purchaseDate)}
                                </Box>
                            </Typography>

                            <Typography variant="body2">
                                Khách hàng:{' '}
                                <Box component="span" sx={{ fontWeight: 700, color: '#086839' }}>
                                    {order.customerName}
                                </Box>
                            </Typography>

                            <Typography variant="body2">
                                SĐT:{' '}
                                <Box component="span" sx={{ fontWeight: 700 }}>
                                    {order.customerPhone}
                                </Box>
                            </Typography>

                            <Typography variant="body2">
                                Chi nhánh:{' '}
                                <Box component="span" sx={{ fontWeight: 700 }}>
                                    {order.branchName}
                                </Box>
                            </Typography>

                            <Typography variant="body2">
                                Trạng thái:{' '}
                                <Chip
                                    label={order.statusName || '-'}
                                    size="small"
                                    sx={{
                                        bgcolor: `${getStatusColor(order.statusName)}20`,
                                        color: getStatusColor(order.statusName),
                                        fontWeight: 700,
                                        border: `1px solid ${getStatusColor(order.statusName)}40`,
                                    }}
                                />
                            </Typography>

                            <Typography variant="body2">
                                Doanh thu:{' '}
                                <Box component="span" sx={{ fontWeight: 700 }}>
                                    {formatMoney(order.revenue)}
                                </Box>
                            </Typography>

                            <Typography variant="body2">
                                Phí ship:{' '}
                                <Box component="span" sx={{ fontWeight: 700 }}>
                                    {formatMoney(order.shippingFee)}
                                </Box>
                            </Typography>

                            <Typography variant="body2">
                                Thuế:{' '}
                                <Box component="span" sx={{ fontWeight: 700 }}>
                                    {formatMoney(order.taxAmount)}
                                </Box>
                            </Typography>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography
                            sx={{
                                mb: 1.5,
                                color: '#086839',
                                fontWeight: 800,
                            }}
                        >
                            SẢN PHẨM & DỊCH VỤ
                        </Typography>

                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8faf9' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Sản phẩm</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Phân loại</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>
                                        Đơn giá
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Số lượng</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>
                                        ĐVT
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>
                                        Dịch vụ đi kèm
                                    </TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {order.items?.length ? (
                                    order.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell sx={{ fontWeight: 500 }}>
                                                {item.productName}
                                            </TableCell>
                                            <TableCell><code style={{ color: '#d32f2f' }}>{item.sku}</code></TableCell>
                                            <TableCell>{item.category}</TableCell>
                                            <TableCell>
                                                {formatMoney(item.unitPrice)}
                                            </TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{item.unit}</TableCell>
                                            <TableCell>{item.serviceName}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            Đơn hàng chưa có sản phẩm
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}