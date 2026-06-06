'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
    Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { authApi } from '@/features/auth/api/auth.api';

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function ActivityLogDialog({ open, onClose }: Props) {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [loading, setLoading] = useState(false);

    const formatDateTime = (value?: string | null) => {
        if (!value) return '-';

        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(0);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchLogs = async () => {
        try {
            setLoading(true);

            const response = await authApi.getActivityLogs({
                page: page + 1,
                pageSize,
                search: debouncedSearch || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
            });

            setLogs(response.content.items);
            setTotal(response.content.totalItems);
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ??
                error?.response?.data?.Message ??
                'Không tải được lịch sử thao tác'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        fetchLogs();
    }, [open, page, pageSize, debouncedSearch, fromDate, toDate]);

    const handleResetFilter = () => {
        setSearch('');
        setDebouncedSearch('');
        setFromDate('');
        setToDate('');
        setPage(0);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle
                sx={{
                    fontWeight: 800,
                    color: '#086839',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                Lịch sử thao tác hệ thống

                <IconButton onClick={onClose} size="small">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ position: 'relative' }}>
                <LoadingOverlay open={loading} text="Đang tải lịch sử thao tác..." />

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            md: '2fr 1fr 1fr auto',
                        },
                        gap: 1.5,
                        mb: 2,
                    }}
                >
                    <TextField
                        size="small"
                        label="Tìm kiếm"
                        placeholder="Tên, mã NV, hành động, bảng..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />

                    <TextField
                        size="small"
                        type="date"
                        label="Từ ngày"
                        value={fromDate}
                        onChange={(e) => {
                            setFromDate(e.target.value);
                            setPage(0);
                        }}
                        slotProps={{
                            inputLabel: {
                                shrink: true,
                            },
                        }}
                    />

                    <TextField
                        size="small"
                        type="date"
                        label="Đến ngày"
                        value={toDate}
                        onChange={(e) => {
                            setToDate(e.target.value);
                            setPage(0);
                        }}
                        slotProps={{
                            inputLabel: {
                                shrink: true,
                            },
                        }}
                    />

                    <Button
                        variant="outlined"
                        onClick={handleResetFilter}
                        sx={{
                            borderColor: '#086839',
                            color: '#086839',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Xóa lọc
                    </Button>
                </Box>

                <Box
                    sx={{
                        overflow: 'auto',
                        border: '1px solid #e2e8f0',
                        borderRadius: 2,
                        maxHeight: 520,
                    }}
                >
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>
                                    Nhân sự
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>
                                    Hành động
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>
                                    Bảng
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>
                                    Record ID
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>
                                    IP
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>
                                    Thời gian
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {logs.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 700 }}>
                                            {item.name || '-'}
                                        </Typography>
                                        <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                                            {item.staffCode || `User ID: ${item.userId}`}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Chip
                                            label={item.action || '-'}
                                            size="small"
                                            sx={{
                                                bgcolor: '#ecfdf5',
                                                color: '#086839',
                                                fontWeight: 700,
                                            }}
                                        />
                                    </TableCell>

                                    <TableCell>{item.tableName || '-'}</TableCell>
                                    <TableCell>{item.recordId ?? '-'}</TableCell>
                                    <TableCell>{item.ipAddress || '-'}</TableCell>
                                    <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                                </TableRow>
                            ))}

                            {!logs.length && !loading && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#64748b' }}>
                                        Chưa có lịch sử thao tác
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Box>

                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={pageSize}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(0);
                    }}
                    labelRowsPerPage="Dòng:"
                />
            </DialogContent>
        </Dialog>
    );
}