'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Alert, alpha, Box, Button, Chip, CircularProgress, Divider,
    FormControl, InputLabel, MenuItem, Paper, Select, Skeleton,
    Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import {
    Inventory2Rounded, FileUploadRounded, SwapHorizRounded,
    WarehouseRounded, RemoveShoppingCartRounded, BarChartRounded,
    PhotoCameraRounded, RefreshRounded, FileDownloadRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import {
    nxtApi, BRANCHES, CODE_TYPES, CANCEL_REASONS, ADJ_REASONS, OCR_URL,
    fmtRevenue, NxtGiftRow, NxtStockRow, NxtDashboard, NxtAdjLog,
    NxtSapoImportLog,
} from '@/features/nxt/api/nxt.api';
import PageHeader from '@/components/common/PageHeader';

const today = () => new Date().toLocaleDateString('sv-SE');
const fmtDate = (d?: string) => d ? d.split('-').reverse().join('/') : '';

// ─── Shared ───────────────────────────────────────────────────────────────────

function BranchSelect({ value, onChange, label = 'Chi nhánh', sx }: { value: string; onChange: (v: string) => void; label?: string; sx?: object }) {
    return (
        <FormControl size="small" sx={{ minWidth: 150, ...sx }}>
            <InputLabel>{label}</InputLabel>
            <Select value={value} label={label} onChange={e => onChange(e.target.value)}>
                {BRANCHES.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
            </Select>
        </FormControl>
    );
}

function OcrButton() {
    return (
        <Button size="small" startIcon={<PhotoCameraRounded />}
            onClick={() => window.open(OCR_URL, '_blank', 'noopener,noreferrer')}
            sx={{ mt: 1, bgcolor: '#073b32', color: '#fff', '&:hover': { bgcolor: '#0d634e' }, borderRadius: 2 }}>
            Chuyển ảnh thành text
        </Button>
    );
}

function PreviewTable({ rows, cols, empty = 'Chưa có dữ liệu.' }: { rows: Record<string, any>[]; cols: { key: string; label: string; right?: boolean; render?: (row: any) => React.ReactNode }[]; empty?: string }) {
    return (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: 360, mt: 1.5 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        {cols.map(c => <TableCell key={c.key} align={c.right ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 12 }}>{c.label}</TableCell>)}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0
                        ? <TableRow><TableCell colSpan={cols.length} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>{empty}</TableCell></TableRow>
                        : rows.map((row, i) => (
                            <TableRow key={i} hover>
                                {cols.map(c => <TableCell key={c.key} align={c.right ? 'right' : 'left'} sx={{ fontSize: 13 }}>{c.render ? c.render(row) : (row[c.key] ?? '')}</TableCell>)}
                            </TableRow>
                        ))
                    }
                </TableBody>
            </Table>
        </TableContainer>
    );
}

// ─── Tab: Tổng quan ───────────────────────────────────────────────────────────

