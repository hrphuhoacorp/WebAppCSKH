'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    Button, IconButton, InputAdornment, MenuItem, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { vppApi, VPP_GREEN, VPP_GROUPS, UniformReturnRecord, VppItemDto } from '../api/vpp.api';

const GREEN = VPP_GREEN;
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: GREEN } },
    '& label.Mui-focused': { color: GREEN },
};

function StatusChip({ status }: { status: string }) {
    if (status === 'inactive') return <Chip label="Ngừng nhập" size="small" sx={{ bgcolor: '#f1f5f9', color: '#94a3b8', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />;
    if (status === 'out_of_stock') return <Chip label="Hết hàng" size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />;
    if (status === 'low') return <Chip label="Sắp hết" size="small" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />;
    return <Chip label="Ổn định" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />;
}

// ── Uniform Return Dialog ────────────────────────────────────────
function UniformReturnDialog({ item, open, onClose }: {
    item: VppItemDto | null;
    open: boolean;
    onClose: () => void;
}) {
    const qc = useQueryClient();
    const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), quantity: 1, returnedBy: '', note: '' });
    const [saving, setSaving] = useState(false);

    if (!item) return null;

    const records: UniformReturnRecord[] = (() => {
        try { return item.uniformReturnHistory ? JSON.parse(item.uniformReturnHistory) : []; }
        catch { return []; }
    })();

    const handleAdd = async () => {
        if (!form.returnedBy.trim()) { toast.error('Vui lòng nhập tên người hoàn trả'); return; }
        if (form.quantity < 1) { toast.error('Số lượng phải >= 1'); return; }
        setSaving(true);
        try {
            await vppApi.appendUniformReturn(item.id, form);
            qc.invalidateQueries({ queryKey: ['vpp-items'] });
            qc.invalidateQueries({ queryKey: ['vpp-inventory'] });
            toast.success('Đã ghi nhận hoàn trả');
            setForm(f => ({ ...f, returnedBy: '', note: '', quantity: 1 }));
            onClose();
        } catch (err: any) { toast.error(err?.message || 'Lỗi khi ghi nhận hoàn trả'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (index: number) => {
        setSaving(true);
        try {
            await vppApi.deleteUniformReturn(item.id, index);
            qc.invalidateQueries({ queryKey: ['vpp-items'] });
            qc.invalidateQueries({ queryKey: ['vpp-inventory'] });
            toast.success('Đã xóa bản ghi');
        } catch (err: any) { toast.error(err?.message || 'Lỗi khi xóa'); }
        finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px' } } }}>
            <DialogTitle sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b', pb: 1 }}>
                Hoàn trả đồng phục
                <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 400, mt: 0.3 }}>
                    {item.code} · {item.name}
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
                {/* Add form */}
                <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: '14px', mb: 2.5 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5 }}>
                        Thêm bản ghi mới
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
                        <TextField size="small" type="date" label="Ngày hoàn trả" value={form.date}
                            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                            slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
                        <TextField size="small" type="number" label="Số lượng"
                            value={form.quantity === 0 ? '' : form.quantity}
                            onChange={e => setForm(f => ({ ...f, quantity: e.target.value === '' ? 0 : Math.max(1, +e.target.value) }))}
                            onBlur={() => setForm(f => ({ ...f, quantity: Math.max(1, f.quantity) }))}
                            slotProps={{ input: { inputProps: { min: 1 } } }} sx={fieldSx} />
                    </Box>
                    <TextField size="small" fullWidth label="Người hoàn trả" value={form.returnedBy}
                        onChange={e => setForm(f => ({ ...f, returnedBy: e.target.value }))}
                        sx={{ ...fieldSx, mb: 1.5 }} />
                    <TextField size="small" fullWidth label="Ghi chú" value={form.note}
                        onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                        sx={fieldSx} />
                </Paper>

                {/* History */}
                {records.length > 0 && (
                    <>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
                            Lịch sử hoàn trả ({records.reduce((s, r) => s + r.quantity, 0)} cái)
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            {records.map((r, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '12px', bgcolor: alpha('#7c3aed', 0.04), border: `1px solid ${alpha('#7c3aed', 0.12)}` }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{r.returnedBy}</Typography>
                                            <Chip label={`${r.quantity} cái`} size="small" sx={{ bgcolor: alpha('#7c3aed', 0.1), color: '#7c3aed', fontWeight: 700, fontSize: 11, height: 20 }} />
                                        </Box>
                                        <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                                            {new Date(r.date).toLocaleDateString('vi-VN')}{r.note ? ` · ${r.note}` : ''}
                                        </Typography>
                                    </Box>
                                    <Tooltip title="Xóa bản ghi này">
                                        <IconButton size="small" disabled={saving} onClick={() => handleDelete(i)}
                                            sx={{ color: '#dc2626', '&:hover': { bgcolor: '#fee2e2' } }}>
                                            <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            ))}
                        </Box>
                    </>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, borderColor: '#e2e8f0', color: '#64748b' }}>
                    Đóng
                </Button>
                <Button onClick={handleAdd} variant="contained" disabled={saving} startIcon={<AddRoundedIcon />}
                    sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}>
                    Ghi nhận hoàn trả
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ── Main Tab ─────────────────────────────────────────────────────
export default function TabInventory() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [returnItem, setReturnItem] = useState<VppItemDto | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const { data: inv, isLoading } = useQuery({
        queryKey: ['vpp-inventory', month, year],
        queryFn: () => vppApi.getInventory(month, year),
    });

    // Fetch all items to get uniformReturnHistory for DP items
    const { data: itemsData } = useQuery({
        queryKey: ['vpp-items', 'DP'],
        queryFn: () => vppApi.getItems({ group: 'DP', pageSize: 200 }),
    });
    const dpItems = itemsData?.items ?? [];

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
    const q = search.trim().toLowerCase();
    const rows = (inv?.rows ?? []).filter(r =>
        !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
    );

    const getReturnedQty = (itemId: number) => {
        const dpItem = dpItems.find(i => i.id === itemId);
        if (!dpItem?.uniformReturnHistory) return 0;
        try {
            const records: UniformReturnRecord[] = JSON.parse(dpItem.uniformReturnHistory);
            return records.reduce((s, r) => s + r.quantity, 0);
        } catch { return 0; }
    };

    const getDpItem = (itemId: number) => dpItems.find(i => i.id === itemId) ?? null;

    const isDP = (group: string) => group === 'DP';
    const headers = ['Mã', 'Nhóm', 'Tên vật tư', 'ĐVT', 'Đầu kỳ', 'Nhập', 'Xuất', 'Điều chỉnh', 'Cuối kỳ', 'Giá trị', 'Hoàn trả', 'Trạng thái'];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Filter + summary */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        size="small" placeholder="Tìm mã / tên vật tư..."
                        value={searchInput} onChange={e => setSearchInput(e.target.value)}
                        sx={{ ...fieldSx, width: 240 }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }}
                    />
                    <TextField select size="small" label="Tháng" value={month} onChange={e => setMonth(+e.target.value)} sx={{ ...fieldSx, minWidth: 130 }}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <MenuItem key={m} value={m}>Tháng {m}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Năm" value={year} onChange={e => setYear(+e.target.value)} sx={{ ...fieldSx, minWidth: 100 }}>
                        {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </TextField>
                    {inv && (
                        <Box sx={{ ml: 'auto', display: 'flex', gap: 3 }}>
                            {[
                                { label: 'Giá trị kho', value: inv.totalValue.toLocaleString('vi-VN') + 'đ', color: '#0f766e' },
                                { label: 'Hết hàng', value: String(inv.outOfStockCount), color: '#dc2626' },
                                { label: 'Sắp hết', value: String(inv.lowStockCount), color: '#f59e0b' },
                            ].map(s => (
                                <Box key={s.label} sx={{ textAlign: 'right' }}>
                                    <Typography sx={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</Typography>
                                    <Typography sx={{ fontWeight: 800, color: s.color, fontSize: 16 }}>{s.value}</Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'auto', flex: 1, minHeight: 0 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {headers.map(h => (
                                <TableCell key={h} sx={{ fontWeight: 800, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8, bgcolor: GREEN, whiteSpace: 'nowrap' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={headers.length} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow><TableCell colSpan={headers.length} align="center" sx={{ py: 8 }}>
                                <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>{!inv ? `Chưa có dữ liệu tồn kho tháng ${month}/${year}` : 'Không tìm thấy vật tư phù hợp'}</Typography>
                            </TableCell></TableRow>
                        ) : rows.map((row, i) => {
                            const returnedQty = isDP(row.group) ? getReturnedQty(row.itemId) : null;
                            return (
                                <TableRow key={row.itemId} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#fbfefc', '&:hover': { bgcolor: '#f0fdf4 !important' }, transition: 'background 0.15s', '& > *': { borderBottom: '1px solid #f1f5f9 !important' } }}>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.4, borderRadius: '6px', display: 'inline-block' }}>{row.code}</Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Chip label={VPP_GROUPS.find(g => g.value === row.group)?.label ?? row.group} size="small" sx={{ fontSize: 11, fontWeight: 600, borderRadius: '8px', height: 22 }} />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 500, maxWidth: 200, fontSize: 13, py: 1.5 }}>{row.name}</TableCell>
                                    <TableCell sx={{ color: '#64748b', py: 1.5 }}>{row.unit}</TableCell>
                                    <TableCell align="center" sx={{ py: 1.5 }}>{row.openingQty}</TableCell>
                                    <TableCell align="center" sx={{ color: '#0284c7', fontWeight: 600, py: 1.5 }}>{row.importedQty > 0 ? `+${row.importedQty}` : row.importedQty}</TableCell>
                                    <TableCell align="center" sx={{ color: '#dc2626', fontWeight: 600, py: 1.5 }}>{row.dispatchedQty > 0 ? `-${row.dispatchedQty}` : row.dispatchedQty}</TableCell>
                                    <TableCell align="center" sx={{ color: row.adjustedQty >= 0 ? '#15803d' : '#dc2626', fontWeight: 600, py: 1.5 }}>{row.adjustedQty > 0 ? `+${row.adjustedQty}` : row.adjustedQty}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 800, color: row.closingQty <= 0 ? '#dc2626' : '#1e293b', py: 1.5 }}>{row.closingQty}</TableCell>
                                    <TableCell sx={{ color: '#0f766e', fontWeight: 700, whiteSpace: 'nowrap', py: 1.5 }}>{row.totalValue.toLocaleString('vi-VN')}đ</TableCell>
                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                        {isDP(row.group) ? (
                                            <Tooltip title="Xem / thêm hoàn trả đồng phục">
                                                <Box
                                                    onClick={() => setReturnItem(getDpItem(row.itemId))}
                                                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', px: 1, py: 0.3, borderRadius: '8px', border: `1px solid ${alpha('#7c3aed', 0.25)}`, bgcolor: alpha('#7c3aed', 0.06), '&:hover': { bgcolor: alpha('#7c3aed', 0.12) }, transition: 'all 0.15s' }}
                                                >
                                                    <UndoRoundedIcon sx={{ fontSize: 14, color: '#7c3aed' }} />
                                                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>{returnedQty ?? 0}</Typography>
                                                </Box>
                                            </Tooltip>
                                        ) : (
                                            <Typography sx={{ color: '#cbd5e1', fontSize: 12 }}>—</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}><StatusChip status={row.stockStatus} /></TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <UniformReturnDialog
                item={returnItem}
                open={!!returnItem}
                onClose={() => setReturnItem(null)}
            />
        </Box>
    );
}
