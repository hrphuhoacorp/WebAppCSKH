'use client';

import React, { useState, useEffect } from 'react';
import {
    Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, IconButton, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TablePagination, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { useQuery, useMutation } from '@tanstack/react-query';
import { vppApi, VppItemDto, VPP_GREEN } from '@/features/vpp/api/vpp.api';
import { useAuth } from '@/providers/AuthProviders';
import PageHeader from '@/components/common/PageHeader';

interface Line { itemId: number; quantity: number; note: string; }

const GREEN = VPP_GREEN;
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
    pending:    { label: 'Chờ duyệt',   bg: '#fef3c7', color: '#b45309' },
    approved:   { label: 'Đã duyệt',    bg: '#dcfce7', color: '#15803d' },
    rejected:   { label: 'Từ chối',     bg: '#fee2e2', color: '#dc2626' },
    dispatched: { label: 'Đã xuất kho', bg: '#dbeafe', color: '#2563eb' },
};

function fmtDate(s?: string | null) {
    if (!s) return '-';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '& fieldset': { borderColor: BORDER }, '&.Mui-focused fieldset': { borderColor: GREEN, borderWidth: 1.5 } },
    '& label.Mui-focused': { color: GREEN },
};

export default function VppRequestPage() {
    const { profile } = useAuth();
    const [view, setView] = useState<'form' | 'history'>('form');
    const [department, setDepartment] = useState('');
    const [reason, setReason] = useState('');
    const [referencePrice, setReferencePrice] = useState('');
    const [lines, setLines] = useState<Line[]>([{ itemId: 0, quantity: 1, note: '' }]);
    const [submitted, setSubmitted] = useState(false);
    const [historyDetailId, setHistoryDetailId] = useState<number | null>(null);
    const [historyPage, setHistoryPage] = useState(0);

    useEffect(() => {
        if (profile?.branchesName && !department) {
            setDepartment(profile.branchesName);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.branchesName]);

    const { data: items = [] } = useQuery<VppItemDto[]>({
        queryKey: ['vpp-items-all'],
        queryFn: () => vppApi.getItemsAll(),
        staleTime: 5 * 60 * 1000,
    });

    const { data: historyData, isLoading: historyLoading } = useQuery({
        queryKey: ['vpp-requests-history', profile?.id, historyPage],
        queryFn: () => vppApi.getRequests({ requesterId: profile!.id, page: historyPage + 1, pageSize: 10 }),
        enabled: !!profile?.id && view === 'history',
    });

    const { data: historyDetail } = useQuery({
        queryKey: ['vpp-request-detail-staff', historyDetailId],
        queryFn: () => vppApi.getRequestById(historyDetailId!),
        enabled: !!historyDetailId,
    });

    const submitMut = useMutation({
        mutationFn: () => vppApi.createRequest({
            department,
            reason: reason || undefined,
            referencePrice: referencePrice || undefined,
            lines: lines.filter(l => l.itemId > 0 && l.quantity > 0).map(l => ({
                itemId: l.itemId, quantity: l.quantity, note: l.note || undefined,
            })),
        }),
        onSuccess: () => setSubmitted(true),
    });

    function addLine() { setLines(prev => [...prev, { itemId: 0, quantity: 1, note: '' }]); }
    function removeLine(idx: number) { setLines(prev => prev.filter((_, i) => i !== idx)); }
    function updateLine(idx: number, patch: Partial<Line>) { setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l)); }
    function getItem(id: number) { return items.find(it => it.id === id); }

    const validLines = lines.filter(l => l.itemId > 0 && l.quantity > 0);
    const canSubmit = department.trim() && validLines.length > 0 && !submitMut.isPending;

    if (submitted) {
        return (
            <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#f0f7f3', backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.08) 0%, transparent 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center', bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: CARD_RADIUS, p: 6, boxShadow: '0 2px 24px rgba(8,104,57,0.08)', maxWidth: 440 }}>
                    <CheckCircleRoundedIcon sx={{ fontSize: 72, color: GREEN, mb: 1 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#1e293b', mb: 1 }}>Đã gửi đề nghị thành công!</Typography>
                    <Typography sx={{ color: '#64748b', fontSize: 14, mb: 3, lineHeight: 1.6 }}>Bộ phận hành chính sẽ xem xét và phản hồi sớm nhất có thể.</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Button variant="contained" fullWidth
                            onClick={() => { setSubmitted(false); setLines([{ itemId: 0, quantity: 1, note: '' }]); setReason(''); setReferencePrice(''); }}
                            sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#065f35' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px', height: 44 }}>
                            Gửi đề nghị mới
                        </Button>
                        <Button variant="outlined" fullWidth startIcon={<HistoryRoundedIcon />}
                            onClick={() => { setSubmitted(false); setView('history'); }}
                            sx={{ borderColor: GREEN, color: GREEN, '&:hover': { bgcolor: alpha(GREEN, 0.05) }, textTransform: 'none', fontWeight: 700, borderRadius: '12px', height: 44 }}>
                            Xem lịch sử đề nghị
                        </Button>
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#f0f7f3', backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)' }}>
            <PageHeader
                title="Đề Nghị Cấp Phát VPP"
                subtitle="Điền thông tin bên dưới để gửi yêu cầu cấp văn phòng phẩm / công cụ / thiết bị"
                icon={<InventoryRoundedIcon />}
            />

            {/* View toggle */}
            <Box sx={{ mt: 2.5, mb: 2.5, maxWidth: 900, display: 'flex', gap: 1 }}>
                <Button
                    variant={view === 'form' ? 'contained' : 'outlined'}
                    startIcon={<InventoryRoundedIcon />}
                    onClick={() => setView('form')}
                    sx={view === 'form'
                        ? { bgcolor: GREEN, '&:hover': { bgcolor: '#065f35' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px' }
                        : { borderColor: BORDER, color: '#475569', '&:hover': { bgcolor: '#f8fafc' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px' }
                    }
                >
                    Gửi đề nghị
                </Button>
                <Button
                    variant={view === 'history' ? 'contained' : 'outlined'}
                    startIcon={<HistoryRoundedIcon />}
                    onClick={() => setView('history')}
                    sx={view === 'history'
                        ? { bgcolor: GREEN, '&:hover': { bgcolor: '#065f35' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px' }
                        : { borderColor: BORDER, color: '#475569', '&:hover': { bgcolor: '#f8fafc' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px' }
                    }
                >
                    Lịch sử đề nghị
                </Button>
            </Box>

            {view === 'form' ? (
                <Box sx={{ maxWidth: 1800 }}>
                    {/* Thông tin chung */}
                    <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, p: 3, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', mb: 2.5 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 2 }}>Thông tin chung</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <TextField
                                size="small" label="Chi nhánh"
                                value={profile?.branchesName ?? ''}
                                slotProps={{ htmlInput: { readOnly: true } }}
                                sx={{ ...fieldSx, minWidth: 200, '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                            />
                            <TextField
                                size="small" label="Vai trò"
                                value={(profile?.roles ?? []).map(r => r.name).join(', ')}
                                slotProps={{ htmlInput: { readOnly: true } }}
                                sx={{ ...fieldSx, minWidth: 200, '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                            />
                            <TextField size="small" label="Lý do / mục đích" value={reason} onChange={e => setReason(e.target.value)} sx={{ ...fieldSx, flex: 1, minWidth: 220 }} />
                            <TextField size="small" label="Giá tham khảo" value={referencePrice} onChange={e => setReferencePrice(e.target.value)} placeholder="VD: ~50,000đ/cây" sx={{ ...fieldSx, minWidth: 200 }} />
                        </Box>
                    </Paper>

                    {/* Danh sách vật tư */}
                    <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, p: 3, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Danh sách vật tư cần cấp</Typography>
                            <Button size="small" startIcon={<AddCircleOutlineRoundedIcon />} onClick={addLine}
                                sx={{ textTransform: 'none', color: GREEN, fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: alpha(GREEN, 0.06) } }}>
                                Thêm dòng
                            </Button>
                        </Box>

                        <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['Vật tư *', 'ĐVT', 'Số lượng *', 'Ghi chú', ''].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 800, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8, bgcolor: GREEN }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {lines.map((line, idx) => {
                                        const item = getItem(line.itemId);
                                        return (
                                            <TableRow key={idx} sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#fbfefc', '&:hover': { bgcolor: '#f0fdf4 !important' }, '& > *': { borderBottom: '1px solid #f1f5f9 !important' } }}>
                                                <TableCell sx={{ minWidth: 260 }}>
                                                    <Autocomplete
                                                        size="small"
                                                        options={items}
                                                        getOptionLabel={it => `${it.code} — ${it.name}`}
                                                        value={items.find(x => x.id === line.itemId) ?? null}
                                                        onChange={(_, it) => updateLine(idx, { itemId: it?.id ?? 0 })}
                                                        isOptionEqualToValue={(o, v) => o.id === v.id}
                                                        noOptionsText="Không tìm thấy"
                                                        renderInput={params => <TextField {...params} placeholder="Tìm vật tư..." sx={fieldSx} />}
                                                        renderOption={(props, it) => (
                                                            <Box component="li" {...props}>
                                                                <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', mr: 1 }}>{it.code}</Box>
                                                                {it.name}
                                                            </Box>
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ width: 80 }}>
                                                    {item
                                                        ? <Chip label={item.unit} size="small" sx={{ bgcolor: alpha(GREEN, 0.08), color: GREEN, fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />
                                                        : <Typography sx={{ color: '#cbd5e1', fontSize: 13 }}>—</Typography>
                                                    }
                                                </TableCell>
                                                <TableCell sx={{ width: 120 }}>
                                                    <TextField
                                                        size="small" type="number" value={line.quantity}
                                                        onChange={e => updateLine(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                                                        slotProps={{ htmlInput: { min: 1 } }}
                                                        sx={{ ...fieldSx, '& input': { textAlign: 'center', fontWeight: 700 } }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField size="small" fullWidth placeholder="Ghi chú..." value={line.note}
                                                        onChange={e => updateLine(idx, { note: e.target.value })} sx={fieldSx} />
                                                </TableCell>
                                                <TableCell sx={{ width: 44 }}>
                                                    {lines.length > 1 && (
                                                        <Tooltip title="Xóa dòng" arrow>
                                                            <IconButton size="small" onClick={() => removeLine(idx)}
                                                                sx={{ color: '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { color: '#dc2626', bgcolor: '#fee2e2' } }}>
                                                                <RemoveCircleOutlineRoundedIcon sx={{ fontSize: 18 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Divider sx={{ my: 2.5, borderColor: BORDER }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                {validLines.length > 0 && (
                                    <Typography sx={{ fontSize: 13, color: '#64748b' }}>
                                        <Box component="span" sx={{ fontWeight: 800, color: GREEN }}>{validLines.length}</Box> mặt hàng •{' '}
                                        <Box component="span" sx={{ fontWeight: 800, color: '#1e293b' }}>{validLines.reduce((s, l) => s + l.quantity, 0)}</Box> đơn vị
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                {submitMut.isError && (
                                    <Typography sx={{ color: '#dc2626', fontSize: 13 }}>Gửi thất bại, vui lòng thử lại.</Typography>
                                )}
                                <Button variant="contained" startIcon={<SendRoundedIcon />} disabled={!canSubmit} onClick={() => submitMut.mutate()}
                                    sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#065f35' }, '&:disabled': { bgcolor: '#94a3b8' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px', height: 42, px: 3 }}>
                                    {submitMut.isPending ? 'Đang gửi...' : 'Gửi đề nghị'}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                </Box>
            ) : (
                /* Lịch sử */
                <Box sx={{ maxWidth: 900 }}>
                    <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['#', 'Ngày gửi', 'Bộ phận', 'Lý do', 'Trạng thái', 'Chi tiết'].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 800, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8, bgcolor: GREEN }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {historyLoading ? (
                                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                                    ) : (historyData?.items ?? []).length === 0 ? (
                                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                            <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>Chưa có đề nghị nào</Typography>
                                        </TableCell></TableRow>
                                    ) : (historyData?.items ?? []).map((req, i) => {
                                        const s = STATUS_MAP[req.status] ?? { label: req.status, bg: '#f1f5f9', color: '#475569' };
                                        return (
                                            <TableRow key={req.id} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#fbfefc', '&:hover': { bgcolor: '#f0fdf4 !important' }, '& > *': { borderBottom: '1px solid #f1f5f9 !important' } }}>
                                                <TableCell sx={{ fontWeight: 700, color: '#475569', fontFamily: 'monospace', py: 1.5 }}>#{req.id}</TableCell>
                                                <TableCell sx={{ color: '#94a3b8', whiteSpace: 'nowrap', py: 1.5 }}>{fmtDate(req.createdAt)}</TableCell>
                                                <TableCell sx={{ color: '#64748b', py: 1.5 }}>{req.department}</TableCell>
                                                <TableCell sx={{ color: '#64748b', maxWidth: 200, py: 1.5 }}>{req.reason || '—'}</TableCell>
                                                <TableCell sx={{ py: 1.5 }}>
                                                    <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />
                                                </TableCell>
                                                <TableCell sx={{ py: 1.5 }}>
                                                    <Tooltip title="Xem chi tiết" arrow>
                                                        <IconButton size="small" onClick={() => setHistoryDetailId(req.id)}
                                                            sx={{ color: '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { color: GREEN, bgcolor: alpha(GREEN, 0.08) } }}>
                                                            <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={historyData?.totalItems ?? 0}
                            page={historyPage}
                            onPageChange={(_, p) => setHistoryPage(p)}
                            rowsPerPage={10}
                            rowsPerPageOptions={[10]}
                            labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                            labelRowsPerPage="Hiển thị:"
                            sx={{ borderTop: `1px solid ${BORDER}` }}
                        />
                    </Paper>
                </Box>
            )}

            {/* Lịch sử detail dialog */}
            <Dialog open={!!historyDetailId} onClose={() => setHistoryDetailId(null)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Chi tiết đề nghị #{historyDetailId}</DialogTitle>
                <DialogContent>
                    {historyDetail ? (
                        <Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2.5 }}>
                                {([
                                    ['Bộ phận', historyDetail.department],
                                    ['Lý do', historyDetail.reason || '—'],
                                    ['Giá tham khảo', historyDetail.referencePrice || '—'],
                                    ['Ngày gửi', fmtDate(historyDetail.createdAt)],
                                    ['Trạng thái', historyDetail.status],
                                    ['Ghi chú từ admin', historyDetail.adminNote || '—'],
                                ] as [string, string][]).map(([label, value]) => (
                                    <Box key={label}>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.4 }}>{label}</Typography>
                                        {label === 'Trạng thái' ? (
                                            <Chip
                                                label={STATUS_MAP[value]?.label ?? value}
                                                size="small"
                                                sx={{ bgcolor: STATUS_MAP[value]?.bg ?? '#f1f5f9', color: STATUS_MAP[value]?.color ?? '#475569', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }}
                                            />
                                        ) : (
                                            <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{value}</Typography>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1, color: '#475569' }}>Vật tư đã yêu cầu</Typography>
                            <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            {['Mã', 'Tên vật tư', 'ĐVT', 'Số lượng', 'Ghi chú'].map(h => (
                                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {historyDetail.lines.map(l => (
                                            <TableRow key={l.id} sx={{ '&:last-child td': { border: 0 } }}>
                                                <TableCell><Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.3, borderRadius: '6px' }}>{l.itemCode}</Box></TableCell>
                                                <TableCell sx={{ fontWeight: 500 }}>{l.itemName}</TableCell>
                                                <TableCell sx={{ color: '#64748b' }}>{l.unit}</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 800, color: GREEN }}>{l.quantity}</TableCell>
                                                <TableCell sx={{ color: '#64748b' }}>{l.note || '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    ) : (
                        <Typography sx={{ color: '#94a3b8', py: 2 }}>Đang tải...</Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setHistoryDetailId(null)} sx={{ textTransform: 'none', borderRadius: '12px', color: '#64748b' }}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