function OverviewTab() {
    const [dateFrom, setDateFrom] = useState(today());
    const [dateTo, setDateTo] = useState(today());
    const [branch, setBranch] = useState('');
    const [rowFilter, setRowFilter] = useState('ALL');
    const [data, setData] = useState<NxtDashboard | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await nxtApi.dashboard({ dateFrom, dateTo, branch: branch || 'ALL', rowFilter });
            setData(d);
        } catch { toast.error('Lỗi tải tổng quan.'); }
        finally { setLoading(false); }
    }, [dateFrom, dateTo, branch, rowFilter]);

    useEffect(() => { load(); }, []);

    const summary = data?.summary;

    function exportCsv() {
        if (!data?.rows.length) { toast.error('Không có dữ liệu để xuất.'); return; }
        const headers = ['CN', 'Mã', 'Nhãn', 'Tồn đầu', 'Gói ra', 'Nhận CN', 'Chuyển CN', 'Hủy', 'Sapo bán', 'Tồn TT', 'DTT', 'Tồn SS', 'Tồn còn lại', 'Lệch', 'Gợi ý'];
        const rows = data.rows.map(r => [r.branch, r.itemCode, r.labels.join(' | '), r.beginQty, r.inQty, r.transferInQty, r.transferOutQty, r.cancelQty, r.outQty, r.stockQty, r.dttQty, r.compareQty, r.expectedQty, r.diff, r.diffReason]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `nxt-${dateFrom}.csv`; a.click();
    }

    return (
        <Box>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                <TextField label="Từ ngày" type="date" size="small" value={dateFrom} onChange={e => setDateFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="Đến ngày" type="date" size="small" value={dateTo} onChange={e => setDateTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Chi nhánh</InputLabel>
                    <Select value={branch} label="Chi nhánh" onChange={e => setBranch(e.target.value)}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {BRANCHES.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Bộ lọc</InputLabel>
                    <Select value={rowFilter} label="Bộ lọc" onChange={e => setRowFilter(e.target.value)}>
                        <MenuItem value="ALL">Tất cả</MenuItem>
                        <MenuItem value="DIFF">Chỉ dòng lệch</MenuItem>
                        <MenuItem value="CLEAN">Chỉ dòng khớp</MenuItem>
                        <MenuItem value="DTT">DTT/đã bán chưa lấy</MenuItem>
                    </Select>
                </FormControl>
                <Button variant="contained" startIcon={<RefreshRounded />} onClick={load} disabled={loading} sx={{ borderRadius: 2, bgcolor: '#073b32', '&:hover': { bgcolor: '#0d634e' } }}>
                    {loading ? <CircularProgress size={18} color="inherit" /> : 'Làm mới'}
                </Button>
                <Button variant="outlined" startIcon={<FileDownloadRounded />} onClick={exportCsv} sx={{ borderRadius: 2 }}>
                    Xuất CSV
                </Button>
            </Box>

            {/* KPIs */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 1.5, mb: 2 }}>
                {[
                    { label: 'Tồn đầu', val: summary?.beginQty ?? 0 },
                    { label: 'Gói ra', val: summary?.inQty ?? 0 },
                    { label: 'Nhận CN', val: summary?.transferInQty ?? 0 },
                    { label: 'Chuyển CN', val: summary?.transferOutQty ?? 0 },
                    { label: 'Hủy giỏ', val: summary?.cancelQty ?? 0 },
                    { label: 'Sapo bán', val: summary?.outQty ?? 0 },
                    { label: 'Tồn thực tế', val: summary?.stockQty ?? 0 },
                    { label: 'DTT/chưa lấy', val: summary?.dttQty ?? 0 },
                    { label: 'Dòng lệch', val: summary?.diffLines ?? 0, warn: (summary?.diffLines ?? 0) > 0 },
                    { label: 'Doanh thu', val: fmtRevenue(summary?.revenue ?? 0) },
                ].map(k => (
                    <Paper key={k.label} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: k.warn ? 'error.light' : 'divider', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>{k.label}</Typography>
                        {loading
                            ? <Skeleton width="60%" height={28} />
                            : <Typography variant="h6" sx={{ fontWeight: 900, color: k.warn ? 'error.main' : 'inherit', lineHeight: 1.1 }}>{k.val}</Typography>
                        }
                    </Paper>
                ))}
            </Box>

            {/* Check days */}
            {data?.checkDays && data.checkDays.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Ngày cần kiểm tra</Typography>
                    <Alert severity="warning" sx={{ mb: 1, fontSize: 13 }}>
                        Bấm vào chi nhánh để lọc dòng lệch. "Mức cần kiểm" = tổng lệch tuyệt đối.
                    </Alert>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1.5 }}>
                        {BRANCHES.map(b => {
                            const item = data.checkDays.find(c => c.branch === b);
                            return (
                                <Paper key={b} elevation={0} sx={{ border: '1px solid #f1db9a', bgcolor: '#fffdf7', borderRadius: 2, overflow: 'hidden' }}>
                                    <Box sx={{ bgcolor: '#fff8e7', borderBottom: '1px solid #f1db9a', px: 1.5, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{b}</Typography>
                                        {item
                                            ? <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#7a5200' }}>{item.diffLines} mã · Mức {item.absDiff}</Typography>
                                            : <Typography sx={{ fontSize: 11, color: '#5f7a70' }}>Không lệch</Typography>
                                        }
                                    </Box>
                                    <Box sx={{ p: 1 }}>
                                        {item ? (
                                            <Box
                                                onClick={() => { setBranch(b); setRowFilter('DIFF'); setTimeout(load, 50); }}
                                                sx={{ cursor: 'pointer', border: '1px solid #f3ddb1', borderRadius: 1.5, p: 1, bgcolor: '#fff', '&:hover': { bgcolor: '#fff8e7' } }}>
                                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#674700' }}>
                                                    {item.topCodes.join(', ')}{item.diffLines > 3 ? '...' : ''}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Typography sx={{ fontSize: 12, color: '#5f7a70', textAlign: 'center', py: 1 }}>Không có dòng lệch.</Typography>
                                        )}
                                    </Box>
                                </Paper>
                            );
                        })}
                    </Box>
                </Box>
            )}

            {/* Công thức */}
            <Alert severity="info" sx={{ mb: 1.5, fontSize: 12 }}>
                <strong>Tồn còn lại theo app</strong> = Tồn đầu + Gói ra + Nhận CN − Chuyển CN − Sapo bán − Hủy ± Điều chỉnh. <strong>Tồn so sánh</strong> = Tồn thực tế − DTT. <strong>Lệch</strong> = Tồn so sánh − Tồn còn lại. DTT = đã bán/chưa lấy (trừ khi so lệch). CTT = giữ giỏ chưa TT (chỉ gắn nhãn).
            </Alert>

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: 500 }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            {['CN', 'Mã', 'Nhãn kiểm', 'Tồn đầu', 'Gói ra', 'Nhận CN', 'Chuyển CN', 'Hủy', 'Sapo bán', 'Tồn TT', 'DTT', 'Tồn SS', 'Tồn còn lại', 'Lệch', 'Gợi ý'].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading
                            ? Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>{Array.from({ length: 15 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                            ))
                            : !data?.rows.length
                                ? <TableRow><TableCell colSpan={15} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>Không có dữ liệu.</TableCell></TableRow>
                                : data.rows.map((r, i) => (
                                    <TableRow key={i} hover sx={{ bgcolor: r.diff !== 0 ? alpha('#ef4444', 0.04) : 'inherit' }}>
                                        <TableCell sx={{ fontSize: 12 }}>{r.branch}</TableCell>
                                        <TableCell><Typography sx={{ fontWeight: 700, fontSize: 12 }}>{r.itemCode}</Typography></TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {r.labels.map((l, li) => <Chip key={li} label={l} size="small" sx={{ fontSize: 10, height: 20 }} />)}
                                            </Box>
                                        </TableCell>
                                        {[r.beginQty, r.inQty, r.transferInQty, r.transferOutQty, r.cancelQty, r.outQty, r.stockQty, r.dttQty, r.compareQty, r.expectedQty].map((v, vi) => (
                                            <TableCell key={vi} align="right" sx={{ fontSize: 12 }}>{v}</TableCell>
                                        ))}
                                        <TableCell align="right">
                                            <Chip label={r.diff === 0 ? 'Khớp' : (r.diff > 0 ? `+${r.diff}` : r.diff)} size="small"
                                                color={r.diff === 0 ? 'success' : 'error'} sx={{ fontWeight: 800, fontSize: 12 }} />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 11, color: 'text.secondary', maxWidth: 200 }}>{r.diffReason}</TableCell>
                                    </TableRow>
                                ))
                        }
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

// ─── Tab: Gói ra ──────────────────────────────────────────────────────────────

function GiftOutTab() {
    const [date, setDate] = useState(today());
    const [branch, setBranch] = useState(BRANCHES[0]);
    const [codeType, setCodeType] = useState(CODE_TYPES[0]);
    const [text, setText] = useState('');
    const [note, setNote] = useState('');
    const [preview, setPreview] = useState<NxtGiftRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    async function parse() {
        if (!text.trim()) { toast.error('Nhập danh sách trước.'); return; }
        setLoading(true);
        try { setPreview(await nxtApi.parseGiftOut(text, branch, date, note || undefined)); }
        catch { toast.error('Lỗi đọc danh sách.'); }
        finally { setLoading(false); }
    }

    async function save() {
        let rows = preview;
        if (!rows.length) { await parse(); rows = preview; }
        if (!rows.length) { toast.error('Chưa đọc được dòng hợp lệ.'); return; }
        setSaving(true);
        try {
            const r = await nxtApi.saveGiftOut(rows, date, branch, codeType, note || undefined);
            toast.success(`Đã lưu ${r.rowsSaved} dòng gói ra.`);
            setText(''); setPreview([]); setNote('');
        } catch (e: any) { toast.error(e?.response?.data?.Message || 'Lỗi lưu dữ liệu.'); }
        finally { setSaving(false); }
    }

    return (
        <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, mb: 2 }}>
                <TextField label="Ngày" type="date" size="small" value={date} onChange={e => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <BranchSelect value={branch} onChange={setBranch} label="Chi nhánh nhận" />
                <FormControl size="small">
                    <InputLabel>Loại mã</InputLabel>
                    <Select value={codeType} label="Loại mã" onChange={e => setCodeType(e.target.value)}>
                        {CODE_TYPES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>

            <TextField label="Dán danh sách gói ra" multiline rows={6} fullWidth value={text} onChange={e => setText(e.target.value)}
                placeholder={'H1135 2\nH1094A 1\nGT2013\nH1045F 1+1'} sx={{ mb: 1 }} />
            <TextField label="Ghi chú chung (tùy chọn)" size="small" fullWidth value={note} onChange={e => setNote(e.target.value)} sx={{ mb: 1 }} />
            <OcrButton />

            <Box sx={{ display: 'flex', gap: 1, mt: 2, mb: 1 }}>
                <Button variant="contained" onClick={parse} disabled={loading} sx={{ borderRadius: 2, bgcolor: '#073b32', '&:hover': { bgcolor: '#0d634e' } }}>
                    {loading ? <CircularProgress size={18} color="inherit" /> : 'Đọc thử'}
                </Button>
                <Button variant="outlined" onClick={save} disabled={saving || !text.trim()} sx={{ borderRadius: 2 }}>
                    {saving ? <CircularProgress size={18} /> : 'Lưu vào DB'}
                </Button>
                <Button variant="text" onClick={() => { setText(''); setPreview([]); setNote(''); }}>Xóa</Button>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>Xem trước</Typography>
            <PreviewTable rows={preview} cols={[
                { key: 'date', label: 'Ngày' },
                { key: 'branch', label: 'CN' },
                { key: 'itemCode', label: 'Mã', render: r => <strong>{r.itemCode}</strong> },
                { key: 'qty', label: 'SL', right: true },
                { key: 'codeType', label: 'Loại mã', render: r => r.codeType ?? codeType },
                { key: 'note', label: 'Ghi chú' },
            ]} empty="Chưa đọc thử." />
        </Box>
    );
}

// ─── Tab: Tồn CN ──────────────────────────────────────────────────────────────

function StockTab() {
    const [date, setDate] = useState(today());
    const [branch, setBranch] = useState(BRANCHES[0]);
    const [text, setText] = useState('');
    const [preview, setPreview] = useState<NxtStockRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    async function parse() {
        if (!text.trim()) { toast.error('Nhập danh sách trước.'); return; }
        setLoading(true);
        try { setPreview(await nxtApi.parseStock(text, branch, date)); }
        catch { toast.error('Lỗi đọc danh sách.'); }
        finally { setLoading(false); }
    }

    async function save() {
        let rows = preview;
        if (!rows.length) { await parse(); rows = preview; }
        if (!rows.length) { toast.error('Chưa đọc được dòng hợp lệ.'); return; }
        setSaving(true);
        try {
            const r = await nxtApi.saveStock(rows, text);
            toast.success(`Đã lưu ${r.rowsSaved} dòng tồn${r.transfersSaved ? `, ${r.transfersSaved} dòng chuyển CN` : ''}.`);
            setText(''); setPreview([]);
        } catch (e: any) { toast.error(e?.response?.data?.Message || 'Lỗi lưu dữ liệu.'); }
        finally { setSaving(false); }
    }

    return (
        <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 2, mb: 2 }}>
                <TextField label="Ngày kiểm" type="date" size="small" value={date} onChange={e => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <BranchSelect value={branch} onChange={setBranch} />
            </Box>

            <TextField label="Dán danh sách tồn thực tế / chuyển CN" multiline rows={6} fullWidth value={text} onChange={e => setText(e.target.value)}
                placeholder={'H1135 1\nH1045F 1 dtt\nH1094A ctt 1\nH1136 1 chuyển NQ'} sx={{ mb: 1 }} />

            <Alert severity="info" sx={{ mb: 1, fontSize: 12 }}>
                DTT = đã thanh toán/chưa lấy → trừ khi so lệch. CTT = giữ giỏ → chỉ gắn nhãn. Chuyển CN: <code>H1136 1 chuyển NQ</code> → app tự tạo dòng chuyển.
            </Alert>
            <OcrButton />

            <Box sx={{ display: 'flex', gap: 1, mt: 2, mb: 1 }}>
                <Button variant="contained" onClick={parse} disabled={loading} sx={{ borderRadius: 2, bgcolor: '#073b32', '&:hover': { bgcolor: '#0d634e' } }}>
                    {loading ? <CircularProgress size={18} color="inherit" /> : 'Đọc thử'}
                </Button>
                <Button variant="outlined" onClick={save} disabled={saving || !text.trim()} sx={{ borderRadius: 2 }}>
                    {saving ? <CircularProgress size={18} /> : 'Lưu vào DB'}
                </Button>
                <Button variant="text" onClick={() => { setText(''); setPreview([]); }}>Xóa</Button>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>Xem trước</Typography>
            <PreviewTable rows={preview} cols={[
                { key: 'date', label: 'Ngày' },
                { key: 'branch', label: 'CN' },
                { key: 'itemCode', label: 'Mã', render: r => <strong>{r.itemCode}</strong> },
                { key: 'qty', label: 'SL', right: true },
                { key: 'stockStatus', label: 'Trạng thái' },
                { key: 'transferToBranch', label: 'Chuyển tới' },
                { key: 'raw', label: 'Dòng gốc' },
            ]} empty="Chưa đọc thử." />
        </Box>
    );
}

