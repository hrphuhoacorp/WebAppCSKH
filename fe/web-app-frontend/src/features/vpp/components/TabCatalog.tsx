'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, MenuItem, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TablePagination, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ToggleOnRoundedIcon from '@mui/icons-material/ToggleOnRounded';
import ToggleOffRoundedIcon from '@mui/icons-material/ToggleOffRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vppApi, VppItemDto, VppItemUpsertDto, VPP_GREEN, VPP_GROUPS } from '../api/vpp.api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const GREEN = VPP_GREEN;
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';

const GROUP_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    VPP:  { bg: alpha('#0369a1', 0.08), color: '#0369a1', border: alpha('#0369a1', 0.2) },
    CCDC: { bg: alpha('#7c3aed', 0.08), color: '#7c3aed', border: alpha('#7c3aed', 0.2) },
    TB:   { bg: alpha('#b45309', 0.08), color: '#b45309', border: alpha('#b45309', 0.2) },
};

const EMPTY_FORM: VppItemUpsertDto = {
    group: 'VPP', name: '', unit: '', unitPrice: 0, minStock: 0, maxStock: 0, note: '',
};

const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        '& fieldset': { borderColor: BORDER },
        '&:hover fieldset': { borderColor: '#bbf7d0' },
        '&.Mui-focused fieldset': { borderColor: GREEN, borderWidth: 1.5 },
    },
    '& label.Mui-focused': { color: GREEN },
};

interface ImportRow { name: string; unit: string; unitPrice: number; note: string; initialQty: number; }

function parsePrice(v: unknown): number {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Math.round(v);
    return parseInt(String(v).trim().replace(/[^\d]/g, ''), 10) || 0;
}

