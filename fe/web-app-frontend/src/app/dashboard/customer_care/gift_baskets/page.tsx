'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add,
    CloudUpload,
    Delete,
    Edit,
    Refresh,
    Search,
    CheckCircle,
    Cancel,
    ImageOutlined,
    Inventory2,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ordersApi } from '@/features/orders/api/orders.api';
import {
    giftBasketApi,
    GiftBasketDTO,
    GiftCodeMappingDTO,
    SapoDashboardDTO,
    GiftCodeChangeRequestDTO,
    SapoImportDTO,
} from '@/features/gift-basket/api/gift-basket.api';
import PageHeader from '@/components/common/PageHeader';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtVnd = (n: number) =>
    n?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) ?? '0 ₫';

const fmtDate = (s?: string) => {
    if (!s) return '';
    return new Date(s).toLocaleDateString('vi-VN');
};

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
    if (value !== index) return null;
    return <Box sx={{ pt: 2 }}>{children}</Box>;
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function GiftBasketsPage() {
    const [tab, setTab] = useState(0);
    const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

    useEffect(() => {
        ordersApi.getBranches().then((res: any) => {
            if (res?.content) setBranches(res.content);
        });
    }, []);

    return (
        <Box>
            <PageHeader icon={<Inventory2 />} title="Quản lý giỏ quà" subtitle="Thư viện giỏ quà, dashboard Sapo, yêu cầu đổi mã" />
            <Paper sx={{ mt: 2 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                    <Tab label="Danh sách giỏ" />
                    <Tab label="Dashboard Sapo" />
                    <Tab label="Yêu cầu đổi mã" />
                    <Tab label="Bảng quy đổi mã" />
                </Tabs>
                <Box sx={{ p: { xs: 1, md: 2 } }}>
                    <TabPanel value={tab} index={0}><BasketListTab branches={branches} /></TabPanel>
                    <TabPanel value={tab} index={1}><SapoDashboardTab /></TabPanel>
                    <TabPanel value={tab} index={2}><ChangeRequestTab branches={branches} /></TabPanel>
                    <TabPanel value={tab} index={3}><CodeMappingTab branches={branches} /></TabPanel>
                </Box>
            </Paper>
        </Box>
    );
}

// ─── TAB 1: BASKET LIST ───────────────────────────────────────────────────────

function BasketListTab({ branches }: { branches: { id: number; name: string }[] }) {
    const [rows, setRows] = useState<GiftBasketDTO[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [branchId, setBranchId] = useState<number | ''>('');
    const [statusFilter, setStatusFilter] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Partial<GiftBasketDTO> | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<GiftBasketDTO | null>(null);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadField, setUploadField] = useState<'frontImageUrl' | 'backImageUrl' | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await giftBasketApi.getList({ page: page + 1, pageSize, search: search || undefined, branchId: branchId || undefined, status: statusFilter || undefined });
            if (res.content) { setRows(res.content.items); setTotal(res.content.totalItems); }
        } catch { toast.error('Lỗi tải danh sách'); }
        finally { setLoading(false); }
    }, [page, pageSize, search, branchId, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        setEditTarget({ status: 'active', price: 0, baseCode: '', basketName: '', currentCode: '' });
        setEditOpen(true);
    };

    const openEdit = (row: GiftBasketDTO) => { setEditTarget({ ...row }); setEditOpen(true); };

    const handleSave = async () => {
        if (!editTarget) return;
        setSaving(true);
        try {
            if (editTarget.id) { await giftBasketApi.update(editTarget as any); toast.success('Đã cập nhật'); }
            else { await giftBasketApi.create(editTarget as any); toast.success('Đã tạo mới'); }
            setEditOpen(false);
            load();
        } catch (e: any) { toast.error(e?.response?.data?.message || 'Lỗi lưu'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await giftBasketApi.delete(deleteTarget.id);
            toast.success('Đã xóa');
            setDeleteTarget(null);
            load();
        } catch { toast.error('Lỗi xóa'); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadField) return;
        try {
            const res = await giftBasketApi.uploadImage(file);
            if (res.content) setEditTarget((prev) => prev ? { ...prev, [uploadField]: res.content } : prev);
        } catch { toast.error('Lỗi tải ảnh'); }
        e.target.value = '';
    };

    const setField = (field: string, value: any) =>
        setEditTarget((p) => p ? { ...p, [field]: value } : p);

    return (
        <Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder="Tìm mã / tên giỏ…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    sx={{ minWidth: 220 }}
                    slotProps={{ input: { startAdornment: <Search sx={{ mr: 0.5, color: 'text.secondary' }} /> } }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Chi nhánh</InputLabel>
                    <Select label="Chi nhánh" value={branchId} onChange={(e) => { setBranchId(e.target.value as any); setPage(0); }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Trạng thái</InputLabel>
                    <Select label="Trạng thái" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="active">Đang dùng</MenuItem>
                        <MenuItem value="inactive">Ngừng dùng</MenuItem>
                    </Select>
                </FormControl>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Làm mới"><IconButton onClick={load}><Refresh /></IconButton></Tooltip>
                <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Thêm giỏ</Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell>Mã giỏ</TableCell>
                            <TableCell>Tên giỏ</TableCell>
                            <TableCell>Mã hiện tại</TableCell>
                            <TableCell>Mã gốc</TableCell>
                            <TableCell>Chi nhánh</TableCell>
                            <TableCell align="right">Giá</TableCell>
                            <TableCell>Ngày hiệu lực</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell align="center">Ảnh</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={10} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow><TableCell colSpan={10} align="center">Không có dữ liệu</TableCell></TableRow>
                        ) : rows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{row.basketUid}</Typography></TableCell>
                                <TableCell>{row.basketName}</TableCell>
                                <TableCell><Chip label={row.currentCode} size="small" color="primary" /></TableCell>
                                <TableCell><Typography variant="caption">{row.baseCode}</Typography></TableCell>
                                <TableCell>{row.branchName ?? '—'}</TableCell>
                                <TableCell align="right">{fmtVnd(row.price)}</TableCell>
                                <TableCell>{row.effectiveDate ?? '—'}</TableCell>
                                <TableCell>
                                    <Chip label={row.status === 'active' ? 'Đang dùng' : 'Ngừng'} size="small" color={row.status === 'active' ? 'success' : 'default'} />
                                </TableCell>
                                <TableCell align="center">
                                    {row.frontImageUrl
                                        ? <Tooltip title={<Box component="img" src={row.frontImageUrl} sx={{ maxWidth: 200 }} />}><ImageOutlined fontSize="small" color="primary" /></Tooltip>
                                        : '—'}
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => openEdit(row)}><Edit fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}><Delete fontSize="small" /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={pageSize} onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 20, 50]} labelRowsPerPage="Hiển thị:" />

            {/* Create / Edit dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editTarget?.id ? 'Sửa giỏ quà' : 'Thêm giỏ quà'}</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" label="Tên giỏ *" value={editTarget?.basketName ?? ''} onChange={(e) => setField('basketName', e.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField fullWidth size="small" label="Mã gốc *" value={editTarget?.baseCode ?? ''} onChange={(e) => setField('baseCode', e.target.value.toUpperCase())} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField fullWidth size="small" label="Mã hiện tại *" value={editTarget?.currentCode ?? ''} onChange={(e) => setField('currentCode', e.target.value.toUpperCase())} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <TextField fullWidth size="small" label="Giá (VNĐ)" type="number" value={editTarget?.price ?? 0} onChange={(e) => setField('price', Number(e.target.value))} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <TextField fullWidth size="small" label="Ngày hiệu lực" value={editTarget?.effectiveDate ?? ''} onChange={(e) => setField('effectiveDate', e.target.value)} placeholder="VD: 2025-01" />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Chi nhánh</InputLabel>
                                <Select label="Chi nhánh" value={editTarget?.branchId ?? ''} onChange={(e) => setField('branchId', e.target.value || undefined)}>
                                    <MenuItem value="">Không chọn</MenuItem>
                                    {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Trạng thái</InputLabel>
                                <Select label="Trạng thái" value={editTarget?.status ?? 'active'} onChange={(e) => setField('status', e.target.value)}>
                                    <MenuItem value="active">Đang dùng</MenuItem>
                                    <MenuItem value="inactive">Ngừng dùng</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField fullWidth size="small" label="Chữ overlay ảnh" value={editTarget?.imageOverlayText ?? ''} onChange={(e) => setField('imageOverlayText', e.target.value)} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Thông báo" value={editTarget?.notice ?? ''} onChange={(e) => setField('notice', e.target.value)} multiline rows={2} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Ghi chú nội bộ" value={editTarget?.note ?? ''} onChange={(e) => setField('note', e.target.value)} />
                        </Grid>
                        <Grid size={12}>
                            <Divider sx={{ my: 1 }}>Ảnh</Divider>
                        </Grid>
                        {(['frontImageUrl', 'backImageUrl'] as const).map((field) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={field}>
                                <Stack spacing={1}>
                                    <Typography variant="caption" color="text.secondary">
                                        {field === 'frontImageUrl' ? 'Ảnh mặt trước' : 'Ảnh mặt sau'}
                                    </Typography>
                                    {editTarget?.[field] && (
                                        <Box component="img" src={editTarget[field] as string} sx={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
                                    )}
                                    <Button size="small" variant="outlined" startIcon={<CloudUpload />} onClick={() => { setUploadField(field); fileInputRef.current?.click(); }}>
                                        {editTarget?.[field] ? 'Đổi ảnh' : 'Tải ảnh lên'}
                                    </Button>
                                </Stack>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Hủy</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? <CircularProgress size={18} /> : 'Lưu'}
                    </Button>
                </DialogActions>
            </Dialog>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />

            {/* Delete confirm */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>Xóa giỏ quà?</DialogTitle>
                <DialogContent>
                    <Typography>Xóa <b>{deleteTarget?.basketName}</b> ({deleteTarget?.currentCode})?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Hủy</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Xóa</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ─── TAB 2: SAPO DASHBOARD ────────────────────────────────────────────────────

function SapoDashboardTab() {
    const [dashboard, setDashboard] = useState<SapoDashboardDTO | null>(null);
    const [filterKey, setFilterKey] = useState('all');
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [reportDate, setReportDate] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadDashboard = useCallback(async (key = filterKey) => {
        setLoading(true);
        try {
            const res = await giftBasketApi.getSapoDashboard(key);
            if (res.content) setDashboard(res.content);
        } catch { toast.error('Lỗi tải dashboard'); }
        finally { setLoading(false); }
    }, [filterKey]);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!reportDate) { toast.error('Vui lòng nhập ngày báo cáo trước khi import'); return; }
        setImporting(true);
        try {
            const res = await giftBasketApi.importSapo(file, reportDate);
            if (res.status === 'Success') {
                toast.success('Import Sapo thành công');
                if (res.content) setDashboard(res.content);
            } else { toast.error(res.message ?? 'Lỗi import'); }
        } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Lỗi import'); }
        finally { setImporting(false); e.target.value = ''; }
    };

    const handleDeleteImport = async (batchId: string) => {
        if (!confirm('Xóa lô import này?')) return;
        try {
            await giftBasketApi.deleteSapoImport(batchId);
            toast.success('Đã xóa');
            loadDashboard();
        } catch { toast.error('Lỗi xóa'); }
    };

    const FILTER_OPTIONS = [
        { key: 'today', label: 'Hôm nay' },
        { key: 'yesterday', label: 'Hôm qua' },
        { key: '7days', label: '7 ngày' },
        { key: '30days', label: '30 ngày' },
        { key: 'month', label: 'Tháng này' },
        { key: 'all', label: 'Tất cả' },
    ];

    return (
        <Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
                {FILTER_OPTIONS.map((opt) => (
                    <Chip key={opt.key} label={opt.label} color={filterKey === opt.key ? 'primary' : 'default'} onClick={() => { setFilterKey(opt.key); loadDashboard(opt.key); }} clickable />
                ))}
                <Box sx={{ flex: 1 }} />
                <TextField size="small" label="Ngày báo cáo" value={reportDate} onChange={(e) => setReportDate(e.target.value)} placeholder="2025-01-15" sx={{ width: 160 }} />
                <Button variant="contained" startIcon={importing ? <CircularProgress size={16} /> : <CloudUpload />} onClick={() => fileInputRef.current?.click()} disabled={importing}>
                    Import Sapo
                </Button>
                <Tooltip title="Làm mới"><IconButton onClick={() => loadDashboard()}><Refresh /></IconButton></Tooltip>
            </Box>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImport} />

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : dashboard ? (
                <>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {[
                            { label: 'Doanh thu thuần', value: fmtVnd(dashboard.totalNetRevenue) },
                            { label: 'Doanh thu', value: fmtVnd(dashboard.totalRevenue) },
                            { label: 'Số đơn', value: dashboard.totalOrders.toLocaleString() },
                            { label: 'SL bán', value: dashboard.totalQty.toLocaleString() },
                        ].map((kpi) => (
                            <Grid size={{ xs: 6, sm: 3 }} key={kpi.label}>
                                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{kpi.value}</Typography>
                                    <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Theo mã giỏ</Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 340 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Mã</TableCell>
                                            <TableCell align="right">DT thuần</TableCell>
                                            <TableCell align="right">Đơn</TableCell>
                                            <TableCell align="right">SL</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dashboard.byCode.map((b) => (
                                            <TableRow key={b.key} hover>
                                                <TableCell><Typography variant="caption">{b.label}</Typography></TableCell>
                                                <TableCell align="right">{fmtVnd(b.netRevenue)}</TableCell>
                                                <TableCell align="right">{b.orders}</TableCell>
                                                <TableCell align="right">{b.qty}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Theo chi nhánh</Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 340 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Chi nhánh</TableCell>
                                            <TableCell align="right">DT thuần</TableCell>
                                            <TableCell align="right">Đơn</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dashboard.byBranch.map((b) => (
                                            <TableRow key={b.key} hover>
                                                <TableCell>{b.label}</TableCell>
                                                <TableCell align="right">{fmtVnd(b.netRevenue)}</TableCell>
                                                <TableCell align="right">{b.orders}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Lịch sử import gần đây</Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Batch ID</TableCell>
                                        <TableCell>Ngày báo cáo</TableCell>
                                        <TableCell align="right">Dòng</TableCell>
                                        <TableCell align="right">DT thuần</TableCell>
                                        <TableCell>Thời gian import</TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {dashboard.recentImports.map((imp: SapoImportDTO) => (
                                        <TableRow key={imp.id} hover>
                                            <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{imp.importBatchId}</Typography></TableCell>
                                            <TableCell>{imp.reportDate}</TableCell>
                                            <TableCell align="right">{imp.rowCount}</TableCell>
                                            <TableCell align="right">{fmtVnd(imp.netRevenue)}</TableCell>
                                            <TableCell>{fmtDate(imp.uploadedAt)}</TableCell>
                                            <TableCell>
                                                <Tooltip title="Xóa lô này">
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteImport(imp.importBatchId)}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </>
            ) : null}
        </Box>
    );
}

// ─── TAB 3: CODE CHANGE REQUESTS ─────────────────────────────────────────────

function ChangeRequestTab({ branches }: { branches: { id: number; name: string }[] }) {
    const [rows, setRows] = useState<GiftCodeChangeRequestDTO[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [branchId, setBranchId] = useState<number | ''>('');
    const [createOpen, setCreateOpen] = useState(false);
    const [handleOpen, setHandleOpen] = useState(false);
    const [selected, setSelected] = useState<GiftCodeChangeRequestDTO | null>(null);
    const [form, setForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadField, setUploadField] = useState<'frontImageUrl' | 'backImageUrl' | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await giftBasketApi.getChangeRequests({ page: page + 1, pageSize, status: statusFilter || undefined, branchId: branchId || undefined });
            if (res.content) { setRows(res.content.items); setTotal(res.content.totalItems); }
        } catch { toast.error('Lỗi tải danh sách'); }
        finally { setLoading(false); }
    }, [page, pageSize, statusFilter, branchId]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        setSaving(true);
        try {
            await giftBasketApi.createChangeRequest(form);
            toast.success('Đã tạo yêu cầu');
            setCreateOpen(false);
            load();
        } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Lỗi'); }
        finally { setSaving(false); }
    };

    const openHandle = (row: GiftCodeChangeRequestDTO) => {
        setSelected(row);
        setForm({ id: row.id, status: row.status, resultNote: row.resultNote ?? '' });
        setHandleOpen(true);
    };

    const handleHandle = async () => {
        setSaving(true);
        try {
            await giftBasketApi.handleChangeRequest(form);
            toast.success('Đã cập nhật');
            setHandleOpen(false);
            load();
        } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Lỗi'); }
        finally { setSaving(false); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadField) return;
        try {
            const res = await giftBasketApi.uploadImage(file);
            if (res.content) setForm((p: any) => ({ ...p, [uploadField]: res.content }));
        } catch { toast.error('Lỗi tải ảnh'); }
        e.target.value = '';
    };

    const statusChip = (s: string) => {
        if (s === 'done') return <Chip icon={<CheckCircle />} label="Đã xử lý" color="success" size="small" />;
        if (s === 'rejected') return <Chip icon={<Cancel />} label="Từ chối" color="error" size="small" />;
        return <Chip label="Chờ xử lý" color="warning" size="small" />;
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Trạng thái</InputLabel>
                    <Select label="Trạng thái" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="pending">Chờ xử lý</MenuItem>
                        <MenuItem value="done">Đã xử lý</MenuItem>
                        <MenuItem value="rejected">Từ chối</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Chi nhánh</InputLabel>
                    <Select label="Chi nhánh" value={branchId} onChange={(e) => { setBranchId(e.target.value as any); setPage(0); }}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Làm mới"><IconButton onClick={load}><Refresh /></IconButton></Tooltip>
                <Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ priority: 'normal' }); setCreateOpen(true); }}>Gửi yêu cầu</Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell>Mã yêu cầu</TableCell>
                            <TableCell>Chi nhánh</TableCell>
                            <TableCell>Mã / Tên giỏ</TableCell>
                            <TableCell>Lý do</TableCell>
                            <TableCell>Ưu tiên</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Ngày tạo</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center">Không có dữ liệu</TableCell></TableRow>
                        ) : rows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{row.requestUid}</Typography></TableCell>
                                <TableCell>{row.branchName ?? '—'}</TableCell>
                                <TableCell>{row.basketCodeOrName}</TableCell>
                                <TableCell sx={{ maxWidth: 200 }}><Typography variant="caption" noWrap>{row.reason}</Typography></TableCell>
                                <TableCell>
                                    <Chip label={row.priority === 'urgent' ? 'Gấp' : 'Bình thường'} size="small" color={row.priority === 'urgent' ? 'error' : 'default'} />
                                </TableCell>
                                <TableCell>{statusChip(row.status)}</TableCell>
                                <TableCell>{fmtDate(row.createdAt)}</TableCell>
                                <TableCell>
                                    <Tooltip title="Xử lý"><IconButton size="small" onClick={() => openHandle(row)}><Edit fontSize="small" /></IconButton></Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={pageSize} onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 20, 50]} labelRowsPerPage="Hiển thị:" />

            {/* Create request dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Gửi yêu cầu đổi mã</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Chi nhánh</InputLabel>
                                <Select label="Chi nhánh" value={form.branchId ?? ''} onChange={(e) => setForm((p: any) => ({ ...p, branchId: e.target.value || undefined }))}>
                                    <MenuItem value="">Không chọn</MenuItem>
                                    {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Ưu tiên</InputLabel>
                                <Select label="Ưu tiên" value={form.priority ?? 'normal'} onChange={(e) => setForm((p: any) => ({ ...p, priority: e.target.value }))}>
                                    <MenuItem value="normal">Bình thường</MenuItem>
                                    <MenuItem value="urgent">Gấp</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Mã hoặc tên giỏ *" value={form.basketCodeOrName ?? ''} onChange={(e) => setForm((p: any) => ({ ...p, basketCodeOrName: e.target.value }))} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Lý do *" multiline rows={2} value={form.reason ?? ''} onChange={(e) => setForm((p: any) => ({ ...p, reason: e.target.value }))} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Ghi chú" value={form.note ?? ''} onChange={(e) => setForm((p: any) => ({ ...p, note: e.target.value }))} />
                        </Grid>
                        {(['frontImageUrl', 'backImageUrl'] as const).map((field) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={field}>
                                <Stack spacing={1}>
                                    <Typography variant="caption">{field === 'frontImageUrl' ? 'Ảnh mặt trước' : 'Ảnh mặt sau'}</Typography>
                                    {form[field] && <Box component="img" src={form[field]} sx={{ width: '100%', maxHeight: 100, objectFit: 'contain' }} />}
                                    <Button size="small" variant="outlined" startIcon={<CloudUpload />} onClick={() => { setUploadField(field); fileInputRef.current?.click(); }}>Tải ảnh</Button>
                                </Stack>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving}>{saving ? <CircularProgress size={18} /> : 'Gửi'}</Button>
                </DialogActions>
            </Dialog>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />

            {/* Handle dialog */}
            <Dialog open={handleOpen} onClose={() => setHandleOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Xử lý yêu cầu {selected?.requestUid}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Kết quả</InputLabel>
                            <Select label="Kết quả" value={form.status ?? 'pending'} onChange={(e) => setForm((p: any) => ({ ...p, status: e.target.value }))}>
                                <MenuItem value="pending">Chờ xử lý</MenuItem>
                                <MenuItem value="done">Đã xử lý</MenuItem>
                                <MenuItem value="rejected">Từ chối</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField fullWidth size="small" label="Ghi chú kết quả" multiline rows={2} value={form.resultNote ?? ''} onChange={(e) => setForm((p: any) => ({ ...p, resultNote: e.target.value }))} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHandleOpen(false)}>Hủy</Button>
                    <Button variant="contained" onClick={handleHandle} disabled={saving}>{saving ? <CircularProgress size={18} /> : 'Lưu'}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ─── TAB 4: CODE MAPPING ──────────────────────────────────────────────────────