// ─── Tab: Hủy giỏ ─────────────────────────────────────────────────────────────

function CancelTab() {
    const [date, setDate] = useState(today());
    const [branch, setBranch] = useState(BRANCHES[0]);
    const [reason, setReason] = useState(CANCEL_REASONS[0]);
    const [text, setText] = useState('');
    const [preview, setPreview] = useState<NxtGiftRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    async function parse() {
        if (!text.trim()) { toast.error('Nhập danh sách trước.'); return; }
        setLoading(true);
        try { setPreview(await nxtApi.parseCancel(text, branch, date)); }
        catch { toast.error('Lỗi đọc danh sách.'); }
        finally { setLoading(false); }
    }

    async function save() {
        let rows = preview;
        if (!rows.length) { await parse(); rows = preview; }
        if (!rows.length) { toast.error('Chưa đọc được dòng hợp lệ.'); return; }
        setSaving(true);
        try {
            const r = await nxtApi.saveCancel(rows, date, branch, reason);
            toast.success(`Đã lưu ${r.rowsSaved} dòng hủy giỏ.`);
            setText(''); setPreview([]);
        } catch (e: any) { toast.error(e?.response?.data?.Message || 'Lỗi lưu dữ liệu.'); }
        finally { setSaving(false); }
    }

    return (
        <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, mb: 2 }}>
                <TextField label="Ngày hủy" type="date" size="small" value={date} onChange={e => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <BranchSelect value={branch} onChange={setBranch} />
                <FormControl size="small">
                    <InputLabel>Lý do</InputLabel>
                    <Select value={reason} label="Lý do" onChange={e => setReason(e.target.value)}>
                        {CANCEL_REASONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>

            <TextField label="Dán danh sách hủy giỏ" multiline rows={5} fullWidth value={text} onChange={e => setText(e.target.value)}
                placeholder={'H1135 2\nGT2013 1\nH1045F 1+1'} sx={{ mb: 1 }} />
            <OcrButton />

            <Box sx={{ display: 'flex', gap: 1, mt: 2, mb: 1 }}>
                <Button variant="contained" onClick={parse} disabled={loading} sx={{ borderRadius: 2, bgcolor: '#073b32', '&:hover': { bgcolor: '#0d634e' } }}>
                    {loading ? <CircularProgress size={18} color="inherit" /> : 'Đọc thử'}
                </Button>
                <Button variant="outlined" onClick={save} disabled={saving || !text.trim()} sx={{ borderRadius: 2 }}>
                    {saving ? <CircularProgress size={18} /> : 'Lưu vào DB'}
                </Button>
                <Button variant="text" onClick={() => { setText(''); setPreview([]); }}>Xóa</Button>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>Xem trước</Typography>
            <PreviewTable rows={preview} cols={[
                { key: 'date', label: 'Ngày' }, { key: 'branch', label: 'CN' },
                { key: 'itemCode', label: 'Mã', render: r => <strong>{r.itemCode}</strong> },
                { key: 'qty', label: 'SL', right: true },
                { key: '_reason', label: 'Lý do', render: () => reason },
                { key: 'note', label: 'Ghi chú' },
            ]} empty="Chưa đọc thử." />
        </Box>
    );
}