export default function TabCatalog() {
    const qc = useQueryClient();
    const [group, setGroup] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState<VppItemDto | null>(null);
    const [form, setForm] = useState<VppItemUpsertDto>(EMPTY_FORM);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [initialQty, setInitialQty] = useState(0);

    // Import state
    const [importOpen, setImportOpen] = useState(false);
    const [importGroup, setImportGroup] = useState('VPP');
    const [importRows, setImportRows] = useState<ImportRow[]>([]);
    const [importFileName, setImportFileName] = useState('');
    const [importing, setImporting] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);

    const { data: pagedData, isLoading } = useQuery({
        queryKey: ['vpp-items', group, search, page, rowsPerPage],
        queryFn: () => vppApi.getItems({ group: group || undefined, search: search || undefined, page: page + 1, pageSize: rowsPerPage }),
    });
    const items = pagedData?.items ?? [];
    const totalItems = pagedData?.totalItems ?? 0;

    useEffect(() => { setPage(0); }, [group]);
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const createMut = useMutation({
        mutationFn: (dto: VppItemUpsertDto) => vppApi.createItem(dto),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => { toast.error(err?.response?.data?.message || err?.response?.data?.Message || 'Tạo vật tư thất bại'); },
    });
    const updateMut = useMutation({
        mutationFn: ({ id, dto }: { id: number; dto: VppItemUpsertDto }) => vppApi.updateItem(id, dto),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['vpp-items'] }); handleClose(); toast.success('Đã cập nhật vật tư'); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => { toast.error(err?.response?.data?.message || err?.response?.data?.Message || 'Cập nhật thất bại'); },
    });
    const deleteMut = useMutation({
        mutationFn: (id: number) => vppApi.deleteItem(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['vpp-items'] }); setDeleteId(null); },
    });
    const toggleMut = useMutation({
        mutationFn: (id: number) => vppApi.toggleActive(id),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ['vpp-items'] });
            toast.success(res.isActive ? 'Đã kích hoạt vật tư' : 'Đã đặt thành ngừng nhập');
        },
    });

    function handleOpen(item?: VppItemDto) {
        if (item) {
            setEditItem(item);
            setForm({ group: item.group, name: item.name, unit: item.unit, unitPrice: item.unitPrice, minStock: item.minStock, maxStock: item.maxStock, note: item.note ?? '' });
        } else {
            setEditItem(null);
            setForm(EMPTY_FORM);
        }
        setInitialQty(0);
        setDialogOpen(true);
    }
    function handleClose() { setDialogOpen(false); setEditItem(null); }
    async function handleSubmit() {
        if (!form.name.trim() || !form.unit.trim()) return;
        if (editItem) { updateMut.mutate({ id: editItem.id, dto: form }); return; }
        try {
            const newItem = await createMut.mutateAsync(form);
            qc.invalidateQueries({ queryKey: ['vpp-items'] });
            if (initialQty > 0) {
                try {
                    await vppApi.createImport({
                        importDate: new Date().toISOString().slice(0, 10),
                        note: 'Nhập ban đầu',
                        lines: [{ itemId: newItem.id, quantity: initialQty, unitPrice: form.unitPrice }],
                    });
                    qc.invalidateQueries({ queryKey: ['vpp-imports'] });
                    qc.invalidateQueries({ queryKey: ['vpp-inventory'] });
                    toast.success(`Đã thêm vật tư và nhập kho ${initialQty} ${newItem.unit}`);
                } catch {
                    toast.error('Tạo vật tư thành công nhưng nhập kho ban đầu thất bại');
                }
            } else {
                toast.success('Đã thêm vật tư');
            }
            handleClose();
        } catch { /* handled by onError */ }
    }
    const isPending = createMut.isPending || updateMut.isPending;

    function handleImportFile(file: File) {
        setImportFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const wb = XLSX.read(e.target?.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            // Find header row (contains "Tên" or "tên")
            let headerIdx = raw.findIndex(row => row.some(c => String(c).toLowerCase().includes('tên')));
            if (headerIdx < 0) headerIdx = 0;
            const headers = (raw[headerIdx] as string[]).map(h => String(h).toLowerCase());
            const colName    = headers.findIndex(h => h.includes('tên'));
            const colUnit    = headers.findIndex(h => h.includes('đơn vị') || h.includes('dvt') || h.includes('đvt'));
            const colPrice   = headers.findIndex(h => h.includes('giá nhập') || h.includes('gia nhap') || h.includes('giá nhap'));
            const colQty     = headers.findIndex(h => h.includes('số lượng') || h.includes('sl ban đầu') || h.includes('sl ban dau'));

            const rows: ImportRow[] = [];
            for (let i = headerIdx + 1; i < raw.length; i++) {
                const r = raw[i] as unknown[];
                const name = String(r[colName] ?? '').trim();
                if (!name) continue;
                rows.push({
                    name,
                    unit:       colUnit  >= 0 ? String(r[colUnit]  ?? '').trim() : '',
                    unitPrice:  colPrice >= 0 ? parsePrice(r[colPrice]) : 0,
                    note: '',
                    initialQty: colQty   >= 0 ? (parseInt(String(r[colQty] ?? '0'), 10) || 0) : 0,
                });
            }
            setImportRows(rows);
        };
        reader.readAsBinaryString(file);
    }

    async function handleImport() {
        if (!importRows.length) return;
        setImporting(true);
        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        const today = new Date().toISOString().slice(0, 10);
        for (const row of importRows) {
            try {
                const newItem = await vppApi.createItem({ group: importGroup, name: row.name, unit: row.unit, unitPrice: row.unitPrice, minStock: 0, maxStock: 0, note: row.note });
                success++;
                if (row.initialQty > 0) {
                    try {
                        await vppApi.createImport({ importDate: today, note: 'Nhập ban đầu từ Excel', lines: [{ itemId: newItem.id, quantity: row.initialQty, unitPrice: row.unitPrice }] });
                    } catch { /* non-fatal */ }
                }
            } catch (e: unknown) {
                failed++;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data = (e as any)?.response?.data;
                const msg: string = data?.Message ?? data?.message ?? (e as any)?.message ?? 'Unknown error';
                if (errors.length < 3) errors.push(`"${row.name}": ${msg}`);
            }
        }

        setImporting(false);

        // Invalidate trước khi đóng modal — TQ sẽ refetch ngay khi component còn mounted
        await qc.invalidateQueries({ queryKey: ['vpp-items'] });

        setImportOpen(false);
        setImportRows([]);
        setImportFileName('');

        if (failed === 0) {
            toast.success(`Đã nhập ${success} vật tư thành công`);
        } else {
            toast(`✅ ${success} thành công  ❌ ${failed} thất bại\n${errors.join('\n')}`, {
                duration: 8000,
                style: { maxWidth: 480, whiteSpace: 'pre-line' },
            });
        }
    }

    function downloadTemplate() {
        const headers = [
            'Tên VPP\n(cùng sản phẩm khác giá bắt buộc tạo mã mới)',
            'Đơn vị tính',
            'Giá nhập',
            'Số lượng ban đầu\n(tùy chọn — tự tạo phiếu nhập)',
        ];
        const example = ['Bút bi Thiên Long', 'Hộp (20 cây)', 18000, 10];
        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        ws['!cols'] = [44, 18, 14, 24].map(w => ({ wch: w }));
        ws['!rows'] = [{ hpt: 44 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Danh mục VPP');
        XLSX.writeFile(wb, 'Template_VatTu_VPP.xlsx');
    }

    function exportExcel() {
        const headers = [
            'Mã vật tư',
            'Tên VPP\n(cùng sản phẩm khác giá bắt buộc tạo mã mới)',
            'Đơn vị tính',
            'giá nhập',
            'VAT\n(nếu có)',
            'Thành tiền',
        ];
        const dataRows = items.map(it => [
            it.code,
            it.name,
            it.unit,
            it.unitPrice,
            it.vatRate > 0 ? +(it.vatRate * 100).toFixed(0) + '%' : '',
            Math.round(it.unitPrice * (1 + it.vatRate)),
        ]);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
        ws['!cols'] = [14, 42, 14, 14, 10, 14].map(w => ({ wch: w }));
        // Wrap text for header row
        ws['!rows'] = [{ hpt: 36 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Danh mục VPP');
        const now = new Date();
        XLSX.writeFile(wb, `danh-muc-vpp-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}.xlsx`);
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Filter Bar */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <FilterListRoundedIcon sx={{ color: GREEN, fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Bộ lọc</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        size="small" placeholder="Tìm mã / tên vật tư..."
                        value={searchInput} onChange={e => setSearchInput(e.target.value)}
                        sx={{ ...fieldSx, width: 280 }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }}
                    />
                    <TextField select size="small" label="Nhóm" value={group} onChange={e => setGroup(e.target.value)} sx={{ ...fieldSx, minWidth: 180 }}>
                        <MenuItem value="">Tất cả nhóm</MenuItem>
                        {VPP_GROUPS.map(g => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
                    </TextField>
                    <Box sx={{ flex: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', px: 2, py: 0.75 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }} />
                        <Typography sx={{ fontWeight: 700, color: GREEN, fontSize: 13 }}>{totalItems} vật tư</Typography>
                    </Box>
                    <Button variant="outlined" startIcon={<FileUploadRoundedIcon />} onClick={() => { setImportRows([]); setImportFileName(''); setImportOpen(true); }}
                        sx={{ borderColor: BORDER, color: '#475569', '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }, borderRadius: '12px', textTransform: 'none', fontWeight: 700, height: 40 }}>
                        Nhập Excel
                    </Button>
                    <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={exportExcel} disabled={items.length === 0}
                        sx={{ borderColor: '#22c55e', color: '#15803d', '&:hover': { bgcolor: '#f0fdf4', borderColor: '#16a34a' }, borderRadius: '12px', textTransform: 'none', fontWeight: 700, height: 40 }}>
                        Xuất Excel
                    </Button>
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => handleOpen()}
                        sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#065f35' }, borderRadius: '12px', textTransform: 'none', fontWeight: 700, height: 40 }}>
                        Thêm vật tư
                    </Button>
                </Box>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, overflow: 'auto', flex: 1, minHeight: 0, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {['Mã', 'Nhóm', 'Tên vật tư', 'ĐVT', 'Giá nhập', 'VAT', 'Tổng tiền', 'Tồn min', 'Tồn max', 'Thao tác'].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 800, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8, bgcolor: GREEN }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                        ) : items.length === 0 ? (
                            <TableRow><TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                                <Typography sx={{ fontWeight: 700, color: '#64748b', fontSize: 14 }}>Chưa có vật tư nào</Typography>
                            </TableCell></TableRow>
                        ) : items.map((item, i) => {
                            const gc = GROUP_COLORS[item.group] ?? { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
                            return (
                                <TableRow key={item.id} sx={{ bgcolor: item.isActive === false ? '#f8fafc' : i % 2 === 0 ? '#fff' : '#fbfefc', opacity: item.isActive === false ? 0.6 : 1, '&:hover': { bgcolor: item.isActive === false ? '#f1f5f9 !important' : '#f0fdf4 !important' }, transition: 'background 0.15s', '& > *': { borderBottom: '1px solid #f1f5f9 !important' } }}>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.4, borderRadius: '6px', display: 'inline-block' }}>{item.code}</Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Chip label={VPP_GROUPS.find(g => g.value === item.group)?.label ?? item.group} size="small"
                                            sx={{ fontSize: 11, fontWeight: 700, bgcolor: gc.bg, color: gc.color, border: `1px solid ${gc.border}`, borderRadius: '8px', height: 22 }} />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, maxWidth: 220, fontSize: 13, py: 1.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                            {item.name}
                                            {item.isActive === false && <Chip label="Ngừng nhập" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '6px' }} />}
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ color: '#64748b', py: 1.5 }}>{item.unit}</TableCell>
                                    <TableCell sx={{ color: '#0f766e', fontWeight: 700, py: 1.5 }}>{item.unitPrice.toLocaleString('vi-VN')}đ</TableCell>
                                    <TableCell sx={{ color: '#64748b', py: 1.5 }}>{(item.vatRate * 100).toFixed(0)}%</TableCell>
                                    <TableCell sx={{ color: '#7c3aed', fontWeight: 700, py: 1.5 }}>{Math.round(item.unitPrice * (1 + item.vatRate)).toLocaleString('vi-VN')}đ</TableCell>
                                    <TableCell align="center" sx={{ py: 1.5 }}>{item.minStock}</TableCell>
                                    <TableCell align="center" sx={{ py: 1.5 }}>{item.maxStock}</TableCell>
                                    <TableCell align="right" sx={{ py: 1.5 }}>
                                        <Tooltip title={item.isActive !== false ? 'Đặt ngừng nhập' : 'Kích hoạt lại'} arrow>
                                            <IconButton size="small" onClick={() => toggleMut.mutate(item.id)} disabled={toggleMut.isPending}
                                                sx={{ color: item.isActive !== false ? '#22c55e' : '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { bgcolor: item.isActive !== false ? alpha('#22c55e', 0.08) : alpha('#94a3b8', 0.08) } }}>
                                                {item.isActive !== false ? <ToggleOnRoundedIcon sx={{ fontSize: 20 }} /> : <ToggleOffRoundedIcon sx={{ fontSize: 20 }} />}
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Sửa" arrow>
                                            <IconButton size="small" onClick={() => handleOpen(item)} sx={{ color: '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { color: '#2563eb', bgcolor: alpha('#2563eb', 0.08) } }}>
                                                <EditRoundedIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Xóa" arrow>
                                            <IconButton size="small" onClick={() => setDeleteId(item.id)} sx={{ color: '#94a3b8', width: 30, height: 30, borderRadius: '8px', '&:hover': { color: '#dc2626', bgcolor: alpha('#dc2626', 0.08) } }}>
                                                <DeleteRoundedIcon sx={{ fontSize: 16 }} />
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
                count={totalItems}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                rowsPerPageOptions={[10, 20, 50, 100]}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                labelRowsPerPage="Hiển thị:"
                sx={{ border: `1px solid ${BORDER}`, borderTop: 0, borderRadius: `0 0 ${CARD_RADIUS} ${CARD_RADIUS}`, bgcolor: '#fff' }}
            />

            {/* Form Dialog */}
            <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, p: 1 } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>{editItem ? 'Sửa vật tư' : 'Thêm vật tư mới'}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
                    <TextField select size="small" label="Nhóm vật tư" value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} fullWidth sx={fieldSx}>
                        {VPP_GROUPS.map(g => <MenuItem key={g.value} value={g.value}>{g.value} — {g.label}</MenuItem>)}
                    </TextField>
                    <TextField label="Tên vật tư *" size="small" fullWidth value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} sx={fieldSx} />
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <TextField label="Đơn vị tính *" size="small" sx={{ ...fieldSx, flex: 1 }} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
                        <TextField label="Giá nhập (đ)" size="small" type="number" sx={{ ...fieldSx, flex: 1 }} value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: +e.target.value }))} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <TextField label="Tồn tối thiểu" size="small" type="number" sx={{ ...fieldSx, flex: 1 }} value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: +e.target.value }))} />
                        <TextField label="Tồn tối đa" size="small" type="number" sx={{ ...fieldSx, flex: 1 }} value={form.maxStock} onChange={e => setForm(f => ({ ...f, maxStock: +e.target.value }))} />
                    </Box>
                    {!editItem && (
                        <TextField label="Số lượng ban đầu" size="small" type="number"
                            value={initialQty === 0 ? '' : initialQty}
                            onChange={e => setInitialQty(e.target.value === '' ? 0 : Math.max(0, +e.target.value))}
                            onBlur={() => setInitialQty(q => Math.max(0, q))}
                            helperText={initialQty > 0 ? `Sẽ tự tạo phiếu nhập ${initialQty} ${form.unit || 'cái'} với đơn giá trên` : 'Tùy chọn — để trống nếu chưa có hàng'}
                            sx={fieldSx} />
                    )}
                    <TextField label="Ghi chú" size="small" fullWidth multiline rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} sx={fieldSx} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={handleClose} disabled={isPending} sx={{ textTransform: 'none', borderRadius: '12px', borderColor: '#e2e8f0', color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" onClick={handleSubmit} disabled={isPending || !form.name.trim() || !form.unit.trim()}
                        sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#065f35' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}>
                        {isPending ? 'Đang lưu...' : editItem ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Import Dialog */}
            <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, p: 1 } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <FileUploadRoundedIcon sx={{ color: GREEN }} />
                    Nhập danh mục từ Excel
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>
                    {/* Download template */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', px: 2.5, py: 1.5 }}>
                        <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#15803d' }}>Tải file mẫu để nhập đúng định dạng</Typography>
                            <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.2 }}>Điền dữ liệu vào template rồi upload bên dưới</Typography>
                        </Box>
                        <Button startIcon={<DownloadRoundedIcon />} onClick={downloadTemplate}
                            sx={{ bgcolor: '#fff', border: '1px solid #bbf7d0', color: '#15803d', textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: '#dcfce7' }, whiteSpace: 'nowrap' }}>
                            Tải template
                        </Button>
                    </Box>

                    {/* Group selector */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField select size="small" label="Nhóm vật tư *" value={importGroup} onChange={e => setImportGroup(e.target.value)} sx={{ ...fieldSx, minWidth: 240 }}>
                            {VPP_GROUPS.map(g => <MenuItem key={g.value} value={g.value}>{g.value} — {g.label}</MenuItem>)}
                        </TextField>
                        <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Tất cả dòng nhập sẽ thuộc nhóm này</Typography>
                    </Box>

                    {/* File drop zone */}
                    <Box
                        component="label"
                        sx={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 1.5, border: `2px dashed ${importFileName ? GREEN : BORDER}`,
                            borderRadius: '14px', py: 3.5, cursor: 'pointer', bgcolor: importFileName ? '#f0fdf4' : '#fafafa',
                            transition: 'all 0.2s', '&:hover': { borderColor: GREEN, bgcolor: '#f0fdf4' },
                        }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImportFile(f); }}
                    >
                        <input type="file" accept=".xlsx,.xls" hidden onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ''; }} />
                        {importFileName ? (
                            <>
                                <InsertDriveFileRoundedIcon sx={{ fontSize: 36, color: GREEN }} />
                                <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{importFileName}</Typography>
                                <Typography sx={{ fontSize: 12, color: '#64748b' }}>{importRows.length} dòng dữ liệu được đọc</Typography>
                            </>
                        ) : (
                            <>
                                <FileUploadRoundedIcon sx={{ fontSize: 36, color: '#94a3b8' }} />
                                <Typography sx={{ fontWeight: 600, color: '#475569', fontSize: 14 }}>Kéo thả file Excel vào đây hoặc click để chọn</Typography>
                                <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Hỗ trợ .xlsx, .xls</Typography>
                            </>
                        )}
                    </Box>

                    {/* Preview table */}
                    {importRows.length > 0 && (
                        <Box>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
                                Xem trước — {importRows.length} vật tư
                            </Typography>
                            <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '12px', maxHeight: 260, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {['#', 'Tên vật tư', 'ĐVT', 'Giá nhập'].map(h => (
                                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f8fafc', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '2px solid #e2e8f0' }}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {importRows.map((r, i) => (
                                            <TableRow key={i} sx={{ '&:last-child td': { border: 0 }, bgcolor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                <TableCell sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>{i + 1}</TableCell>
                                                <TableCell sx={{ fontWeight: 500 }}>{r.name}</TableCell>
                                                <TableCell sx={{ color: '#64748b' }}>{r.unit || '—'}</TableCell>
                                                <TableCell sx={{ color: '#0f766e', fontWeight: 600 }}>{r.unitPrice ? r.unitPrice.toLocaleString('vi-VN') + 'đ' : '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setImportOpen(false)} disabled={importing}
                        sx={{ textTransform: 'none', borderRadius: '12px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" onClick={handleImport} disabled={importing || importRows.length === 0}
                        sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#065f35' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}>
                        {importing ? `Đang nhập...` : `Nhập ${importRows.length} vật tư`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, p: 1 } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <Box sx={{ bgcolor: '#fff7ed', border: '1px dashed #fed7aa', borderRadius: '12px', p: 2 }}>
                        <Typography sx={{ fontSize: 13.5, color: '#c2410c', lineHeight: 1.6 }}>
                            Bạn có chắc muốn xóa vật tư này? Thao tác này <strong>không thể hoàn tác</strong>.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setDeleteId(null)} sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, borderColor: '#e2e8f0', color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" color="error" onClick={() => deleteId && deleteMut.mutate(deleteId)} disabled={deleteMut.isPending} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}>
                        {deleteMut.isPending ? 'Đang xóa...' : 'Xóa'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
