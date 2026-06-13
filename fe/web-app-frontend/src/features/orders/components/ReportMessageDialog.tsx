'use client';

import {
    Dialog, DialogTitle, DialogContent, Typography, Box, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Chip, alpha, Button, TextField, MenuItem, Divider, Tooltip,
} from '@mui/material';
import { Close, MessageSharp, Add, Delete } from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    messageReportApi, MessageReportDTO, MessageReportFilter,
} from '@/features/orders/api/messageReport.api';

type Props = {
    open: boolean;
    onClose: () => void;
};

const TYPES = [
    { value: 'Zalo', label: 'Zalo', color: '#0068FF' },
    { value: 'Facebook', label: 'Facebook', color: '#4267B2' },
    { value: 'Khác', label: 'Khác', color: '#f59e0b' },
];

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];
const months = Array.from({ length: 12 }, (_, i) => i + 1);

export default function ReportMessageDialog({ open, onClose }: Props) {
    // ── filter state ──
    const [filterMonth, setFilterMonth] = useState<number | ''>(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState<number | ''>(currentYear);
    const [filterType, setFilterType] = useState('');

    // ── form state ──
    const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
    const [formType, setFormType] = useState('Zalo');
    const [formCount, setFormCount] = useState<number | ''>('');
    const [formNote, setFormNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // ── data ──
    const [rows, setRows] = useState<MessageReportDTO[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const filter: MessageReportFilter = {};
            if (filterMonth) filter.month = Number(filterMonth);
            if (filterYear) filter.year = Number(filterYear);
            if (filterType) filter.type = filterType;
            const res = await messageReportApi.getList(filter);
            setRows(res.content ?? res ?? []);
        } catch {
            toast.error('Không tải được dữ liệu');
        } finally {
            setLoading(false);
        }
    }, [filterMonth, filterYear, filterType]);

    useEffect(() => {
        if (open) fetchData();
    }, [open, fetchData]);

    const handleSubmit = async () => {
        if (!formDate || !formType || formCount === '' || Number(formCount) < 0) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }
        try {
            setSubmitting(true);
            await messageReportApi.create({
                reportDate: formDate,
                type: formType,
                count: Number(formCount),
                note: formNote || undefined,
            });
            toast.success('Thêm thành công');
            setFormCount('');
            setFormNote('');
            await fetchData();
        } catch {
            toast.error('Thêm thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await messageReportApi.delete(id);
            toast.success('Đã xóa');
            setRows((prev) => prev.filter((r) => r.id !== id));
        } catch {
            toast.error('Xóa thất bại');
        }
    };

    // ── derived stats ──
    const zaloTotal = rows.filter((r) => r.type === 'Zalo').reduce((s, r) => s + r.count, 0);
    const fbTotal = rows.filter((r) => r.type === 'Facebook').reduce((s, r) => s + r.count, 0);
    const otherTotal = rows.filter((r) => r.type === 'Khác').reduce((s, r) => s + r.count, 0);
    const grandTotal = zaloTotal + fbTotal + otherTotal;

    const fmtDate = (d: string) =>
        new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));

    const typeColor = (t: string) => TYPES.find((x) => x.value === t)?.color ?? '#64748b';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: '20px', p: 0.5, boxShadow: '0 20px 48px rgba(0,0,0,0.12)' } } }}
        >
            {/* ── Title ── */}
            <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 40, height: 40, borderRadius: '12px',
                        bgcolor: alpha('#086839', 0.1), color: '#086839',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <MessageSharp />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', letterSpacing: '-0.3px' }}>
                            Báo cáo số lượng tin nhắn
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            Thống kê Zalo / Facebook theo ngày
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#475569', bgcolor: '#f1f5f9' } }}>
                    <Close sx={{ fontSize: 20 }} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2.5, pt: 0 }}>

                {/* ── Filter ── */}
                <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Bộ lọc thống kê
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                        <TextField select size="small" label="Tháng" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value === '' ? '' : Number(e.target.value))} sx={fieldSx}>
                            <MenuItem value="">Tất cả tháng</MenuItem>
                            {months.map((m) => <MenuItem key={m} value={m}>Tháng {m}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" label="Năm" value={filterYear} onChange={(e) => setFilterYear(e.target.value === '' ? '' : Number(e.target.value))} sx={fieldSx}>
                            <MenuItem value="">Tất cả năm</MenuItem>
                            {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" label="Loại tin" value={filterType} onChange={(e) => setFilterType(e.target.value)} sx={fieldSx}>
                            <MenuItem value="">Tất cả</MenuItem>
                            {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                        </TextField>
                    </Box>
                </Paper>

                {/* ── Add Form ── */}
                <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: '14px', border: '1px solid #bbf7d0', bgcolor: '#f0fdf4' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#166534', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Thêm bản ghi mới
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.6fr auto', gap: 1.5, alignItems: 'flex-start' }}>
                        <TextField
                            size="small" type="date" label="Ngày" value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={fieldSx}
                        />
                        <TextField select size="small" label="Loại" value={formType} onChange={(e) => setFormType(e.target.value)} sx={fieldSx}>
                            {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                        </TextField>
                        <TextField
                            size="small" type="number" label="Số lượng tin" value={formCount}
                            onChange={(e) => setFormCount(e.target.value === '' ? '' : Number(e.target.value))}
                            slotProps={{ input: { inputProps: { min: 0 } } }}
                            sx={fieldSx}
                        />
                        <TextField
                            size="small" label="Ghi chú" value={formNote}
                            onChange={(e) => setFormNote(e.target.value)}
                            sx={fieldSx}
                        />
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={handleSubmit}
                            disabled={submitting}
                            sx={{
                                bgcolor: '#086839', '&:hover': { bgcolor: '#065f33' },
                                borderRadius: '10px', textTransform: 'none', fontWeight: 700,
                                px: 2.5, height: 40, whiteSpace: 'nowrap',
                            }}
                        >
                            Thêm
                        </Button>
                    </Box>
                </Paper>

                {/* ── Table ── */}
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', maxHeight: 340 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow sx={{ '& th': { bgcolor: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', py: 1.2, borderColor: '#e2e8f0' } }}>
                                <TableCell>Ngày</TableCell>
                                <TableCell>Loại</TableCell>
                                <TableCell align="center">Số tin</TableCell>
                                <TableCell>Ghi chú</TableCell>
                                <TableCell>Người tạo</TableCell>
                                <TableCell align="center" sx={{ width: 60 }}>Xóa</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#94a3b8', fontSize: 13 }}>
                                        {loading ? 'Đang tải...' : 'Chưa có dữ liệu'}
                                    </TableCell>
                                </TableRow>
                            )}
                            {rows.map((row) => (
                                <TableRow key={row.id} sx={{ '&:hover': { bgcolor: '#f8fafc' }, '& td': { borderColor: '#f1f5f9', py: 1.2 } }}>
                                    <TableCell sx={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                        {fmtDate(row.reportDate)}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={row.type}
                                            size="small"
                                            sx={{ bgcolor: alpha(typeColor(row.type), 0.1), color: typeColor(row.type), fontWeight: 700, fontSize: 11, height: 22, border: `1px solid ${alpha(typeColor(row.type), 0.25)}` }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip label={row.count.toLocaleString('vi-VN')} size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 12, height: 22, border: '1px solid #bbf7d0' }} />
                                    </TableCell>
                                    <TableCell sx={{ color: '#64748b', fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {row.note || '—'}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
                                        {row.createdByName || '—'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Xóa">
                                            <IconButton size="small" onClick={() => handleDelete(row.id)} sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fee2e2' } }}>
                                                <Delete sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ── Summary ── */}
                {rows.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <StatChip label="Zalo" value={zaloTotal} color="#0068FF" />
                        <StatChip label="Facebook" value={fbTotal} color="#4267B2" />
                        {otherTotal > 0 && <StatChip label="Khác" value={otherTotal} color="#f59e0b" />}
                        <StatChip label="Tổng cộng" value={grandTotal} color="#086839" bold />
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

function StatChip({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.6, borderRadius: '10px', bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.2)}` }}>
            <Typography sx={{ fontSize: 12, color: color, fontWeight: bold ? 800 : 600 }}>{label}:</Typography>
            <Typography sx={{ fontSize: 13, color: color, fontWeight: 800 }}>{value.toLocaleString('vi-VN')}</Typography>
        </Box>
    );
}

const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '10px',
        '&.Mui-focused fieldset': { borderColor: '#086839' },
    },
    '& label.Mui-focused': { color: '#086839' },
};
