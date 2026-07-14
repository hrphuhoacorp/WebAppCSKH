'use client';

import { useEffect, useState } from 'react';
import {
    Box, Paper, TextField, InputAdornment, Table, TableHead, TableBody, TableRow, TableCell,
    TablePagination, Typography, IconButton, Tooltip, Autocomplete, ToggleButtonGroup, ToggleButton, Button,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import FilterAltOffRoundedIcon from '@mui/icons-material/FilterAltOffRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { personaApi, PersonaTagDto } from '../api/persona.api';
import { BORDER, CARD_RADIUS, GREEN } from '../styles';
import TagChip from './TagChip';
import AssignTagDialog from './AssignTagDialog';
import CustomerSignatureBar from './CustomerSignatureBar';

function errMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: { Message?: string; message?: string } } })?.response?.data;
    return data?.Message || data?.message || fallback;
}

function fmtCompactVnd(v: number): string {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + ' tỷ đ';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' triệu đ';
    return v.toLocaleString('vi-VN') + 'đ';
}

type TagStatusFilter = 'all' | 'tagged' | 'untagged';

export default function PersonaManualTagTab() {
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [tagFilter, setTagFilter] = useState<PersonaTagDto | null>(null);
    const [statusFilter, setStatusFilter] = useState<TagStatusFilter>('all');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [assignTarget, setAssignTarget] = useState<{ id: number; name: string; tagIds: number[] } | null>(null);

    const { data: tags = [] } = useQuery({ queryKey: ['persona-tags'], queryFn: personaApi.getTags });

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 500);
        return () => clearTimeout(t);
    }, [search]);

    const hasTag = statusFilter === 'all' ? undefined : statusFilter === 'tagged';
    const hasFilter = !!debouncedSearch || !!tagFilter || statusFilter !== 'all';

    const { data: customersPage, isLoading } = useQuery({
        queryKey: ['persona-customers-with-tags', debouncedSearch, tagFilter?.id, hasTag, page, pageSize],
        queryFn: () => personaApi.getCustomersWithTags({
            search: debouncedSearch || undefined,
            tagId: tagFilter?.id,
            hasTag,
            page: page + 1,
            pageSize,
        }),
    });

    const items = customersPage?.items ?? [];
    const total = customersPage?.totalItems ?? 0;

    function resetFilters() {
        setSearch('');
        setDebouncedSearch('');
        setTagFilter(null);
        setStatusFilter('all');
        setPage(0);
    }

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <TextField
                        size="small"
                        placeholder="Tìm theo tên, SĐT, mã khách hàng..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        sx={{ width: 300, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13 } }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }}
                    />

                    <Autocomplete
                        size="small"
                        options={tags}
                        value={tagFilter}
                        onChange={(_, v) => { setTagFilter(v); setPage(0); }}
                        getOptionLabel={t => t.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        sx={{ width: 220 }}
                        renderInput={params => (
                            <TextField {...params} placeholder="Lọc theo tag..."
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13 } }} />
                        )}
                        renderOption={(props, t) => (
                            <Box component="li" {...props} key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: t.color, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: 13 }}>{t.name}</Typography>
                            </Box>
                        )}
                    />

                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={statusFilter}
                        onChange={(_, v) => { if (v) { setStatusFilter(v); setPage(0); } }}
                        sx={{
                            '& .MuiToggleButton-root': {
                                textTransform: 'none', fontSize: 12.5, fontWeight: 600, px: 1.5, py: 0.5,
                                color: '#64748b', border: `1px solid ${BORDER}`,
                                '&.Mui-selected': { bgcolor: 'rgba(8,104,57,0.1)', color: GREEN, '&:hover': { bgcolor: 'rgba(8,104,57,0.15)' } },
                            },
                        }}
                    >
                        <ToggleButton value="all">Tất cả</ToggleButton>
                        <ToggleButton value="untagged">Chưa gắn tag</ToggleButton>
                        <ToggleButton value="tagged">Đã gắn tag</ToggleButton>
                    </ToggleButtonGroup>

                    {hasFilter && (
                        <Button size="small" startIcon={<FilterAltOffRoundedIcon sx={{ fontSize: 16 }} />}
                            onClick={resetFilters}
                            sx={{ textTransform: 'none', fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>
                            Xóa lọc
                        </Button>
                    )}

                    <Typography sx={{ fontSize: 12.5, color: '#94a3b8', ml: 'auto' }}>{total} khách hàng</Typography>
                </Box>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Mã KH</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Tên khách hàng</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>SĐT</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Doanh thu</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>
                                    <Tooltip title="Nhóm hàng chiếm tỉ trọng doanh thu cao nhất của khách — màu càng đậm càng chiếm tỉ trọng cao" arrow>
                                        <span>Thường mua</span>
                                    </Tooltip>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Tag</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                            ) : items.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>Không có khách hàng nào</TableCell></TableRow>
                            ) : items.map(c => (
                                <TableRow key={c.id} hover>
                                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{c.customerCode}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{c.name}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{c.phone || '—'}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                                        {fmtCompactVnd(c.totalRevenue)}
                                    </TableCell>
                                    <TableCell>
                                        <CustomerSignatureBar signature={c.signature} width={200} />
                                    </TableCell>
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
