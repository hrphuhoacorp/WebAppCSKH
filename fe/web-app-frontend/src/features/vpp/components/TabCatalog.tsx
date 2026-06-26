'use client';

import React, { useState } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, MenuItem, Paper, Select, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vppApi, VppItemDto, VppItemUpsertDto, VPP_GREEN, VPP_GROUPS } from '../api/vpp.api';

const GROUP_COLOR: Record<string, string> = {
    VPP: '#0369a1',
    CCDC: '#7c3aed',
    TB: '#b45309',
};

const EMPTY_FORM: VppItemUpsertDto = {
    group: 'VPP', name: '', unit: '', unitPrice: 0, vatRate: 0.08, minStock: 0, maxStock: 0, note: '',
};

export default function TabCatalog() {
    const qc = useQueryClient();
    const [group, setGroup] = useState('');
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState<VppItemDto | null>(null);
    const [form, setForm] = useState<VppItemUpsertDto>(EMPTY_FORM);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['vpp-items', group, search],
        queryFn: () => vppApi.getItems({ group: group || undefined, search: search || undefined }),
    });

    const createMut = useMutation({
        mutationFn: (dto: VppItemUpsertDto) => vppApi.createItem(dto),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['vpp-items'] }); handleClose(); },
    });

    const updateMut = useMutation({
        mutationFn: ({ id, dto }: { id: number; dto: VppItemUpsertDto }) => vppApi.updateItem(id, dto),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['vpp-items'] }); handleClose(); },
    });

    const deleteMut = useMutation({
        mutationFn: (id: number) => vppApi.deleteItem(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['vpp-items'] }); setDeleteId(null); },
    });

    function handleOpen(item?: VppItemDto) {
        if (item) {
            setEditItem(item);
            setForm({ group: item.group, name: item.name, unit: item.unit, unitPrice: item.unitPrice, vatRate: item.vatRate, minStock: item.minStock, maxStock: item.maxStock, note: item.note });
        } else {
            setEditItem(null);
            setForm(EMPTY_FORM);
        }
        setDialogOpen(true);
    }

    function handleClose() { setDialogOpen(false); setEditItem(null); }

    function handleSubmit() {
        if (!form.name.trim() || !form.unit.trim()) return;
        if (editItem) updateMut.mutate({ id: editItem.id, dto: form });
        else createMut.mutate(form);
    }

    const isPending = createMut.isPending || updateMut.isPending;

    return (
        <Box>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    size="small" placeholder="Tìm mã / tên vật tư..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    sx={{ width: 260 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
                />
                <Select size="small" value={group} onChange={e => setGroup(e.target.value)} displayEmpty sx={{ minWidth: 160 }}>
                    <MenuItem value="">Tất cả nhóm</MenuItem>
                    {VPP_GROUPS.map(g => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
                </Select>
                <Box sx={{ flex: 1 }} />
                <Typography variant="body2" color="text.secondary">{items.length} vật tư</Typography>
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => handleOpen()}
                    sx={{ bgcolor: VPP_GREEN, '&:hover': { bgcolor: '#065f35' }, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                    Thêm vật tư
                </Button>
            </Box>

            {/* Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }} elevation={0}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            {['Mã', 'Nhóm', 'Tên vật tư', 'ĐVT', 'Giá nhập', 'VAT', 'Tồn min', 'Tồn max', ''].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                        ) : items.length === 0 ? (
                            <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: '#94a3b8' }}>Chưa có vật tư nào</TableCell></TableRow>
                        ) : items.map(item => (
                            <TableRow key={item.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#475569' }}>{item.code}</TableCell>
                                <TableCell>
                                    <Chip label={VPP_GROUPS.find(g => g.value === item.group)?.label ?? item.group}
                                        size="small" sx={{ fontSize: 11, fontWeight: 600, bgcolor: GROUP_COLOR[item.group] + '18', color: GROUP_COLOR[item.group] }} />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 500, maxWidth: 220 }}>{item.name}</TableCell>
                                <TableCell sx={{ color: '#64748b' }}>{item.unit}</TableCell>
                                <TableCell sx={{ color: '#0f766e', fontWeight: 600 }}>{item.unitPrice.toLocaleString('vi-VN')}đ</TableCell>
                                <TableCell sx={{ color: '#64748b' }}>{(item.vatRate * 100).toFixed(0)}%</TableCell>
                                <TableCell align="center">{item.minStock}</TableCell>
                                <TableCell align="center">{item.maxStock}</TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Sửa"><IconButton size="small" onClick={() => handleOpen(item)} sx={{ color: '#3b82f6' }}><EditRoundedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                    <Tooltip title="Xóa"><IconButton size="small" onClick={() => setDeleteId(item.id)} sx={{ color: '#ef4444' }}><DeleteRoundedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Form Dialog */}
            <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{editItem ? 'Sửa vật tư' : 'Thêm vật tư mới'}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
                    <Select size="small" value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} fullWidth>
                        {VPP_GROUPS.map(g => <MenuItem key={g.value} value={g.value}>{g.value} — {g.label}</MenuItem>)}
                    </Select>
                    <TextField label="Tên vật tư *" size="small" fullWidth value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <TextField label="Đơn vị tính *" size="small" sx={{ flex: 1 }} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
                        <TextField label="Giá nhập (đ)" size="small" type="number" sx={{ flex: 1 }} value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: +e.target.value }))} />
                        <TextField label="VAT (%)" size="small" type="number" sx={{ width: 90 }} value={(form.vatRate * 100).toFixed(0)}
                            onChange={e => setForm(f => ({ ...f, vatRate: +e.target.value / 100 }))} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <TextField label="Tồn tối thiểu" size="small" type="number" sx={{ flex: 1 }} value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: +e.target.value }))} />
                        <TextField label="Tồn tối đa" size="small" type="number" sx={{ flex: 1 }} value={form.maxStock} onChange={e => setForm(f => ({ ...f, maxStock: +e.target.value }))} />
                    </Box>
                    <TextField label="Ghi chú" size="small" fullWidth multiline rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleClose} disabled={isPending} sx={{ textTransform: 'none' }}>Hủy</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={isPending || !form.name.trim() || !form.unit.trim()}
                        sx={{ bgcolor: VPP_GREEN, '&:hover': { bgcolor: '#065f35' }, textTransform: 'none', fontWeight: 700 }}>
                        {isPending ? 'Đang lưu...' : editItem ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa</DialogTitle>
                <DialogContent><Typography>Bạn có chắc muốn xóa vật tư này không?</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteId(null)} sx={{ textTransform: 'none' }}>Hủy</Button>
                    <Button variant="contained" color="error" onClick={() => deleteId && deleteMut.mutate(deleteId)}
                        disabled={deleteMut.isPending} sx={{ textTransform: 'none', fontWeight: 700 }}>
                        {deleteMut.isPending ? 'Đang xóa...' : 'Xóa'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
