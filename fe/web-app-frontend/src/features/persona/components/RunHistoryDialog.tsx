'use client';

import { Fragment, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Table, TableHead,
    TableBody, TableRow, TableCell, Chip, Collapse, IconButton,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useQuery } from '@tanstack/react-query';
import { personaApi, PersonaTagDto } from '../api/persona.api';
import { CARD_RADIUS, GREEN } from '../styles';

function fmtDate(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function RunHistoryDialog({ open, tag, onClose }: {
    open: boolean;
    tag: PersonaTagDto | null;
    onClose: () => void;
}) {
    const [expandedRunId, setExpandedRunId] = useState<number | null>(null);

    const { data: runsPage, isLoading } = useQuery({
        queryKey: ['persona-runs', tag?.id],
        queryFn: () => personaApi.getRuns({ tagId: tag!.id, page: 1, pageSize: 50 }),
        enabled: open && !!tag,
    });

    const { data: detail } = useQuery({
        queryKey: ['persona-run-detail', expandedRunId],
        queryFn: () => personaApi.getRunDetail(expandedRunId!),
        enabled: expandedRunId !== null,
    });

    const runs = runsPage?.items ?? [];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, maxHeight: '85vh' } } }}>
            <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Lịch sử chạy — {tag?.name}</DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                {isLoading ? (
                    <Typography sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</Typography>
                ) : runs.length === 0 ? (
                    <Typography sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>Chưa có lần chạy nào</Typography>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Thời gian</TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Người chạy</TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700 }} align="right">Khớp</TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700 }} align="right">+/-</TableCell>
                                <TableCell sx={{ width: 40 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {runs.map(r => (
                                <Fragment key={r.id}>
                                    <TableRow hover sx={{ cursor: 'pointer' }}
                                        onClick={() => setExpandedRunId(expandedRunId === r.id ? null : r.id)}>
                                        <TableCell sx={{ fontSize: 12.5 }}>{fmtDate(r.runAt)}</TableCell>
                                        <TableCell sx={{ fontSize: 12.5 }}>{r.runByName}</TableCell>
                                        <TableCell sx={{ fontSize: 12.5, fontWeight: 700 }} align="right">{r.matchedCustomerCount}</TableCell>
                                        <TableCell align="right">
                                            <Chip size="small" label={`+${r.newlyAddedCount}`} sx={{ fontSize: 11, mr: 0.5, bgcolor: 'rgba(8,104,57,0.1)', color: GREEN }} />
                                            <Chip size="small" label={`-${r.removedCount}`} sx={{ fontSize: 11, bgcolor: 'rgba(220,38,38,0.1)', color: '#dc2626' }} />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton size="small" sx={{ transform: expandedRunId === r.id ? 'rotate(180deg)' : 'none' }}>
                                                <ExpandMoreRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                                            <Collapse in={expandedRunId === r.id} unmountOnExit>
                                                <Box sx={{ p: 2, bgcolor: '#f8fafc' }}>
                                                    {!detail || detail.id !== r.id ? (
                                                        <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Đang tải chi tiết...</Typography>
                                                    ) : (
                                                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                                            <Box sx={{ flex: 1, minWidth: 200 }}>
                                                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: GREEN, mb: 0.5 }}>
                                                                    Khách được thêm ({detail.addedCustomers.length})
                                                                </Typography>
                                                                {detail.addedCustomers.length === 0
                                                                    ? <Typography sx={{ fontSize: 12, color: '#cbd5e1' }}>Không có</Typography>
                                                                    : detail.addedCustomers.map(c => (
                                                                        <Typography key={c.id} sx={{ fontSize: 12 }}>{c.customerCode} — {c.name}</Typography>
                                                                    ))}
                                                            </Box>
                                                            <Box sx={{ flex: 1, minWidth: 200 }}>
                                                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#dc2626', mb: 0.5 }}>
                                                                    Khách bị gỡ ({detail.removedCustomers.length})
                                                                </Typography>
                                                                {detail.removedCustomers.length === 0
                                                                    ? <Typography sx={{ fontSize: 12, color: '#cbd5e1' }}>Không có</Typography>
                                                                    : detail.removedCustomers.map(c => (
                                                                        <Typography key={c.id} sx={{ fontSize: 12 }}>{c.customerCode} — {c.name}</Typography>
                                                                    ))}
                                                            </Box>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>Đóng</Button>
            </DialogActions>
        </Dialog>
    );
}