// ─── Tab: Nạp Sapo ────────────────────────────────────────────────────────────

function SapoTab() {
    const [imports, setImports] = useState<NxtSapoImportLog[]>([]);
    const [preview, setPreview] = useState<string[][]>([]);
    const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        nxtApi.getSapoImports().then(setImports).catch(() => { });
    }, []);

    async function readFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setLoading(true);
        try {
            // Use SheetJS if available, else warn
            const XLSX = (window as any).XLSX;
            if (!XLSX) { toast.error('Cần tải thư viện SheetJS. Thêm script tag vào layout.'); return; }
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rawMatrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            const matrix: string[][] = rawMatrix.map((row: any[]) => row.map((cell: any) => String(cell ?? '')));
            setPreview(matrix);
            // Show first 5 data rows as preview
            const headers: string[] = matrix[0] ?? [];
            setPreviewRows(matrix.slice(1, 6).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))));
            toast.success(`Đọc được ${matrix.length - 1} dòng từ "${file.name}".`);
        } catch { toast.error('Lỗi đọc file Excel.'); }
        finally { setLoading(false); }
    }

    async function importFile() {
        if (!preview.length) { toast.error('Chọn file Excel trước.'); return; }
        setSaving(true);
        try {
            const r = await nxtApi.importSapo(preview, fileName);
            toast.success(`Nạp Sapo OK: ${r.rowsSaved} dòng (${r.dateMin} → ${r.dateMax}). Thay ${r.replacedRows} dòng cũ.`);
            setPreview([]); setPreviewRows([]); setFileName('');
            const logs = await nxtApi.getSapoImports();
            setImports(logs);
        } catch (e: any) { toast.error(e?.response?.data?.Message || 'Lỗi nạp Sapo.'); }
        finally { setSaving(false); }
    }

    return (
        <Box>
            <Alert severity="warning" sx={{ mb: 2, fontSize: 12 }}>
                Nguyên tắc: file mới sẽ thay thế dòng Sapo cũ trong cùng khoảng ngày, không cộng trùng.
                Đọc thử trước khi bấm Nạp.
            </Alert>

            <Box sx={{ mb: 2 }}>
                <Button component="label" variant="outlined" startIcon={<FileUploadRounded />} sx={{ borderRadius: 2 }} disabled={loading}>
                    {loading ? <CircularProgress size={18} /> : 'Chọn file Excel Sapo (.xlsx)'}
                    <input type="file" accept=".xlsx,.xls" hidden onChange={readFile} />
                </Button>
                {fileName && <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>{fileName}</Typography>}
            </Box>

            {previewRows.length > 0 && (
                <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Xem trước (5 dòng đầu)</Typography>
                    <PreviewTable
                        rows={previewRows}
                        cols={(Object.keys(previewRows[0] ?? {})).slice(0, 8).map(k => ({ key: k, label: k }))}
                    />
                    <Button variant="contained" onClick={importFile} disabled={saving} sx={{ mt: 2, borderRadius: 2, bgcolor: '#073b32', '&:hover': { bgcolor: '#0d634e' } }}>
                        {saving ? <CircularProgress size={18} color="inherit" /> : 'Nạp Sapo vào DB'}
                    </Button>
                </>
            )}

            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Lịch sử nạp Sapo</Typography>
            <PreviewTable rows={imports} cols={[
                { key: 'importId', label: 'Import ID' },
                { key: 'fileName', label: 'File' },
                { key: 'importDate', label: 'Ngày nạp', render: r => r.importDate ? new Date(r.importDate).toLocaleString('vi-VN') : '' },
                { key: 'rowsSaved', label: 'Dòng lưu', right: true },
                { key: 'dateMin', label: 'Từ ngày', render: r => fmtDate(r.dateMin) },
                { key: 'dateMax', label: 'Đến ngày', render: r => fmtDate(r.dateMax) },
                { key: 'totalNetQty', label: 'Tổng SL', right: true },
                { key: 'totalRevenue', label: 'Doanh thu', right: true, render: r => fmtRevenue(r.totalRevenue) },
                { key: 'status', label: 'Trạng thái' },
            ]} empty="Chưa có lịch sử." />
        </Box>
    );
}