function CodeMappingTab({ branches }: { branches: { id: number; name: string }[] }) {
    const [rows, setRows] = useState<GiftCodeMappingDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [branchId, setBranchId] = useState<number | ''>('');
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await giftBasketApi.getCodeMappings(branchId || undefined);
            if (res.content) setRows(res.content);
        } catch { toast.error('Lỗi tải bảng mã'); }
        finally { setLoading(false); }
    }, [branchId]);

    useEffect(() => { load(); }, [load]);

    const filtered = search
        ? rows.filter((r) =>
            r.code.toLowerCase().includes(search.toLowerCase()) ||
            r.baseCode.toLowerCase().includes(search.toLowerCase()) ||
            r.basketName.toLowerCase().includes(search.toLowerCase())
        )
        : rows;

    return (
        <Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder="Tìm mã…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{ input: { startAdornment: <Search sx={{ mr: 0.5, color: 'text.secondary' }} /> } }}
                    sx={{ minWidth: 200 }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Chi nhánh</InputLabel>
                    <Select label="Chi nhánh" value={branchId} onChange={(e) => setBranchId(e.target.value as any)}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <Tooltip title="Làm mới"><IconButton onClick={load}><Refresh /></IconButton></Tooltip>
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell>Mã hiện tại</TableCell>
                            <TableCell>Mã gốc</TableCell>
                            <TableCell>Tên giỏ</TableCell>
                            <TableCell>Chi nhánh</TableCell>
                            <TableCell>Nguồn</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Cập nhật</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center">Không có dữ liệu</TableCell></TableRow>
                        ) : filtered.map((row) => (
                            <TableRow key={row.id} hover sx={!row.active ? { opacity: 0.5 } : {}}>
                                <TableCell><Chip label={row.code} size="small" color={row.active ? 'primary' : 'default'} /></TableCell>
                                <TableCell><Typography variant="caption">{row.baseCode}</Typography></TableCell>
                                <TableCell>{row.basketName}</TableCell>
                                <TableCell>{row.branchName ?? '—'}</TableCell>
                                <TableCell><Typography variant="caption">{row.source}</Typography></TableCell>
                                <TableCell><Chip label={row.active ? 'Đang dùng' : 'Ngừng'} size="small" color={row.active ? 'success' : 'default'} /></TableCell>
                                <TableCell><Typography variant="caption">{fmtDate(row.updatedAt)}</Typography></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Hiển thị {filtered.length} / {rows.length} mã
            </Typography>
        </Box>
    );
}
