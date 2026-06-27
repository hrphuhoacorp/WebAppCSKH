'use client';

import React, { useState } from 'react';
import {
    Autocomplete, Box, Button, Chip, Divider, IconButton, MenuItem, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useQuery, useMutation } from '@tanstack/react-query';
import { vppApi, VppItemDto, VPP_GREEN } from '@/features/vpp/api/vpp.api';
import PageHeader from '@/components/common/PageHeader';

interface Line { itemId: number; quantity: number; note: string; }

const GREEN = VPP_GREEN;
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';
const DEPARTMENTS = ['Kinh doanh', 'Kế toán', 'Nhân sự', 'Kho', 'IT', 'Ban giám đốc', 'Khác'];

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '& fieldset': { borderColor: BORDER }, '&.Mui-focused fieldset': { borderColor: GREEN, borderWidth: 1.5 } },
    '& label.Mui-focused': { color: GREEN },
};

export default function VppRequestPage() {
    const [department, setDepartment] = useState('');
    const [reason, setReason] = useState('');
    const [lines, setLines] = useState<Line[]>([{ itemId: 0, quantity: 1, note: '' }]);
    const [submitted, setSubmitted] = useState(false);

    const { data: items = [] } = useQuery<VppItemDto[]>({
        queryKey: ['vpp-items-all'],
        queryFn: () => vppApi.getItemsAll(),
        staleTime: 5 * 60 * 1000,
    });

    const submitMut = useMutation({
        mutationFn: () => vppApi.createRequest({
            department,
            reason: reason || undefined,
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
            <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#f0f7f3', backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.08) 0%, transparent 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <Box sx={{ textAlign: 'center', bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: CARD_RADIUS, p: 6, boxShadow: '0 2px 24px rgba(8,104,57,0.08)', maxWidth: 440 }}>
                    <CheckCircleRoundedIcon sx={{ fontSize: 72, color: GREEN, mb: 1 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#1e293b', mb: 1 }}>Đã gửi đề nghị thành công!</Typography>
                    <Typography sx={{ color: '#64748b', fontSize: 14, mb: 3, lineHeight: 1.6 }}>Bộ phận hành chính sẽ xem xét và phản hồi sớm nhất có thể.</Typography>
                    <Button variant="contained" fullWidth onClick={() => { setSubmitted(false); setLines([{ itemId: 0, quantity: 1, note: '' }]); setDepartment(''); setReason(''); }}
                        sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#065f35' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px', height: 44 }}>
                        Gửi đề nghị mới
                    </Button>
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

            <Box sx={{ mt: 3, maxWidth: 900 }}>
                {/* Thông tin chung */}
                <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, p: 3, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', mb: 2.5 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 2 }}>Thông tin chung</Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField select size="small" label="Bộ phận *" value={department} onChange={e => setDepartment(e.target.value)} sx={{ ...fieldSx, minWidth: 220 }}>
                            <MenuItem value="" disabled>Chọn bộ phận</MenuItem>
                            {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                        </TextField>
                        <TextField size="small" label="Lý do / mục đích" value={reason} onChange={e => setReason(e.target.value)} sx={{ ...fieldSx, flex: 1, minWidth: 260 }} />
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
                                                    size="small"
                                                    type="number"
                                                    value={line.quantity}
                                                    onChange={(e) =>
                                                        updateLine(idx, {
                                                            quantity: Math.max(1, Number(e.target.value)),
                                                        })
                                                    }
                                                    slotProps={{
                                                        htmlInput: {
                                                            min: 1,
                                                        },
                                                    }}
                                                    sx={{
                                                        ...fieldSx,
                                                        '& input': {
                                                            textAlign: 'center',
                                                            fontWeight: 700,
                                                        },
                                                    }}
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

                    {/* Submit */}
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
        </Box>
    );
}