// ─── Tab: Sai mã ──────────────────────────────────────────────────────────────

function AdjustTab() {
    const [date, setDate] = useState(today());
    const [branch, setBranch] = useState(BRANCHES[0]);
    const [wrongCode, setWrongCode] = useState('');
    const [rightCode, setRightCode] = useState('');
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState(ADJ_REASONS[0]);
    const [adjNote, setAdjNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [logs, setLogs] = useState<NxtAdjLog[]>([]);
    const [logLoading, setLogLoading] = useState(false);

    async function loadLogs() {
        setLogLoading(true);
        try { setLogs(await nxtApi.getAdjustments()); }
        catch { toast.error('Lỗi tải lịch sử.'); }
        finally { setLogLoading(false); }
    }

    useEffect(() => { loadLogs(); }, []);

    async function save() {
        if (!wrongCode.trim()) { toast.error('Nhập mã sai/mã tạm.'); return; }
        setSaving(true);
        try {
            await nxtApi.saveAdjustment({ date, branch, wrongCode: wrongCode.trim().toUpperCase(), rightCode: rightCode.trim().toUpperCase() || undefined, qty, reason, note: adjNote || undefined });
            toast.success('Đã lưu điều chỉnh.');
            setWrongCode(''); setRightCode(''); setQty(1); setAdjNote('');
            loadLogs();
        } catch (e: any) { toast.error(e?.response?.data?.Message || 'Lỗi lưu.'); }
        finally { setSaving(false); }
    }

    return (
        <Box>
            <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
                <strong>Đổi mã tạm/nhập nhầm:</strong> chuyển phát sinh nội bộ từ mã cũ sang mã đúng.<br />
                <strong>Sai mã Sapo:</strong> chuyển Sapo bán/doanh thu từ mã sai sang mã đúng.
            </Alert>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, mb: 2 }}>
                <TextField label="Ngày phát sinh" type="date" size="small" value={date} onChange={e => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <BranchSelect value={branch} onChange={setBranch} />
                <FormControl size="small">
                    <InputLabel>Loại</InputLabel>
                    <Select value={reason} label="Loại" onChange={e => setReason(e.target.value)}>
                        {ADJ_REASONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                </FormControl>
                <TextField label="Mã sai / mã tạm" size="small" value={wrongCode} onChange={e => setWrongCode(e.target.value.toUpperCase())} placeholder="VD: H1113 hoặc SON74765" />
                <TextField label="Mã đúng" size="small" value={rightCode} onChange={e => setRightCode(e.target.value.toUpperCase())} placeholder="VD: H1136" />
                <TextField label="Số lượng" type="number" size="small" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} />
                <TextField label="Ghi chú" size="small" fullWidth value={adjNote} onChange={e => setAdjNote(e.target.value)}
                    placeholder="VD: Sapo bán H1113, thực tế đúng H1136" sx={{ gridColumn: '1/-1' }} />
            </Box>

            <Button variant="contained" onClick={save} disabled={saving} sx={{ borderRadius: 2, bgcolor: '#073b32', '&:hover': { bgcolor: '#0d634e' }, mb: 3 }}>
                {saving ? <CircularProgress size={18} color="inherit" /> : 'Lưu điều chỉnh'}
            </Button>

            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Lịch sử điều chỉnh</Typography>
                <Button size="small" startIcon={<RefreshRounded />} onClick={loadLogs} disabled={logLoading}>Làm mới</Button>
            </Box>

            <PreviewTable rows={logs} cols={[
                { key: 'createdAt', label: 'Thời gian', render: r => new Date(r.createdAt).toLocaleString('vi-VN') },
                { key: 'date', label: 'Ngày', render: r => fmtDate(r.date) },
                { key: 'branch', label: 'CN' },
                { key: 'reason', label: 'Loại' },
                { key: 'wrongCode', label: 'Mã sai/tạm', render: r => <strong>{r.wrongCode}</strong> },
                { key: 'rightCode', label: 'Mã đúng', render: r => <strong>{r.rightCode ?? '—'}</strong> },
                { key: 'qty', label: 'SL', right: true },
                { key: 'createdBy', label: 'Người' },
                { key: 'note', label: 'Ghi chú' },
            ]} empty={logLoading ? 'Đang tải...' : 'Chưa có điều chỉnh.'} />
        </Box>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
    { label: 'Tổng quan', icon: <BarChartRounded />, component: <OverviewTab /> },
    { label: 'Gói ra', icon: <Inventory2Rounded />, component: <GiftOutTab /> },
    { label: 'Tồn CN', icon: <WarehouseRounded />, component: <StockTab /> },
    { label: 'Hủy giỏ', icon: <RemoveShoppingCartRounded />, component: <CancelTab /> },
    { label: 'Nạp Sapo', icon: <FileUploadRounded />, component: <SapoTab /> },
    { label: 'Sai mã', icon: <SwapHorizRounded />, component: <AdjustTab /> },
];

export default function NxtPage() {
    const [tab, setTab] = useState(0);

    return (
        <Box>
            <PageHeader title="Kiểm quà NXT" subtitle="Gói ra · Sapo bán · Tồn cuối ngày · Gợi ý lệch" />

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                <Tabs
                    value={tab} onChange={(_, v) => setTab(v)}
                    sx={{
                        borderBottom: '1px solid', borderColor: 'divider',
                        bgcolor: alpha('#073b32', 0.03),
                        '& .MuiTab-root': { fontWeight: 700, minHeight: 52 },
                        '& .Mui-selected': { color: '#073b32' },
                        '& .MuiTabs-indicator': { bgcolor: '#073b32' },
                    }}
                    variant="scrollable" scrollButtons="auto">
                    {TABS.map((t, i) => <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />)}
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {TABS.map((t, i) => (
                        <Box key={i} role="tabpanel" hidden={tab !== i}>
                            {tab === i && t.component}
                        </Box>
                    ))}
                </Box>
            </Paper>
        </Box>
    );
}
