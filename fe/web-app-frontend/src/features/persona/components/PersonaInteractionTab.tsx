'use client';

import { useState } from 'react';
import {
    Box, Paper, Button, Table, TableHead, TableBody, TableRow, TableCell, Chip, IconButton,
    Tooltip, Typography, TablePagination, Select, MenuItem, Autocomplete, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { personaApi, PersonaCustomerSample, PersonaInteractionDto, PersonaInteractionType } from '../api/persona.api';
import { BORDER, CARD_RADIUS, GREEN } from '../styles';
import InteractionFormDialog, { InteractionFormValues } from './InteractionFormDialog';

function errMessage(err: unknown, fallback: string): string {
    return (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
}

const TYPE_LABELS: Record<PersonaInteractionType, string> = {
    note: 'Ghi chú',
    call: 'Cuộc gọi',
    complaint: 'Khiếu nại',
    care_action: 'Đã chăm sóc',
};

const COMPLAINT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    open: { label: 'Mới', color: '#dc2626' },
    in_progress: { label: 'Đang xử lý', color: '#f59e0b' },
    resolved: { label: 'Đã xử lý', color: GREEN },
};

function fmtDate(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PersonaInteractionTab() {
    const qc = useQueryClient();
    const [customerFilter, setCustomerFilter] = useState<PersonaCustomerSample | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<PersonaInteractionType | ''>('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);

    const [formOpen, setFormOpen] = useState(false);
    const [editingInteraction, setEditingInteraction] = useState<PersonaInteractionDto | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PersonaInteractionDto | null>(null);

    const { data: customerOptions = [] } = useQuery({
        queryKey: ['persona-customer-search-filter', customerSearch],
        queryFn: () => personaApi.searchCustomers(customerSearch || undefined),
    });

    const { data: page1, isLoading } = useQuery({
        queryKey: ['persona-interactions', customerFilter?.id, typeFilter, page, pageSize],
        queryFn: () => personaApi.getInteractions({
            customerId: customerFilter?.id, type: typeFilter || undefined, page: page + 1, pageSize,
        }),
    });

    const items = page1?.items ?? [];
    const total = page1?.totalItems ?? 0;

    function refresh() {
        qc.invalidateQueries({ queryKey: ['persona-interactions'] });
    }

    async function handleSubmit(values: InteractionFormValues) {
        try {
            if (editingInteraction) {
                await personaApi.updateInteraction(editingInteraction.id, values);
                toast.success('Đã cập nhật');
            } else {
                await personaApi.createInteraction(values);
                toast.success('Đã thêm');
            }
            setFormOpen(false);
            setEditingInteraction(null);
            refresh();
        } catch (err) {
            toast.error(errMessage(err, 'Lưu thất bại'));
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            await personaApi.deleteInteraction(deleteTarget.id);
            toast.success('Đã xóa');
            setDeleteTarget(null);
            refresh();
        } catch (err) {
            toast.error(errMessage(err, 'Xóa thất bại'));
        }
    }

    return (
        <Box>
            <Paper elevation={0} sx={{ p: 2, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Autocomplete
                        size="small"
                        options={customerOptions}
                        value={customerFilter}
                        getOptionLabel={c => `${c.name} — ${c.customerCode}`}
                        onChange={(_, v) => { setCustomerFilter(v); setPage(0); }}
                        onInputChange={(_, v) => setCustomerSearch(v)}
                        renderInput={params => <TextField {...params} label="Lọc theo khách hàng" />}
                        sx={{ width: 260 }}
                    />
                    <Select size="small" displayEmpty value={typeFilter}
                        onChange={e => { setTypeFilter(e.target.value as PersonaInteractionType); setPage(0); }}
                        sx={{ width: 180, fontSize: 13 }}>
                        <MenuItem value="">Tất cả loại</MenuItem>
                        {(Object.keys(TYPE_LABELS) as PersonaInteractionType[]).map(t => (
                            <MenuItem key={t} value={t}>{TYPE_LABELS[t]}</MenuItem>
                        ))}
                    </Select>
                    <Box sx={{ flex: 1 }} />
                    <Button variant="contained" startIcon={<AddRoundedIcon />}
                        onClick={() => { setEditingInteraction(null); setFormOpen(true); }}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' } }}>
                        Thêm mới
                    </Button>
                </Box>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Thời điểm</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Khách hàng</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Loại</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Nội dung</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Người ghi</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                            ) : items.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>Chưa có lịch sử chăm sóc nào</TableCell></TableRow>
                            ) : items.map(item => {
                                const status = item.complaintStatus ? COMPLAINT_STATUS_LABELS[item.complaintStatus] : null;
                                return (
                                    <TableRow key={item.id} hover>
                                        <TableCell sx={{ fontSize: 12.5 }}>{fmtDate(item.occurredAt)}</TableCell>
                                        <TableCell sx={{ fontSize: 12.5, fontWeight: 600 }}>{item.customerName}</TableCell>
                                        <TableCell><Chip size="small" label={TYPE_LABELS[item.type]} sx={{ fontSize: 11.5 }} /></TableCell>
                                        <TableCell sx={{ fontSize: 12.5, maxWidth: 320, whiteSpace: 'pre-wrap' }}>{item.content}</TableCell>
                                        <TableCell>
                                            {status && (
                                                <Chip size="small" label={status.label}
                                                    sx={{ fontSize: 11.5, bgcolor: `${status.color}1a`, color: status.color, fontWeight: 700 }} />
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 12.5, color: '#64748b' }}>{item.createdByName}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Sửa" arrow>
                                                <IconButton size="small" onClick={() => { setEditingInteraction(item); setFormOpen(true); }}
                                                    sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', mr: 0.5 }}>
                                                    <EditRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Xóa" arrow>
                                                <IconButton size="small" onClick={() => setDeleteTarget(item)}
                                                    sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', color: '#dc2626' }}>
                                                    <DeleteOutlineRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={pageSize}
                    onPageChange={(_, p) => setPage(p)}
                    onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[25, 50, 100]}
                    labelRowsPerPage="Số dòng:"
                    sx={{ borderTop: `1px solid ${BORDER}` }}
                />
            </Paper>

            <InteractionFormDialog
                open={formOpen}
                interaction={editingInteraction}
                fixedCustomer={null}
                onClose={() => { setFormOpen(false); setEditingInteraction(null); }}
                onSubmit={handleSubmit}
            />

            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Xóa lịch sử này?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 14, color: '#475569' }}>Hành động này không hiển thị lại được trong danh sách, nhưng vẫn lưu trong lịch sử hệ thống.</Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none', borderRadius: '10px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" color="error" onClick={handleDelete} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Xóa</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
