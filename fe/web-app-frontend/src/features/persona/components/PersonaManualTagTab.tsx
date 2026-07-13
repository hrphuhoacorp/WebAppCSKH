'use client';

import { useState } from 'react';
import {
    Box, Paper, TextField, InputAdornment, Table, TableHead, TableBody, TableRow, TableCell,
    TablePagination, Typography, IconButton, Tooltip,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { personaApi } from '../api/persona.api';
import { BORDER, CARD_RADIUS, GREEN } from '../styles';
import TagChip from './TagChip';
import AssignTagDialog from './AssignTagDialog';

function errMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: { Message?: string; message?: string } } })?.response?.data;
    return data?.Message || data?.message || fallback;
}

export default function PersonaManualTagTab() {
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [assignTarget, setAssignTarget] = useState<{ id: number; name: string; tagIds: number[] } | null>(null);

    const { data: tags = [] } = useQuery({ queryKey: ['persona-tags'], queryFn: personaApi.getTags });

    const { data: customersPage, isLoading } = useQuery({
        queryKey: ['persona-customers-with-tags', search, page, pageSize],
        queryFn: () => personaApi.getCustomersWithTags({ search: search || undefined, page: page + 1, pageSize }),
    });

    const items = customersPage?.items ?? [];
    const total = customersPage?.totalItems ?? 0;

    async function handleAssign(tagId: number, note?: string) {
        if (!assignTarget) return;
        try {
            await personaApi.assignTag(assignTarget.id, tagId, note);
            toast.success('Đã gắn tag');
            setAssignTarget(null);
            qc.invalidateQueries({ queryKey: ['persona-customers-with-tags'] });
            qc.invalidateQueries({ queryKey: ['persona-tags'] });
        } catch (err) {
            toast.error(errMessage(err, 'Gắn tag thất bại'));
        }
    }

    async function handleRemove(assignmentId: number) {
        try {
            await personaApi.removeAssignment(assignmentId);
            toast.success('Đã gỡ tag');
            qc.invalidateQueries({ queryKey: ['persona-customers-with-tags'] });
            qc.invalidateQueries({ queryKey: ['persona-tags'] });
        } catch (err) {
            toast.error(errMessage(err, 'Gỡ tag thất bại'));
        }
    }

    return (
        <Box>
            <Paper elevation={0} sx={{ p: 2, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2 }}>
                <TextField
                    size="small"
                    placeholder="Tìm theo tên, SĐT, mã khách hàng..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0); }}
                    sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13 } }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }}
                />
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Mã KH</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Tên khách hàng</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>SĐT</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Tag</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                            ) : items.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: '#94a3b8' }}>Không có khách hàng nào</TableCell></TableRow>
                            ) : items.map(c => (
                                <TableRow key={c.id} hover>
                                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{c.customerCode}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{c.name}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{c.phone || '—'}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 400 }}>
                                            {c.tags.length === 0
                                                ? <Typography sx={{ fontSize: 12, color: '#cbd5e1' }}>Chưa có tag</Typography>
                                                : c.tags.map(a => (
                                                    <TagChip key={a.id} assignment={a} onRemove={() => handleRemove(a.id)} />
                                                ))}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Gắn tag" arrow>
                                            <IconButton size="small"
                                                onClick={() => setAssignTarget({ id: c.id, name: c.name, tagIds: c.tags.map(t => t.tagId) })}
                                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px' }}>
                                                <LocalOfferRoundedIcon fontSize="small" sx={{ color: GREEN }} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
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

            <AssignTagDialog
                open={!!assignTarget}
                customerName={assignTarget?.name ?? ''}
                tags={tags}
                existingTagIds={assignTarget?.tagIds ?? []}
                onClose={() => setAssignTarget(null)}
                onSubmit={handleAssign}
            />
        </Box>
    );
}
